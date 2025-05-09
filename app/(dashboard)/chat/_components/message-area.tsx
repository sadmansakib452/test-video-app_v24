"use client"

import type React from "react"

import { useChat } from "@/components/chat/chat-context"
import { useAuth } from "@/components/auth/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Phone, Send, Video } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"

interface MessageAreaProps {
  onBack: () => void
  isMobile: boolean
}

export default function MessageArea({ onBack, isMobile }: MessageAreaProps) {
  const { user } = useAuth()
  const { activeConversation, messages, sendMessage, isSending } = useChat()
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim() === "" || isSending) return

    await sendMessage(newMessage)
    setNewMessage("")
  }

  const getOtherUser = () => {
    if (!activeConversation || !user) return null
    return activeConversation.creator_id === user.id ? activeConversation.participant : activeConversation.creator
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch (error) {
      return dateString
    }
  }

  const initiateCall = (isVideo: boolean) => {
    const otherUser = getOtherUser()
    if (!otherUser) return

    // Navigate to call page with appropriate parameters
    router.push(`/call?receiver=${otherUser.id}&appointment=${activeConversation?.id}&video=${isVideo}`)
  }

  if (!activeConversation) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Select a conversation to start chatting
      </div>
    )
  }

  const otherUser = getOtherUser()
  if (!otherUser) return null

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white flex items-center">
        {isMobile && (
          <Button variant="ghost" size="icon" className="mr-2" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-10 w-10">
          <AvatarImage src={otherUser.avatar_url || "/placeholder.svg"} alt={otherUser.name} />
          <AvatarFallback>{getInitials(otherUser.name)}</AvatarFallback>
        </Avatar>
        <div className="ml-3 flex-1">
          <p className="font-medium">{otherUser.name}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" onClick={() => initiateCall(false)}>
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => initiateCall(true)}>
            <Video className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
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
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isSending}
            className="flex-1"
          />
          <Button type="submit" disabled={isSending || newMessage.trim() === ""}>
            {isSending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
