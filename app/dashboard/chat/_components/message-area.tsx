"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/src/redux/hooks"
import {
  fetchMessages,
  sendMessage,
  addMessage,
  sendTypingStatus,
  stopTypingStatus,
  setUserTyping,
  resetAuthError,
} from "@/src/redux/features/chat/chatSlice"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCcw, Send, ArrowLeft } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/components/auth/auth-provider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SocketService } from "@/service/socket.service"
import { debounce } from "lodash"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

interface MessageAreaProps {
  onBackClick?: () => void
  showBackButton?: boolean
}

export default function MessageArea({ onBackClick, showBackButton = false }: MessageAreaProps) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { toast } = useToast()
  const { user, logout } = useAuth()
  const { activeConversation, messages, isLoading, isSending, error, typingUsers, authError } = useAppSelector(
    (state) => state.chat,
  )
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [retryCount, setRetryCount] = useState(0)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Utility function to get initials from a name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  // Utility function to format time
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch (error) {
      return dateString
    }
  }

  // Set up socket event listeners for real-time messaging
  useEffect(() => {
    if (!activeConversation) return

    const socketService = SocketService.getInstance()

    // Handle incoming messages
    const handleMessageReceived = (data: any) => {
      console.log("Message received in component:", data)

      // Check if this message is for the active conversation
      if (data.data && data.data.conversation_id === activeConversation.id) {
        dispatch(addMessage(data.data))

        // Stop typing indicator when message is received
        if (typingUsers[activeConversation.id]) {
          dispatch(setUserTyping({ conversationId: activeConversation.id, isTyping: false }))
        }
      }
    }

    // Handle typing indicators
    const handleUserTyping = (data: any) => {
      if (data.data && data.data.conversation_id === activeConversation.id) {
        dispatch(setUserTyping({ conversationId: activeConversation.id, isTyping: true }))
      }
    }

    const handleUserStoppedTyping = (data: any) => {
      if (data.data && data.data.conversation_id === activeConversation.id) {
        dispatch(setUserTyping({ conversationId: activeConversation.id, isTyping: false }))
      }
    }

    // Register event handlers
    socketService.onMessageReceived(handleMessageReceived)
    socketService.onUserTyping(handleUserTyping)
    socketService.onUserStoppedTyping(handleUserStoppedTyping)

    // Cleanup
    return () => {
      // Remove event handlers
      socketService.onMessageReceived(null)
      socketService.onUserTyping(null)
      socketService.onUserStoppedTyping(null)
    }
  }, [activeConversation, dispatch, typingUsers])

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      dispatch(fetchMessages(activeConversation.id))
      setRetryCount(0)
    }
  }, [activeConversation, dispatch])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Debounced typing indicator
  const debouncedTypingIndicator = debounce((isTyping: boolean) => {
    if (!activeConversation || !user) return

    const otherUser =
      activeConversation.creator.id === user.id ? activeConversation.participant : activeConversation.creator

    if (isTyping) {
      dispatch(sendTypingStatus({ receiverId: otherUser.id, conversationId: activeConversation.id }))
    } else {
      dispatch(stopTypingStatus({ receiverId: otherUser.id, conversationId: activeConversation.id }))
    }
  }, 300)

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewMessage(value)

    // Send typing indicator
    if (value.length > 0) {
      debouncedTypingIndicator(true)

      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set a timeout to stop typing indicator after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        debouncedTypingIndicator(false)
      }, 3000)
    } else {
      debouncedTypingIndicator(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeConversation || !user) return

    const otherUser =
      activeConversation.creator.id === user.id ? activeConversation.participant : activeConversation.creator

    // Stop typing indicator
    debouncedTypingIndicator(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    try {
      // Store user ID in localStorage for the ChatService to use
      localStorage.setItem("userId", user.id)

      await dispatch(
        sendMessage({
          receiverId: otherUser.id,
          conversationId: activeConversation.id,
          message: newMessage,
        }),
      ).unwrap()

      setNewMessage("")
    } catch (error) {
      console.error("Failed to send message:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRetry = () => {
    if (!activeConversation) return
    setRetryCount((prev) => prev + 1)
    dispatch(fetchMessages(activeConversation.id))
  }

  const handleLogout = () => {
    dispatch(resetAuthError())
    logout()
    router.push("/")
  }

  if (authError) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription className="flex flex-col items-center gap-2">
            <p>Your session has expired or is invalid. Please log in again.</p>
            <Button onClick={handleLogout} variant="destructive" size="sm" className="mt-2">
              Log Out
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!activeConversation) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select a conversation to start chatting
      </div>
    )
  }

  const otherUser =
    activeConversation.creator.id === user?.id ? activeConversation.participant : activeConversation.creator

  const isTyping = typingUsers[activeConversation.id]

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-3">
        <div className="flex items-center space-x-3">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={onBackClick} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar>
            <AvatarImage src={otherUser.avatar_url || "/placeholder.svg"} alt={otherUser.name} />
            <AvatarFallback>{getInitials(otherUser.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{otherUser.name}</p>
            {isTyping && <p className="text-xs text-muted-foreground">Typing...</p>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                <div className="flex max-w-[70%]">
                  {i % 2 === 0 && <Skeleton className="h-10 w-10 rounded-full mr-2" />}
                  <div>
                    <Skeleton className={`h-16 w-40 rounded-lg`} />
                    <Skeleton className="h-3 w-16 mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="flex flex-col items-center gap-2">
              <p>{error}</p>
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={retryCount >= 3}
              >
                <RefreshCcw className="h-4 w-4" />
                Retry {retryCount > 0 ? `(${retryCount}/3)` : ""}
              </Button>
            </AlertDescription>
          </Alert>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => {
            const isMe = message.sender.id === user?.id
            return (
              <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className="flex max-w-[70%]">
                  {!isMe && (
                    <Avatar className="h-8 w-8 mr-2 mt-1">
                      <AvatarImage src={message.sender.avatar_url || "/placeholder.svg"} alt={message.sender.name} />
                      <AvatarFallback>{getInitials(message.sender.name)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <div
                      className={`rounded-lg p-3 ${
                        isMe ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      <p>{message.message}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatTime(message.created_at)}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex max-w-[70%]">
              <Avatar className="h-8 w-8 mr-2 mt-1">
                <AvatarImage src={otherUser.avatar_url || "/placeholder.svg"} alt={otherUser.name} />
                <AvatarFallback>{getInitials(otherUser.name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="bg-gray-200 text-gray-800 rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "600ms" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="border-t p-3 flex space-x-2">
        <Input
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Type a message..."
          disabled={isSending}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  )
}
