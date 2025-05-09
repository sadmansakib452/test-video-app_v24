"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { CallProvider } from "../audio-call/_components/call-context"
import { useDispatch } from "react-redux"
import { setCallUser } from "@/src/redux/features/call/callSlice"
import VideoCall from "./_components/video-call"

export default function VideoCallPage() {
  const searchParams = useSearchParams()
  const { user, token } = useAuth()
  const { toast } = useToast()
  const dispatch = useDispatch()

  const receiverId = searchParams.get("receiver")
  const appointmentId = searchParams.get("appointment")
  const isIncoming = searchParams.get("incoming") === "true"
  const callId = searchParams.get("callId")
  const offerParam = searchParams.get("offer")

  useEffect(() => {
    // Set the call user in Redux
    dispatch(
      setCallUser({
        img: "/img/profile-details/profile.png",
        name: "John Doe",
        title: "Medicine Specialist",
      }),
    )

    // Validate call parameters
    if (!user || !token) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to make calls",
        variant: "destructive",
      })
      return
    }

    if (!receiverId || !appointmentId) {
      toast({
        title: "Invalid call parameters",
        description: "Missing required call information",
        variant: "destructive",
      })
      return
    }

    // For incoming calls, we need the offer
    if (isIncoming && (!callId || !offerParam)) {
      toast({
        title: "Invalid incoming call",
        description: "Missing required call information",
        variant: "destructive",
      })
      return
    }
  }, [user, token, receiverId, appointmentId, isIncoming, callId, offerParam, dispatch])

  // Parse the offer for incoming calls
  let parsedOffer = null
  if (isIncoming && offerParam) {
    try {
      parsedOffer = JSON.parse(decodeURIComponent(offerParam))
    } catch (error) {
      console.error("Error parsing offer:", error)
      toast({
        title: "Call Error",
        description: "Invalid call data",
        variant: "destructive",
      })
      return null
    }
  }

  // If we don't have the required parameters, don't render the call interface
  if (!receiverId || !appointmentId || (isIncoming && (!callId || !parsedOffer))) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Invalid Call</h2>
          <p className="text-gray-500">Missing required call parameters</p>
        </div>
      </div>
    )
  }

  return (
    <CallProvider
      receiverId={receiverId}
      appointmentId={appointmentId}
      isVideoCall={true}
      isIncoming={isIncoming}
      callId={callId}
      offer={parsedOffer}
      initialUser={{
        img: "/img/profile-details/profile.png",
        name: "John Doe",
        title: "Medicine Specialist",
      }}
    >
      <VideoCall />
    </CallProvider>
  )
}
