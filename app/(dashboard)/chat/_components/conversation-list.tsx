"use client"

import { useChat } from "@/components/chat/chat-context"
import { useAuth } from "@/components/auth/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Loader2, Search } from "lucide-react"
import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import type { Conversation } from "@/service/chat.service"

interface ConversationListProps {
  onConversationSelect?: () => void
}

export default function ConversationList({ onConversationSelect }: ConversationListProps) {
  const { user } = useAuth()
  const { conversations, activeConversation, setActiveConversation, isLoading, refreshConversations } = useChat()
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])

  useEffect(() => {
    // Filter conversations based on search term
    if (searchTerm.trim() === "") {
      setFilteredConversations(conversations)
    } else {
      const filtered = conversations.filter((conversation) => {
        const otherUser = conversation.creator_id === user?.id ? conversation.participant : conversation.creator
        return otherUser.name.toLowerCase().includes(searchTerm.toLowerCase())
      })
      setFilteredConversations(filtered)
    }
  }, [searchTerm, conversations, user])

  // Refresh conversations every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshConversations()
    }, 30000)

    return () => clearInterval(interval)
  }, [refreshConversations])

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation)
    if (onConversationSelect) {
      onConversationSelect()
    }
  }

  const getOtherUser = (conversation: Conversation) => {
    return conversation.creator_id === user?.id ? conversation.participant : conversation.creator
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search conversations..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            {searchTerm ? "No conversations found" : "No conversations yet"}
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => {
              const otherUser = getOtherUser(conversation)
              const isActive = activeConversation?.id === conversation.id

              return (
                <div
                  key={conversation.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${isActive ? "bg-gray-100" : ""}`}
                  onClick={() => handleSelectConversation(conversation)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={otherUser.avatar_url || "/placeholder.svg"} alt={otherUser.name} />
                      <AvatarFallback>{getInitials(otherUser.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="font-medium truncate">{otherUser.name}</p>
                        {conversation.updated_at && (
                          <p className="text-xs text-gray-500">{formatTime(conversation.updated_at)}</p>
                        )}
                      </div>
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-500 truncate">{conversation.lastMessage.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
