"use client"
import { useSelector, useDispatch } from "react-redux"
import type { RootState } from "@/src/redux/store"
import { setCallActive } from "@/src/redux/features/call/callSlice"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { PhoneIcon, SettingsIcon } from "lucide-react"
import { IoMdMic, IoMdMicOff } from "react-icons/io"
import { FiVideo } from "react-icons/fi"
import { BsChatDots } from "react-icons/bs"
import { GrStatusPlaceholder } from "react-icons/gr"
import SettingsPopup from "../../audio-call/_components/settings-popup"
import CallChat from "../../audio-call/_components/call-chat"
import { useCall } from "../../audio-call/_components/call-context"

export default function VideoCall() {
  const {
    callTime,
    isMuted,
    isHolding,
    isRecording,
    isChatOpen,
    isSettingsOpen,
    callUser,
    toggleMute,
    toggleHold,
    toggleRecording,
    toggleChat,
    endCall,
    setIsChatOpen,
    setIsSettingsOpen,
    localVideoRef,
    remoteVideoRef,
  } = useCall()

  const callUserFromRedux = useSelector((state: RootState) => state.call.user)
  const dispatch = useDispatch()

  // Format time as MM:SS
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = timeInSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const handleEndCall = () => {
    dispatch(setCallActive(false))
    endCall()
  }

  return (
    <div className="flex h-[90vh]">
      <div
        className={`flex flex-col items-center justify-between ${
          isChatOpen ? "w-2/3" : "w-full"
        } bg-gray-50 py-8 transition-all duration-300`}
      >
        <div className="w-full">
          <div className="relative w-full h-[70vh] overflow-hidden">
            {/* Remote video */}
            <video
              ref={remoteVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              poster="/placeholder.svg?height=600&width=800"
            />

            {/* Local video (picture-in-picture) */}
            <div className="absolute top-5 right-5 w-[150px] h-[100px] rounded-lg overflow-hidden border-2 border-white shadow-lg">
              <video ref={localVideoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            </div>

            <p className="absolute bottom-4 left-4 text-sm text-white bg-black bg-opacity-50 px-2 py-1 rounded">
              {formatTime(callTime)}
            </p>
          </div>
        </div>

        {/* Bottom section - Call controls */}
        <div className="w-full">
          <div className="bg-white p-4 rounded-xl shadow-sm py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-0">
              <div className="flex items-center gap-6 md:gap-10">
                {/* Record button */}
                <div className="flex flex-col items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-full w-7 h-7 ${isRecording ? "text-[#EB3D4D] border border-[#EB3D4D]" : "text-gray-400 border border-gray-300"} cursor-pointer`}
                    onClick={toggleRecording}
                  >
                    <div className={`w-3 h-3 ${isRecording ? "bg-[#EB3D4D]" : "bg-gray-400"} rounded-full`} />
                  </Button>
                  <span
                    className={`text-xs md:text-sm ${isRecording ? "text-[#EB3D4D]" : "text-gray-400"} font-medium inter-medium`}
                  >
                    Record
                  </span>
                </div>

                {/* Hold button */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="rounded-full w-8 h-8 md:w-10 md:h-10 text-gray-400 cursor-pointer duration-300 ease-linear hover:bg-gray-100 flex items-center justify-center"
                    onClick={toggleHold}
                  >
                    {isHolding ? (
                      <GrStatusPlaceholder className="h-4 w-4 md:h-5 md:w-5" />
                    ) : (
                      <Image
                        src="/img/profile-details/hold.png"
                        alt="Hold"
                        width={24}
                        height={24}
                        className="w-6 h-6 md:w-8 md:h-8"
                      />
                    )}
                  </div>
                  <span className="text-xs md:text-sm inter-medium font-normal text-[#A4A4A4]">Hold</span>
                </div>
              </div>

              {/* Main call controls */}
              <div className="flex items-center gap-2 md:gap-3">
                {/* Mute button */}
                <Button
                  size="icon"
                  variant="outline"
                  className={`rounded-full w-9 h-9 md:w-12 md:h-12 cursor-pointer ${
                    isMuted ? "bg-[#004D49]" : "bg-white"
                  }`}
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <IoMdMicOff className="h-5 w-5 md:h-8 md:w-8 text-white" />
                  ) : (
                    <IoMdMic className="h-5 w-5 md:h-8 md:w-8" />
                  )}
                </Button>

                {/* End call button */}
                <Button
                  size="icon"
                  className="rounded-full w-9 h-9 md:w-12 md:h-12 bg-[#EB3D4D] hover:bg-[#EB3D4D]/80 cursor-pointer duration-300 ease-linear"
                  onClick={handleEndCall}
                >
                  <PhoneIcon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </Button>

                {/* Video button */}
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full w-9 h-9 md:w-12 md:h-12 bg-white cursor-pointer duration-300 ease-linear hover:bg-gray-100"
                >
                  <FiVideo className="h-4 w-4 md:h-5 md:w-5 text-gray-800" />
                </Button>
              </div>

              <div className="flex items-center gap-6 md:gap-10">
                {/* Chat button */}
                <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={toggleChat}>
                  <div className={`rounded-full ${isChatOpen ? "text-[#004D49]" : "text-[#D4D4D4]"}`}>
                    <BsChatDots className="h-5 w-5 md:h-7 md:w-7" />
                  </div>
                  <span
                    className={`text-xs md:text-sm inter-medium font-normal ${
                      isChatOpen ? "text-[#004D49]" : "text-[#A4A4A4]"
                    }`}
                  >
                    Chat
                  </span>
                </div>

                {/* Settings button */}
                <div
                  className="flex flex-col items-center gap-1 cursor-pointer"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <div className="rounded-full text-gray-500">
                    <SettingsIcon className="h-5 w-5 md:h-7 md:w-7 text-[#D4D4D4]" />
                  </div>
                  <span className="text-xs md:text-sm inter-medium font-normal text-[#A4A4A4]">Settings</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal for SettingsPopup */}
        {isSettingsOpen && <SettingsPopup isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}
      </div>

      {/* Chat Sidebar */}
      {isChatOpen && (
        <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col h-[86vh] rounded-xl">
          <CallChat />
        </div>
      )}
    </div>
  )
}
