"use client"

import { useState, useEffect } from "react"
import { Info } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface SettingsPopupProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsPopup({ isOpen, onClose }: SettingsPopupProps) {
  const [isSwitchChecked, setIsSwitchChecked] = useState(false)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([])
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState("")
  const [selectedMicrophone, setSelectedMicrophone] = useState("")
  const [selectedSpeaker, setSelectedSpeaker] = useState("")

  useEffect(() => {
    // Get available media devices
    const getDevices = async () => {
      try {
        // Request permissions first to ensure we get labeled devices
        await navigator.mediaDevices
          .getUserMedia({ audio: true, video: true })
          .catch((err) => console.log("Permission request failed, but we'll still try to get devices:", err))

        const devices = await navigator.mediaDevices.enumerateDevices()

        const videoDevices = devices.filter((device) => device.kind === "videoinput")
        const audioInputDevices = devices.filter((device) => device.kind === "audioinput")
        const audioOutputDevices = devices.filter((device) => device.kind === "audiooutput")

        setCameras(videoDevices)
        setMicrophones(audioInputDevices)
        setSpeakers(audioOutputDevices)

        // Set defaults
        if (videoDevices.length) setSelectedCamera(videoDevices[0].deviceId)
        if (audioInputDevices.length) setSelectedMicrophone(audioInputDevices[0].deviceId)
        if (audioOutputDevices.length) setSelectedSpeaker(audioOutputDevices[0].deviceId)
      } catch (error) {
        console.error("Error getting media devices:", error)
      }
    }

    if (isOpen) {
      getDevices()
    }
  }, [isOpen])

  const applySettings = () => {
    // In a real implementation, you would apply these settings
    // For example, by switching the active audio/video tracks
    console.log("Applying settings:", {
      camera: selectedCamera,
      microphone: selectedMicrophone,
      speaker: selectedSpeaker,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-3 gap-0 bg-white">
        <div className="">
          <DialogHeader className="p-4 border-b">
            <div className="flex justify-between items-center">
              <DialogTitle className="inter-medium text-xl font-semibold text-[#070707] leading-[30px]">
                Audio & Video Settings
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="p-4 space-y-6">
            {/* Camera Section */}
            <div>
              <h3 className="inter-medium text-xl font-semibold text-[#070707] leading-[30px] mb-2">Camera</h3>
              {cameras.length > 0 ? (
                <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                  <SelectTrigger className="w-full mb-4">
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {cameras.map((camera) => (
                      <SelectItem key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || `Camera ${camera.deviceId.substring(0, 5)}...`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center text-sm text-gray-500">
                  <Info className="h-4 w-4 text-[#777980] inter-medium text-base font-normal leading-[22px] mr-2" />
                  <span>No device found. </span>
                  <button className="text-teal-700 hover:underline ml-1">Learn more</button>
                  <span className="ml-1">about fixing this issue</span>
                </div>
              )}
            </div>

            {/* Video Section */}
            <div>
              <h3 className="inter-medium text-lg font-semibold text-[#A4A4A4] leading-[30px] mb-2">Video</h3>
            </div>

            {/* Microphone Section */}
            <div>
              <h3 className="inter-medium text-base font-semibold text-[#070707] leading-[22px] mb-3">Microphone</h3>
              {microphones.length > 0 ? (
                <Select value={selectedMicrophone} onValueChange={setSelectedMicrophone}>
                  <SelectTrigger className="w-full mb-4">
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {microphones.map((mic) => (
                      <SelectItem key={mic.deviceId} value={mic.deviceId}>
                        {mic.label || `Microphone ${mic.deviceId.substring(0, 5)}...`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select defaultValue="default">
                  <SelectTrigger className="w-full mb-4">
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="default">Microphone ( 2 high defination audio)</SelectItem>
                    <SelectItem value="other">Other microphone</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Audio Level Indicators */}
              <div className="flex space-x-1 mb-3">
                {[1, 2, 3, 4, 5, 6, 7].map((level) => (
                  <div key={level} className={`h-2 w-2 rounded-full ${level <= 7 ? "bg-teal-700" : "bg-gray-300"}`} />
                ))}
              </div>

              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center text-sm text-gray-500">
                  <span>No device found. </span>
                  <button className="text-teal-700 hover:underline ml-1">Learn more</button>
                  <span className="ml-1">about fixing this issue</span>
                </div>
                <Switch
                  className=""
                  checked={isSwitchChecked}
                  onCheckedChange={(checked) => {
                    setIsSwitchChecked(checked)
                  }}
                />
              </div>
            </div>

            {/* Noise Cancellation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="inter-medium text-xl font-semibold text-[#070707] leading-[30px]">Noise cancellation</h3>
                <div className="flex items-center text-sm text-gray-500">
                  <Select defaultValue="default">
                    <SelectTrigger className="flex items-center">
                      <SelectValue placeholder="Audio ( default )" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="default">Audio ( default )</SelectItem>
                      <SelectItem value="other">Other Audio Option</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-start">
                <Switch id="noise-switch" className="mt-1 " />
                <div className="ml-3">
                  <label htmlFor="noise-switch" className="text-sm text-gray-500">
                    Choose Low if you want others to hear music.{" "}
                  </label>
                  <button className="text-teal-700 text-sm hover:underline">Learn more</button>
                </div>
              </div>
            </div>

            {/* Speakers */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="inter-medium text-xl font-semibold text-[#070707] leading-[30px]">Speakers</h3>
                {speakers.length > 0 && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
                      <SelectTrigger className="flex items-center">
                        <SelectValue placeholder="Select speaker" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {speakers.map((speaker) => (
                          <SelectItem key={speaker.deviceId} value={speaker.deviceId}>
                            {speaker.label || `Speaker ${speaker.deviceId.substring(0, 5)}...`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Volume Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <span key={num}>{num}</span>
                  ))}
                </div>
                <Slider defaultValue={[9]} max={10} step={1} className="h-2" />
              </div>
            </div>

            {/* Test Audio */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium">Test Audio</h3>
                <div className="flex items-center text-sm text-gray-500">
                  <Select defaultValue="default">
                    <SelectTrigger className="flex items-center">
                      <SelectValue placeholder="Audio ( default )" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="default">Audio ( default )</SelectItem>
                      <SelectItem value="other">Other Audio Option</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <button
              className="w-full bg-[#004D49] text-white py-2 rounded-md text-sm hover:bg-[#003a37] transition-colors"
              onClick={applySettings}
            >
              Apply Settings
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
