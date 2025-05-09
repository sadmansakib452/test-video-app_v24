"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Mic, MicOff, Video, VideoOff, Phone, MessageSquare, Settings, Pause } from "lucide-react"
import io, { type Socket } from "socket.io-client"

type VideoCallUIProps = {
  receiverId: string
  appointmentId: string
  isVideoCall: boolean
}

export default function VideoCallUI({ receiverId, appointmentId, isVideoCall }: VideoCallUIProps) {
  const { user, token, BASE_URL } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  // State
  const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "ended">("connecting")
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isOnHold, setIsOnHold] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [callId, setCallId] = useState<string | null>(null)
  const [remoteDescSet, setRemoteDescSet] = useState(false)
  const [candidateQueue, setCandidateQueue] = useState<RTCIceCandidate[]>([])
  const [callTimeoutSeconds, setCallTimeoutSeconds] = useState(30) // Match server's 30 second timeout

  // Initialize WebRTC
  useEffect(() => {
    let mounted = true
    let countdownInterval: NodeJS.Timeout | null = null

    const initialize = async () => {
      try {
        // Connect socket
        socketRef.current = io(BASE_URL, { auth: { token } })

        // Set up socket event handlers
        setupSocketHandlers()

        // Set up media
        await setupMedia()

        // Create peer connection
        createPeerConnection()

        // Join the appointment room first
        socketRef.current.emit("join", { appointmentId })

        // Start the countdown timer
        setCallTimeoutSeconds(30)
        countdownInterval = setInterval(() => {
          setCallTimeoutSeconds((prev) => {
            if (prev <= 1) {
              if (countdownInterval) clearInterval(countdownInterval)
              return 0
            }
            return prev - 1
          })
        }, 1000)
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

    initialize()

    return () => {
      mounted = false
      if (countdownInterval) clearInterval(countdownInterval)
      cleanupCall()
    }
  }, [])

  const setupSocketHandlers = () => {
    if (!socketRef.current) return

    socketRef.current.on("connect", () => {
      console.log("Socket connected:", socketRef.current?.id)
    })

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error)
      toast({
        title: "Connection Error",
        description: "Failed to connect to the signaling server",
        variant: "destructive",
      })
      endCall()
    })

    socketRef.current.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason)
      if (callStatus === "connected") {
        toast({
          title: "Connection Lost",
          description: "Your connection to the server was lost",
          variant: "destructive",
        })
        endCall()
      }
    })

    // Handle join success - now we can initiate the call
    socketRef.current.on("joinedCall", (data) => {
      console.log("Joined call system:", data)
      if (data.success) {
        initiateCall()
      } else {
        toast({
          title: "Join Error",
          description: data.message || "Failed to join call system",
          variant: "destructive",
        })
        endCall()
      }
    })

    // Handle join error
    socketRef.current.on("joinError", (data) => {
      console.error("Join error:", data)
      toast({
        title: "Join Error",
        description: data.message || "Failed to join call system",
        variant: "destructive",
      })
      endCall()
    })

    // Handle call ringing - server acknowledged our call request
    socketRef.current.on("callRinging", (data) => {
      console.log("Call ringing:", data)
      setCallId(data.callId)
    })

    // Handle call not answered
    socketRef.current.on("callNotAnswered", (data) => {
      console.log("Call not answered:", data)
      toast({
        title: "Call Not Answered",
        description: data.message || "The recipient did not answer your call",
        variant: "destructive",
      })
      endCall()
    })

    // Handle call rejected
    socketRef.current.on("callRejected", (data) => {
      console.log("Call rejected:", data)
      toast({
        title: "Call Rejected",
        description: data.reason || "The recipient rejected your call",
        variant: "destructive",
      })
      endCall()
    })

    // Handle call error
    socketRef.current.on("callError", (data) => {
      console.error("Call error:", data)
      toast({
        title: "Call Error",
        description: data.message || "An error occurred with the call",
        variant: "destructive",
      })
      endCall()
    })

    // Handle call ended
    socketRef.current.on("callEnded", (data) => {
      console.log("Call ended:", data)
      toast({
        title: "Call Ended",
        description: data.message || "The call has ended",
      })
      endCall()
    })

    // Handle call accepted
    socketRef.current.on("callAccepted", async (data) => {
      try {
        console.log("Call accepted:", data)
        if (!peerConnectionRef.current) return

        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer))
        setRemoteDescSet(true)
        flushCandidates()
        setCallStatus("connected")
      } catch (error) {
        console.error("Error handling call accepted:", error)
      }
    })

    // Handle ICE candidates
    socketRef.current.on("iceCandidate", async (data) => {
      try {
        console.log("Received ICE candidate")
        if (!remoteDescSet) {
          setCandidateQueue((prev) => [...prev, data.candidate])
        } else if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
        }
      } catch (error) {
        console.error("Error handling ICE candidate:", error)
      }
    })

    // Handle recording events
    socketRef.current.on("recordingStarted", () => {
      console.log("Recording started")
      setIsRecording(true)
      toast({
        title: "Recording Started",
        description: "Call recording has started",
      })
    })

    socketRef.current.on("recordingStopped", () => {
      console.log("Recording stopped")
      setIsRecording(false)
      toast({
        title: "Recording Stopped",
        description: "Call recording has stopped",
      })
    })

    // Handle call cancelled (e.g., timeout)
    socketRef.current.on("callCancelled", (data) => {
      console.log("Call cancelled:", data)
      toast({
        title: "Call Cancelled",
        description: data.reason || "The call was cancelled",
        variant: "destructive",
      })
      endCall()
    })
  }

  const setupMedia = async () => {
    try {
      const constraints = isVideoCall ? { video: true, audio: true } : { audio: true }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      return stream
    } catch (error) {
      console.error("Error accessing media devices:", error)
      throw error
    }
  }

  const createPeerConnection = () => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      })

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          if (localStreamRef.current) {
            pc.addTrack(track, localStreamRef.current)
          }
        })
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current && callId) {
          socketRef.current.emit("iceCandidate", {
            callId,
            candidate: event.candidate,
            to: receiverId,
          })
        }
      }

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", pc.iceConnectionState)

        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          toast({
            title: "Connection Failed",
            description: "Failed to establish a direct connection with the recipient",
            variant: "destructive",
          })

          if (callStatus === "connecting") {
            endCall()
          }
        }
      }

      peerConnectionRef.current = pc
    } catch (error) {
      console.error("Error creating peer connection:", error)
      throw error
    }
  }

  const initiateCall = async () => {
    try {
      if (!peerConnectionRef.current || !socketRef.current) return

      const offer = await peerConnectionRef.current.createOffer()
      await peerConnectionRef.current.setLocalDescription(offer)

      // Send the call request to the server
      socketRef.current.emit("call", {
        appointmentId,
        receiver: receiverId,
        offer,
      })

      console.log(`Calling ${receiverId} (${isVideoCall ? "video" : "audio"})...`)
    } catch (error) {
      console.error("Error initiating call:", error)
      toast({
        title: "Call Error",
        description: "Failed to initiate call",
        variant: "destructive",
      })
      endCall()
    }
  }

  const flushCandidates = async () => {
    if (!peerConnectionRef.current) return

    for (const candidate of candidateQueue) {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
    }

    setCandidateQueue([])
  }

  const toggleMute = () => {
    if (!localStreamRef.current) return

    const audioTracks = localStreamRef.current.getAudioTracks()
    audioTracks.forEach((track) => {
      track.enabled = isMuted
    })

    setIsMuted(!isMuted)
  }

  const toggleVideo = () => {
    if (!localStreamRef.current) return

    const videoTracks = localStreamRef.current.getVideoTracks()
    videoTracks.forEach((track) => {
      track.enabled = isVideoOff
    })

    setIsVideoOff(!isVideoOff)
  }

  const toggleHold = () => {
    setIsOnHold(!isOnHold)

    if (!localStreamRef.current) return

    const tracks = localStreamRef.current.getTracks()
    tracks.forEach((track) => {
      track.enabled = isOnHold
    })
  }

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const startRecording = async () => {
    if (!socketRef.current || !callId) return

    // In this implementation, we'll use the server's recording functionality
    socketRef.current.emit("startRecording", {
      appointmentId,
    })

    toast({
      title: "Starting Recording",
      description: "Requesting to start call recording...",
    })
  }

  const stopRecording = () => {
    if (!socketRef.current || !callId) return

    // Use the server's recording functionality
    socketRef.current.emit("stopRecording", {
      appointmentId,
    })

    toast({
      title: "Stopping Recording",
      description: "Requesting to stop call recording...",
    })
  }

  const endCall = () => {
    if (socketRef.current && callId) {
      socketRef.current.emit("endCall", {
        callId,
        appointmentId,
      })
    }

    cleanupCall()
    router.push("/dashboard")
  }

  const cleanupCall = () => {
    // Stop recording if active
    if (isRecording && socketRef.current) {
      socketRef.current.emit("stopRecording", {
        appointmentId,
      })
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    // Reset state
    setCallId(null)
    setRemoteDescSet(false)
    setCandidateQueue([])
    setCallStatus("ended")
  }

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      {/* Main video (remote participant) */}
      <div className="absolute inset-0">
        {isOnHold ? (
          <div className="w-full h-full flex items-center justify-center bg-orange-500">
            <p className="text-white text-2xl font-semibold">Call on Hold</p>
          </div>
        ) : (
          <>
            <video
              ref={remoteVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              poster="/placeholder.svg?height=600&width=800"
            />
            {/* Decorative light bar */}
            <div className="absolute left-10 top-0 h-full w-2 bg-cyan-400 opacity-80"></div>
          </>
        )}
      </div>

      {/* Local video (small picture-in-picture) */}
      <div className="absolute top-4 right-4 w-[150px] h-[100px] rounded-lg overflow-hidden border-2 border-white shadow-lg">
        <video
          ref={localVideoRef}
          className={`w-full h-full object-cover ${isVideoOff ? "hidden" : ""}`}
          autoPlay
          playsInline
          muted
        />
        {isVideoOff && (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <p className="text-white text-sm">Camera Off</p>
          </div>
        )}
      </div>

      {/* Call controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-center">
        <div className="flex space-x-4">
          <Button
            variant={isRecording ? "destructive" : "secondary"}
            size="sm"
            className="rounded-full flex flex-col items-center gap-1 p-2 h-auto"
            onClick={toggleRecording}
            disabled={user?.type !== "coach" || callStatus !== "connected"}
          >
            <div className={`w-3 h-3 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-gray-400"}`}></div>
            <span className="text-xs">Record</span>
          </Button>

          <Button
            variant={isOnHold ? "destructive" : "secondary"}
            size="sm"
            className="rounded-full flex flex-col items-center gap-1 p-2 h-auto"
            onClick={toggleHold}
            disabled={callStatus !== "connected"}
          >
            <Pause className="w-4 h-4" />
            <span className="text-xs">Hold</span>
          </Button>
        </div>

        <div className="flex space-x-4">
          <Button
            variant="secondary"
            size="icon"
            className={`rounded-full bg-gray-200 hover:bg-gray-300 ${isMuted ? "bg-red-100 hover:bg-red-200 text-red-500" : ""}`}
            onClick={toggleMute}
            disabled={callStatus !== "connected"}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className={`rounded-full bg-gray-200 hover:bg-gray-300 ${isVideoOff ? "bg-red-100 hover:bg-red-200 text-red-500" : ""}`}
            onClick={toggleVideo}
            disabled={!isVideoCall || callStatus !== "connected"}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>

          <Button variant="destructive" size="icon" className="rounded-full" onClick={endCall}>
            <Phone className="h-5 w-5 rotate-135" />
          </Button>
        </div>

        <div className="flex space-x-4">
          <Button
            variant={isChatOpen ? "default" : "secondary"}
            size="sm"
            className="rounded-full flex flex-col items-center gap-1 p-2 h-auto"
            onClick={() => setIsChatOpen(!isChatOpen)}
            disabled={callStatus !== "connected"}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs">Chat</span>
          </Button>

          <Button
            variant={isSettingsOpen ? "default" : "secondary"}
            size="sm"
            className="rounded-full flex flex-col items-center gap-1 p-2 h-auto"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            <Settings className="w-4 h-4" />
            <span className="text-xs">Settings</span>
          </Button>
        </div>
      </div>

      {/* Chat panel (hidden by default) */}
      {isChatOpen && (
        <div className="absolute right-0 top-0 bottom-16 w-80 bg-white shadow-lg rounded-l-lg p-4">
          <h3 className="font-semibold mb-2">Chat</h3>
          <div className="h-[calc(100%-80px)] overflow-y-auto border rounded-md p-2 mb-2">
            <p className="text-sm mb-1">
              <span className="font-semibold">You:</span> Hello there!
            </p>
            <p className="text-sm mb-1">
              <span className="font-semibold">Caller:</span> Hi! How are you?
            </p>
          </div>
          <div className="flex">
            <input
              type="text"
              className="flex-1 border rounded-l-md px-2 py-1 text-sm"
              placeholder="Type a message..."
            />
            <Button size="sm" className="rounded-l-none">
              Send
            </Button>
          </div>
        </div>
      )}

      {/* Settings panel (hidden by default) */}
      {isSettingsOpen && (
        <div className="absolute right-0 top-0 bottom-16 w-80 bg-white shadow-lg rounded-l-lg p-4">
          <h3 className="font-semibold mb-4">Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Camera</label>
              <select className="w-full border rounded-md px-2 py-1 text-sm">
                <option>Default Camera</option>
                <option>External Webcam</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Microphone</label>
              <select className="w-full border rounded-md px-2 py-1 text-sm">
                <option>Default Microphone</option>
                <option>Headset Microphone</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Speaker</label>
              <select className="w-full border rounded-md px-2 py-1 text-sm">
                <option>Default Speaker</option>
                <option>External Speaker</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Video Quality</label>
              <select className="w-full border rounded-md px-2 py-1 text-sm">
                <option>High (720p)</option>
                <option>Standard (480p)</option>
                <option>Low (360p)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Call status overlay */}
      {callStatus === "connecting" && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-xl mb-2">Connecting...</p>
            <p className="text-lg mb-4">Call will end in {callTimeoutSeconds} seconds if no answer</p>
            <Button variant="destructive" onClick={endCall} className="mt-2">
              Cancel Call
            </Button>
          </div>
        </div>
      )}

      {/* Hidden audio element for ringtone */}
      <audio id="ringtone" loop src="/ringtone.mp3" className="hidden"></audio>
    </div>
  )
}
