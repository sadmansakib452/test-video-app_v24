"use client"

import { useEffect, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/src/redux/hooks"
import { fetchConversations, initializeChat, resetAuthError } from "@/src/redux/features/chat/chatSlice"
import ConversationList from "./_components/conversation-list"
import MessageArea from "./_components/message-area"
import { useAuth } from "@/components/auth/auth-provider"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function ChatPage() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { isLoading, activeConversation, isInitialized, error, authError } = useAppSelector((state) => state.chat)
  const [showConversations, setShowConversations] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Check if we're on mobile
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

  // Initialize chat and socket connection
  useEffect(() => {
    if (user && !isInitialized) {
      dispatch(initializeChat())
        .unwrap()
        .then(() => {
          dispatch(fetchConversations())
        })
        .catch((error) => {
          console.error("Failed to initialize chat:", error)
        })
    }
  }, [dispatch, user, isInitialized])

  // Hide conversation list on mobile when a conversation is selected
  useEffect(() => {
    if (isMobile && activeConversation) {
      setShowConversations(false)
    }
  }, [activeConversation, isMobile])

  const handleLogout = () => {
    dispatch(resetAuthError())
    logout()
  }

  if (authError) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">Your session has expired or is invalid. Please log in again.</p>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleLogout}>
                Log Out
              </Button>
              <Button variant="outline" onClick={() => router.push("/")}>
                Go to Login
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Please log in to access chat</p>
      </div>
    )
  }

  if (!isInitialized && isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Initializing chat...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Conversation list - hidden on mobile when a conversation is active */}
      <div className={`${isMobile ? (showConversations ? "block w-full" : "hidden") : "w-1/3 border-r"}`}>
        <ConversationList onConversationSelect={() => isMobile && setShowConversations(false)} />
      </div>

      {/* Message area - full width on mobile when a conversation is active */}
      <div className={`${isMobile ? (showConversations ? "hidden" : "block w-full") : "w-2/3"}`}>
        <MessageArea showBackButton={isMobile} onBackClick={() => setShowConversations(true)} />
      </div>
    </div>
  )
}
