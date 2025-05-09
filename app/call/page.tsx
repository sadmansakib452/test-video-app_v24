"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/components/ui/use-toast"

export default function CallPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, token } = useAuth()
  const { toast } = useToast()

  const receiverId = searchParams.get("receiver")
  const appointmentId = searchParams.get("appointment")
  const isVideoCall = searchParams.get("video") === "true"

  useEffect(() => {
    if (!user || !token) {
      router.push("/")
      return
    }

    if (!receiverId || !appointmentId) {
      toast({
        title: "Invalid call parameters",
        description: "Missing required call information",
        variant: "destructive",
      })
      router.push("/dashboard")
      return
    }

    // Redirect to the appropriate call page
    const callPath = isVideoCall ? "/video-call" : "/audio-call"
    router.push(`${callPath}?receiver=${receiverId}&appointment=${appointmentId}`)
  }, [user, token, receiverId, appointmentId, isVideoCall, router])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  )
}
