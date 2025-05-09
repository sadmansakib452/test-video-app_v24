"use client"

import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/src/redux/hooks"
import { fetchConversations, setActiveConversation } from "@/src/redux/features/chat/chatSlice"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCcw } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"

interface ConversationListProps {
  onConversationSelect?: () => void
}

export default function ConversationList({ onConversationSelect }: ConversationListProps) {
  const dispatch = useAppDispatch()
  const { user } = useAuth()
  const { conversations, activeConversation, isLoading, error, isInitialized } = useAppSelector((state) => state.chat)

  useEffect(() => {
    if (user && !isInitialized) {
      dispatch(fetchConversations())
    }
  }, [dispatch, user, isInitialized])

  const handleSelectConversation = (conversation: any) => {
    dispatch(setActiveConversation(conversation))
    if (onConversationSelect) {
      onConversationSelect()
    }
  }

  const handleRetry = () => {
    dispatch(fetchConversations())
  }

  // Utility function to get initials from a name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  if (isLoading && !isInitialized) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={handleRetry} variant="outline" className="flex items-center gap-2">
          <RefreshCcw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  if (conversations.length === 0 && isInitialized) {
    return (
      <div className="flex items-center justify-center h-full p-4 text-center text-gray-500">
        No conversations yet. Start a new chat!
      </div>
    )
  }

  return (
    <div className="overflow-y-auto">
      {conversations.map((conversation) => {
        const otherUser = conversation.creator.id === user?.id ? conversation.participant : conversation.creator
        const isActive = activeConversation?.id === conversation.id

        return (
          <div
            key={conversation.id}
            className={`p-3 cursor-pointer hover:bg-gray-100 ${isActive ? "bg-gray-100" : ""}`}
            onClick={() => handleSelectConversation(conversation)}
          >
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={otherUser.avatar_url || "/placeholder.svg"} alt={otherUser.name} />
                <AvatarFallback>{getInitials(otherUser.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{otherUser.name}</p>
                <p className="text-sm text-gray-500 truncate">
                  {conversation.lastMessage?.message || "No messages yet"}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
