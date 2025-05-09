"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, Menu, X, MessageSquare, Phone } from "lucide-react"
import Link from "next/link"
import IncomingCallModal from "@/components/call/incoming-call-modal"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar toggle */}
      <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 md:hidden" onClick={toggleSidebar}>
        {sidebarOpen ? <X /> : <Menu />}
      </Button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={user?.avatar_url || "/placeholder.svg"} alt={user?.name} />
                <AvatarFallback>{user?.name ? getInitials(user.name) : "U"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.type}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <Link href="/dashboard" className="flex items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100">
              Dashboard
            </Link>
            <Link
              href="/dashboard/chat"
              className="flex items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat
            </Link>
            <Link
              href="/dashboard/calls"
              className="flex items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100"
            >
              <Phone className="mr-2 h-4 w-4" />
              Call History
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100"
            >
              Settings
            </Link>
          </nav>

          <div className="p-4 border-t">
            <Button variant="outline" className="w-full flex items-center justify-center" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 md:ml-64 overflow-auto">{children}</div>

      {/* Incoming call modal - will be shown when there's an incoming call */}
      <IncomingCallModal />
    </div>
  )
}
