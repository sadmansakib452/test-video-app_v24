"use client"

import { Phone, Mic, MicOff, Video, VideoOff, Pause, MessageSquare, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCall } from "./call-context"
import CallChat from "./call-chat"
import SettingsPopup from "./settings-popup"

export default function VideoCall() {
  const {
    callStatus,
    isMuted,
    isVideoOn,
    isOnHold,
    isRecording,
    isChatOpen,
    isSettingsOpen,
    callTimeoutSeconds,
    localVideoRef,
    remoteVideoRef,
    toggleMute,
    toggleVideo,
    toggleHold,
    toggleRecording,
    toggleChat,
    toggleSettings,
    endCall,
  } = useCall()

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
          className={`w-full h-full object-cover ${!isVideoOn ? "hidden" : ""}`}
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
            disabled={callStatus !== "connected"}
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
            className={`rounded-full bg-gray-200 hover:bg-gray-300 ${!isVideoOn ? "bg-red-100 hover:bg-red-200 text-red-500" : ""}`}
            onClick={toggleVideo}
            disabled={callStatus !== "connected"}
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
            onClick={toggleChat}
            disabled={callStatus !== "connected"}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs">Chat</span>
          </Button>

          <Button
            variant={isSettingsOpen ? "default" : "secondary"}
            size="sm"
            className="rounded-full flex flex-col items-center gap-1 p-2 h-auto"
            onClick={toggleSettings}
          >
            <Settings className="w-4 h-4" />
            <span className="text-xs">Settings</span>
          </Button>
        </div>
      </div>

      {/* Chat panel */}
      {isChatOpen && <CallChat />}

      {/* Settings panel */}
      {isSettingsOpen && <SettingsPopup />}

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
