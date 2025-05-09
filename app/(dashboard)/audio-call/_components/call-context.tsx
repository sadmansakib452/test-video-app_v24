"use client"

import type React from "react"
import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { SocketService } from "@/service/socket.service"

type CallUser = {
  img: string
  name: string
  title?: string
}

interface Message {
  id: number
  text: string
  sender: string
  timestamp: Date
  isAudio?: boolean
  isVideo?: boolean
  audioDuration?: string
  audioUrl?: string
  videoUrl?: string
  imageUrl?: string
}

interface CallContextType {
  // Call state
  callStatus: "connecting" | "connected" | "ended"
  isMuted: boolean
  isHolding: boolean
  isRecording: boolean
  isChatOpen: boolean
  isSettingsOpen: boolean
  callTimeoutSeconds: number
  callTime: number
  callUser: CallUser | null
  callType: "audio" | "video"

  // Media refs
  localVideoRef: React.RefObject<HTMLVideoElement>
  remoteVideoRef: React.RefObject<HTMLVideoElement>

  // Messages
  messages: Message[]

  // Actions
  toggleMute: () => void
  toggleHold: () => void
  toggleRecording: () => void
  toggleChat: () => void
  toggleSettings: () => void
  endCall: () => void
  sendChatMessage: (audioUrl: string | null, message: string, imageUrl?: string, videoUrl?: string) => void

  // Call info
  receiverId: string
  appointmentId: string
  isVideoCall: boolean
  isIncoming: boolean
  setIsChatOpen: (isOpen: boolean) => void
  setIsSettingsOpen: (isOpen: boolean) => void
}

const CallContext = createContext<CallContextType | undefined>(undefined)

export function useCall() {
  const context = useContext(CallContext)
  if (context === undefined) {
    throw new Error("useCall must be used within a CallProvider")
  }
  return context
}

type CallProviderProps = {
  children: ReactNode
  receiverId: string
  appointmentId: string
  isVideoCall: boolean
  isIncoming: boolean
  callId: string | null
  offer: RTCSessionDescriptionInit | null
  initialUser?: CallUser
}

