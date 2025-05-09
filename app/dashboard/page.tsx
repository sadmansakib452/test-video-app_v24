"use client"
import { useAuth } from "@/components/auth/auth-provider"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import UserList from "@/components/dashboard/user-list"

export default function DashboardPage() {
  const { user, token, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !token) {
    redirect("/")
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Your Contacts</h1>
        <UserList />
      </div>
    </DashboardLayout>
  )
}
