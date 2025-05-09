"use client"

import { useState, useEffect, useRef } from "react"
import { Mic, MicOff, Video, VideoOff, Phone, MessageSquare, Settings, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function VideoCall() {
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [isOnHold, setIsOnHold] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Request access to user's camera and microphone
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        // In a real app, we would connect to a remote peer here
        // For demo purposes, we'll just show a placeholder for the remote video
      } catch (error) {
        console.error("Error accessing media devices:", error)
      }
    }

    if (!isOnHold) {
      startMedia()
    }

    return () => {
      // Clean up media streams when component unmounts
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const tracks = (localVideoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [isOnHold])

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const audioTracks = (localVideoRef.current.srcObject as MediaStream).getAudioTracks()
      audioTracks.forEach((track) => {
        track.enabled = isMuted
      })
    }
  }

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn)
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const videoTracks = (localVideoRef.current.srcObject as MediaStream).getVideoTracks()
      videoTracks.forEach((track) => {
        track.enabled = !isVideoOn
      })
    }
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    // Implement actual recording logic here
  }

  const toggleHold = () => {
    setIsOnHold(!isOnHold)
  }

  const endCall = () => {
    // Implement call ending logic here
    alert("Call ended")
  }

  return (
    <div className="relative w-full h-[600px] bg-orange-400 rounded-lg overflow-hidden">
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
          className={cn("w-full h-full object-cover", !isVideoOn && "hidden")}
          autoPlay
          playsInline
          muted
        />
        {!isVideoOn && (
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
          >
            <div className={cn("w-3 h-3 rounded-full", isRecording ? "bg-red-500 animate-pulse" : "bg-gray-400")}></div>
            <span className="text-xs">Record</span>
          </Button>

          <Button
            variant={isOnHold ? "destructive" : "secondary"}
            size="sm"
            className="rounded-full flex flex-col items-center gap-1 p-2 h-auto"
            onClick={toggleHold}
          >
            <Pause className="w-4 h-4" />
            <span className="text-xs">Hold</span>
          </Button>
        </div>

        <div className="flex space-x-4">
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              "rounded-full bg-gray-200 hover:bg-gray-300",
              isMuted && "bg-red-100 hover:bg-red-200 text-red-500",
            )}
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className={cn(
              "rounded-full bg-gray-200 hover:bg-gray-300",
              !isVideoOn && "bg-red-100 hover:bg-red-200 text-red-500",
            )}
            onClick={toggleVideo}
          >
            {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
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
    </div>
  )
}
