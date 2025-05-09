"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { useChat } from "@/components/chat/chat-context"
import ConversationList from "./_components/conversation-list"
import MessageArea from "./_components/message-area"
import { Loader2 } from "lucide-react"

export default function ChatPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { isLoading: chatLoading, activeConversation } = useChat()
  const [isMobile, setIsMobile] = useState(false)
  const [showConversations, setShowConversations] = useState(true)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  useEffect(() => {
    if (isMobile && activeConversation) {
      setShowConversations(false)
    }
  }, [activeConversation, isMobile])

  if (authLoading || chatLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b bg-white">
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list - hidden on mobile when a conversation is active */}
        {(!isMobile || showConversations) && (
          <div className={`${isMobile ? "w-full" : "w-1/3"} border-r bg-white overflow-y-auto`}>
            <ConversationList onConversationSelect={() => isMobile && setShowConversations(false)} />
          </div>
        )}

        {/* Message area - shown when a conversation is selected */}
        {(!isMobile || !showConversations) && (
          <div className={`${isMobile ? "w-full" : "w-2/3"} flex flex-col bg-gray-50`}>
            <MessageArea onBack={() => setShowConversations(true)} isMobile={isMobile} />
          </div>
        )}
      </div>
    </div>
  )
}
