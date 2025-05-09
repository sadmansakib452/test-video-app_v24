"use client"

import type React from "react"

import ChatMiddleware from "./_middleware"

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <ChatMiddleware>{children}</ChatMiddleware>
}
