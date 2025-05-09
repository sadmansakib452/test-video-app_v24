"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, PhoneOff } from "lucide-react"
import { SocketService } from "@/service/socket.service"

export default function IncomingCallModal() {
  const { token, BASE_URL } = useAuth()
  const router = useRouter()
  const [incomingCall, setIncomingCall] = useState<{
    callId: string
    caller: string
    appointmentId: string
    isDoctorCall: boolean
    offer: RTCSessionDescriptionInit
  } | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [ringtone, setRingtone] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Create audio element for ringtone
    const audio = new Audio("/ringtone.mp3")
    audio.loop = true
    setRingtone(audio)

    // Connect to socket
    if (token) {
      const socketService = SocketService.getInstance()
      socketService.connect(token, BASE_URL)

      // Set up event listeners
      socketService.onIncomingCall((data) => {
        console.log("Incoming call received in modal:", data)
        setIncomingCall(data)
        setIsVisible(true)
        if (audio) {
          audio.currentTime = 0
          audio.play().catch((err) => console.error("Error playing ringtone:", err))
        }
      })

      socketService.onCallCancelled((data) => {
        console.log("Call cancelled:", data)
        if (incomingCall && incomingCall.callId === data.callId) {
          hideModal()
        }
      })

      return () => {
        socketService.cleanup()
        audio.pause()
      }
    }
  }, [token, BASE_URL])

  const acceptCall = () => {
    if (!incomingCall) return

    hideModal()
    const isVideoCall = incomingCall.offer.sdp?.includes("m=video") || false
    const callPath = isVideoCall ? "/video-call" : "/audio-call"

    router.push(
      `${callPath}?receiver=${incomingCall.caller}&appointment=${incomingCall.appointmentId}&incoming=true&callId=${incomingCall.callId}&offer=${encodeURIComponent(JSON.stringify(incomingCall.offer))}`,
    )
  }

  const rejectCall = () => {
    if (!incomingCall) return

    const socketService = SocketService.getInstance()
    socketService.rejectCall(incomingCall.callId)

    hideModal()
  }

  const hideModal = () => {
    setIsVisible(false)
    setIncomingCall(null)
    if (ringtone) {
      ringtone.pause()
    }
  }

  if (!isVisible || !incomingCall) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <Card className="w-80">
        <CardHeader className="text-center">
          <CardTitle>Incoming Call</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4">
            {incomingCall.isDoctorCall ? "Your coach is calling you" : "Your client is calling you"}
          </p>
          <div className="flex justify-center space-x-4 mt-6">
            <Button variant="destructive" size="lg" className="rounded-full" onClick={rejectCall}>
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              variant="default"
              size="lg"
              className="rounded-full bg-green-600 hover:bg-green-700"
              onClick={acceptCall}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          Call will automatically end if not answered
        </CardFooter>
      </Card>
    </div>
  )
}
