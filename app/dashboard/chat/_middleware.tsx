"use client"

import type React from "react"

import { useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { ChatService } from "@/service/chat.service"

export default function ChatMiddleware({ children }: { children: React.ReactNode }) {
  const { token, BASE_URL } = useAuth()

  useEffect(() => {
    if (token && BASE_URL) {
      const chatService = ChatService.getInstance()
      chatService.setConfig(BASE_URL, token)
    }
  }, [token, BASE_URL])

  return <>{children}</>
}