export function CallProvider({
  children,
  receiverId,
  appointmentId,
  isVideoCall,
  isIncoming,
  callId,
  offer,
  initialUser,
}: CallProviderProps) {
  const router = useRouter()
  const { user, token, BASE_URL } = useAuth()
  const { toast } = useToast()

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  // State
  const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "ended">("connecting")
  const [isMuted, setIsMuted] = useState(false)
  const [isHolding, setIsHolding] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [callTimeoutSeconds, setCallTimeoutSeconds] = useState(30)
  const [callTime, setCallTime] = useState(0)
  const [callUser, setCallUser] = useState<CallUser | null>(initialUser || null)
  const [callType, setCallType] = useState<"audio" | "video">(isVideoCall ? "video" : "audio")

  // Messages
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "This is really amazing game!",
      sender: "other",
      timestamp: new Date(),
    },
    {
      id: 2,
      text: "I just wanted to let everyone know that Kira won her game today. She even got her first goal!",
      sender: "other",
      timestamp: new Date(),
    },
    {
      id: 3,
      text: "",
      sender: "me",
      timestamp: new Date(),
      isAudio: true,
      audioDuration: "00:40",
    },
    {
      id: 4,
      text: "This is really amazing game!",
      sender: "other",
      timestamp: new Date(),
    },
    {
      id: 5,
      text: "Thanks everyone. I am super happy today.",
      sender: "me",
      timestamp: new Date(),
    },
  ])

  // Initialize socket service
  const socketService = SocketService.getInstance()

  // Timer for call duration
  useEffect(() => {
    if (callStatus === "connected") {
      const timer = setInterval(() => {
        setCallTime((prevTime) => prevTime + 1)
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [callStatus])

  // Initialize call
  useEffect(() => {
    const initializeCall = async () => {
      try {
        // Connect to socket
        await socketService.connect(token!, BASE_URL)

        // Set up event handlers
        const setupEventHandlers = () => {
          socketService.onCallAccepted(() => {
            setCallStatus("connected")
          })

          socketService.onCallEnded(() => {
            endCall()
          })

          socketService.onChatMessage((message: Message) => {
            setMessages((prev) => [...prev, message])
          })

          socketService.onCallTimeout = function (callback) {
            this.onCallTimeoutCallback = callback
          }

          socketService.onCallTimeout(() => {
            toast({
              title: "Call Timed Out",
              description: "The call has timed out due to no response.",
              variant: "destructive",
            })
            endCall()
          })
        }

        // Set up event handlers
        setupEventHandlers()

        // Set up media
        await setupMedia()

        // Handle call based on whether it's incoming or outgoing
        if (!isIncoming) {
          // Join the call room first
          socketService.joinCall(appointmentId)

          // After joining, initiate the call
          socketService.onJoinedCall(async () => {
            try {
              // Initiate the call to the receiver
              await socketService.initiateCall(appointmentId, receiverId, isVideoCall)
              console.log(`Initiating ${isVideoCall ? "video" : "audio"} call to ${receiverId}`)

              // Start countdown timer
              startCountdownTimer()
            } catch (error) {
              console.error("Error initiating call:", error)
              toast({
                title: "Call Error",
                description: "Failed to initiate call",
                variant: "destructive",
              })
              endCall()
            }
          })
        } else {
          // For incoming calls, handle the incoming call with the offer
          if (callId && offer) {
            await handleIncomingCall(callId, offer)
          }
        }

        // Remove or comment out these lines as they're now handled in the code above
        // socketService.joinCall(appointmentId)
        // startCountdownTimer()
      } catch (error) {
        console.error("Error initializing call:", error)
        toast({
          title: "Call Error",
          description: "Failed to initialize call",
          variant: "destructive",
        })
        endCall()
      }
    }

    initializeCall()

    return () => {
      cleanupCall()
    }
  }, [])

  // Add this function to ensure audio is unmuted initially
  const setupMedia = async () => {
    try {
      const stream = await socketService.setupLocalMedia(isVideoCall)

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Make sure audio is enabled by default
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true
      })

      // Set up remote video
      socketService.onRemoteStream((stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
          // Ensure the remote video element has audio enabled
          remoteVideoRef.current.muted = false
          remoteVideoRef.current.volume = 1.0
        }
      })

      return stream
    } catch (error) {
      console.error("Error accessing media devices:", error)
      throw error
    }
  }

  const handleIncomingCall = async (callId: string, offer: RTCSessionDescriptionInit) => {
    try {
      await socketService.answerCall(callId, receiverId, appointmentId, offer)
      setCallStatus("connected")
    } catch (error) {
      console.error("Error handling incoming call:", error)
      toast({
        title: "Call Error",
        description: "Failed to answer call",
        variant: "destructive",
      })
      endCall()
    }
  }

  const startCountdownTimer = () => {
    setCallTimeoutSeconds(30)
    const countdownInterval = setInterval(() => {
      setCallTimeoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    socketService.setCallTimeout(countdownInterval)
  }

  const toggleMute = () => {
    socketService.toggleAudio()
    setIsMuted(!isMuted)
  }

  const toggleHold = () => {
    socketService.toggleHold()
    setIsHolding(!isHolding)
  }

  const toggleRecording = () => {
    if (isRecording) {
      socketService.stopRecording(appointmentId)
    } else {
      socketService.startRecording(appointmentId)
    }
  }

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen)
  }

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen)
  }

  const sendChatMessage = (audioUrl: string | null, message: string, imageUrl?: string, videoUrl?: string) => {
    // Create local message
    const newMessage: Message = {
      id: Date.now(),
      text: audioUrl ? "" : message,
      sender: "me",
      timestamp: new Date(),
      isAudio: !!audioUrl,
      isVideo: !!videoUrl,
      audioDuration: audioUrl ? "00:00" : undefined,
      audioUrl: audioUrl || undefined,
      videoUrl: videoUrl,
      imageUrl: imageUrl,
    }

    setMessages((prev) => [...prev, newMessage])

    // Send to server
    socketService.sendChatMessage(appointmentId, message, audioUrl || undefined, imageUrl, videoUrl)
  }

  const endCall = () => {
    socketService.endCall(appointmentId)
    cleanupCall()
    router.push("/dashboard")
  }

  const cleanupCall = () => {
    // Stop recording if active
    if (isRecording) {
      socketService.stopRecording(appointmentId)
    }

    // Clean up socket and media
    socketService.cleanup()

    // Reset state
    setCallStatus("ended")
  }

  const value = {
    callStatus,
    isMuted,
    isHolding,
    isRecording,
    isChatOpen,
    isSettingsOpen,
    callTimeoutSeconds,
    callTime,
    callUser,
    callType,
    localVideoRef,
    remoteVideoRef,
    messages,
    toggleMute,
    toggleHold,
    toggleRecording,
    toggleChat,
    toggleSettings,
    endCall,
    sendChatMessage,
    receiverId,
    appointmentId,
    isVideoCall,
    isIncoming,
    setIsChatOpen,
    setIsSettingsOpen,
  }

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>
}
