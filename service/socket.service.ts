import { type Socket, io } from "socket.io-client"
import { ChatService } from "./chat.service"

export class SocketService {
  private static instance: SocketService
  private socket: Socket | null = null
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private callId: string | null = null
  private callTimeout: NodeJS.Timeout | null = null
  private candidateQueue: RTCIceCandidate[] = []
  private remoteDescSet = false

  // Event callbacks
  private onConnectCallback: (() => void) | null = null
  private onDisconnectCallback: ((reason: string) => void) | null = null
  private onConnectionErrorCallback: ((error: Error) => void) | null = null
  private onJoinedCallCallback: ((data: any) => void) | null = null
  private onCallRingingCallback: ((data: any) => void) | null = null
  private onCallAcceptedCallback: ((data: any) => void) | null = null
  private onCallEndedCallback: ((data: any) => void) | null = null
  private onCallErrorCallback: ((data: any) => void) | null = null
  private onCallRejectedCallback: ((data: any) => void) | null = null
  private onCallNotAnsweredCallback: ((data: any) => void) | null = null
  private onRecordingStartedCallback: (() => void) | null = null
  private onRecordingStoppedCallback: (() => void) | null = null
  private onIncomingCallCallback: ((data: any) => void) | null = null
  private onCallCancelledCallback: ((data: any) => void) | null = null
  private onCallTimeoutCallback: ((data: any) => void) | null = null
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null
  private onChatMessageCallback: ((message: any) => void) | null = null
  private onMessageReceivedCallback: ((message: any) => void) | null = null
  private onUserStatusChangeCallback: ((data: any) => void) | null = null
  private onUserTypingCallback: ((data: any) => void) | null = null
  private onUserStoppedTypingCallback: ((data: any) => void) | null = null

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService()
    }
    return SocketService.instance
  }

  // Connection methods
  public async connect(token: string, baseUrl: string): Promise<void> {
    if (this.socket && this.socket.connected) {
      console.log("Socket already connected")
      return
    }

    return new Promise((resolve, reject) => {
      console.log("Connecting to socket server:", baseUrl)
      this.socket = io(baseUrl, { auth: { token } })

      this.socket.on("connect", () => {
        console.log("Socket connected:", this.socket?.id)

        // Register the socket service with the chat service
        const chatService = ChatService.getInstance()
        chatService.setSocketService(this)

        if (this.onConnectCallback) this.onConnectCallback()
        resolve()
      })

      this.socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error)
        if (this.onConnectionErrorCallback) this.onConnectionErrorCallback(error)
        reject(error)
      })

      this.socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason)
        if (this.onDisconnectCallback) this.onDisconnectCallback(reason)
      })

      // Set up call event handlers
      this.setupCallEventHandlers()

      // Set up chat event handlers
      this.setupChatEventHandlers()
    })
  }

  public isConnected(): boolean {
    return !!this.socket && this.socket.connected
  }

  private setupChatEventHandlers(): void {
    if (!this.socket) return

    this.socket.on("message", (data) => {
      console.log("Message received:", data)
      if (this.onMessageReceivedCallback) this.onMessageReceivedCallback(data)
    })

    this.socket.on("userTyping", (data) => {
      console.log("User typing:", data)
      if (this.onUserTypingCallback) this.onUserTypingCallback(data)
    })

    this.socket.on("userStoppedTyping", (data) => {
      console.log("User stopped typing:", data)
      if (this.onUserStoppedTypingCallback) this.onUserStoppedTypingCallback(data)
    })

    this.socket.on("messageStatusUpdated", (data) => {
      console.log("Message status updated:", data)
    })

    this.socket.on("userStatusChange", (data) => {
      console.log("User status change:", data)
      if (this.onUserStatusChangeCallback) this.onUserStatusChangeCallback(data)
    })
  }

  private setupCallEventHandlers(): void {
    if (!this.socket) return

    this.socket.on("joinedCall", (data) => {
      console.log("Joined call system:", data)
      if (this.onJoinedCallCallback) this.onJoinedCallCallback(data)
    })

    this.socket.on("joinError", (data) => {
      console.error("Join error:", data)
      if (this.onCallErrorCallback) this.onCallErrorCallback(data)
    })

    this.socket.on("callRinging", (data) => {
      console.log("Call ringing:", data)
      this.callId = data.callId
      if (this.onCallRingingCallback) this.onCallRingingCallback(data)
    })

    this.socket.on("callAccepted", async (data) => {
      console.log("Call accepted:", data)
      if (this.peerConnection) {
        try {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
          this.remoteDescSet = true
          this.flushCandidates()
          if (this.onCallAcceptedCallback) this.onCallAcceptedCallback(data)
        } catch (error) {
          console.error("Error handling call accepted:", error)
        }
      }
    })

    this.socket.on("callEnded", (data) => {
      console.log("Call ended:", data)
      if (this.onCallEndedCallback) this.onCallEndedCallback(data)
    })

    this.socket.on("callError", (data) => {
      console.error("Call error:", data)
      if (this.onCallErrorCallback) this.onCallErrorCallback(data)
    })

    this.socket.on("callRejected", (data) => {
      console.log("Call rejected:", data)
      if (this.onCallRejectedCallback) this.onCallRejectedCallback(data)
    })

    this.socket.on("callNotAnswered", (data) => {
      console.log("Call not answered:", data)
      if (this.onCallNotAnsweredCallback) this.onCallNotAnsweredCallback(data)
    })

    this.socket.on("iceCandidate", async (data) => {
      try {
        console.log("Received ICE candidate")
        if (!this.remoteDescSet) {
          this.candidateQueue.push(data.candidate)
        } else if (this.peerConnection) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
        }
      } catch (error) {
        console.error("Error handling ICE candidate:", error)
      }
    })

    this.socket.on("recordingStarted", () => {
      console.log("Recording started")
      if (this.onRecordingStartedCallback) this.onRecordingStartedCallback()
    })

    this.socket.on("recordingStopped", () => {
      console.log("Recording stopped")
      if (this.onRecordingStoppedCallback) this.onRecordingStoppedCallback()
    })

    this.socket.on("incomingCall", (data) => {
      console.log("Incoming call received:", data)
      console.log("Call details:", {
        callId: data.callId,
        caller: data.caller,
        appointmentId: data.appointmentId,
        isDoctorCall: data.isDoctorCall,
      })
      if (this.onIncomingCallCallback) this.onIncomingCallCallback(data)
    })

    this.socket.on("callCancelled", (data) => {
      console.log("Call cancelled:", data)
      if (this.onCallCancelledCallback) this.onCallCancelledCallback(data)
    })

    this.socket.on("chatMessage", (data) => {
      console.log("Chat message received:", data)
      if (this.onChatMessageCallback) this.onChatMessageCallback(data)
    })
  }

  // Call methods
  public joinCall(appointmentId: string): void {
    if (!this.socket) return
    this.socket.emit("join", { appointmentId })
  }

  public async initiateCall(appointmentId: string, receiverId: string, isVideoCall: boolean): Promise<void> {
    if (!this.socket || !this.peerConnection) {
      console.error("Socket or peer connection not initialized")
      throw new Error("Socket or peer connection not initialized")
    }

    try {
      console.log(`Creating offer for ${receiverId} (${isVideoCall ? "video" : "audio"})...`)

      // Create an offer with appropriate constraints
      const offerOptions: RTCOfferOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideoCall,
      }

      const offer = await this.peerConnection.createOffer(offerOptions)
      console.log("Offer created:", offer)

      await this.peerConnection.setLocalDescription(offer)
      console.log("Local description set")

      // Send the call request to the server
      this.socket.emit("call", {
        appointmentId,
        receiver: receiverId,
        offer,
      })

      console.log(`Call request sent to ${receiverId} (${isVideoCall ? "video" : "audio"})`)

      // Set up a handler for the call ringing event
      this.socket.once("callRinging", (data) => {
        console.log("Call ringing:", data)
        this.callId = data.callId
      })
    } catch (error) {
      console.error("Error initiating call:", error)
      throw error
    }
  }

  public async answerCall(
    callId: string,
    callerId: string,
    appointmentId: string,
    offer: RTCSessionDescriptionInit,
  ): Promise<void> {
    if (!this.socket || !this.peerConnection) return

    try {
      this.callId = callId

      // Set the remote description from the offer
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      this.remoteDescSet = true

      // Create an answer
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)

      // Send the answer to the caller
      this.socket.emit("answer", {
        callId,
        caller: callerId,
        appointmentId,
        answer,
      })

      // Flush any queued ICE candidates
      this.flushCandidates()

      console.log("Call answered successfully")
    } catch (error) {
      console.error("Error answering call:", error)
      throw error
    }
  }

  public rejectCall(callId: string): void {
    if (!this.socket) return
    this.socket.emit("rejectCall", { callId })
  }

  public endCall(appointmentId: string): void {
    if (!this.socket || !this.callId) return
    this.socket.emit("endCall", { callId: this.callId, appointmentId })
  }

  // Media methods
  public async setupLocalMedia(isVideoCall: boolean): Promise<MediaStream> {
    try {
      const constraints = isVideoCall ? { video: true, audio: true } : { audio: true }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      this.localStream = stream

      // Create peer connection
      this.createPeerConnection()

      return stream
    } catch (error) {
      console.error("Error accessing media devices:", error)
      throw error
    }
  }

  private createPeerConnection(): void {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      })

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          if (this.localStream) {
            pc.addTrack(track, this.localStream)
          }
        })
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && this.socket && this.callId) {
          this.socket.emit("iceCandidate", {
            callId: this.callId,
            candidate: event.candidate,
            to: this.callId.split("-")[0], // This assumes the callId format includes the receiver ID
          })
        }
      }

      pc.ontrack = (event) => {
        this.remoteStream = event.streams[0]

        // Make sure audio tracks are enabled
        event.streams[0].getAudioTracks().forEach((track) => {
          track.enabled = true
        })

        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(event.streams[0])
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", pc.iceConnectionState)
      }

      this.peerConnection = pc
    } catch (error) {
      console.error("Error creating peer connection:", error)
      throw error
    }
  }

  private async flushCandidates(): Promise<void> {
    if (!this.peerConnection) return

    for (const candidate of this.candidateQueue) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    }

    this.candidateQueue = []
  }

  // Media control methods
  public toggleAudio(): void {
    if (!this.localStream) return

    const audioTracks = this.localStream.getAudioTracks()
    audioTracks.forEach((track) => {
      track.enabled = !track.enabled
    })
  }

  // This is the main issue - when toggling hold, we're disabling ALL tracks
  public toggleHold(): void {
    if (!this.localStream) return

    const tracks = this.localStream.getTracks()
    const isOnHold = tracks[0]?.enabled === false

    tracks.forEach((track) => {
      track.enabled = isOnHold
    })
  }

  // Chat methods
  public sendChatMessage(
    appointmentId: string,
    message: string,
    audioUrl?: string,
    imageUrl?: string,
    videoUrl?: string,
  ): void {
    if (!this.socket) return

    this.socket.emit("chatMessage", {
      appointmentId,
      message,
      audioUrl,
      imageUrl,
      videoUrl,
      timestamp: new Date().toISOString(),
    })
  }

  // Chat methods for direct messaging
  public sendMessage(to: string, data: any): void {
    if (!this.socket) {
      console.warn("Socket not connected, can't send message")
      return
    }

    console.log("Sending message via socket to:", to, data)
    this.socket.emit("sendMessage", { to, data })
  }

  public sendTypingStatus(to: string, data: any): void {
    if (!this.socket) return
    this.socket.emit("typing", { to, data })
  }

  public stopTypingStatus(to: string, data: any): void {
    if (!this.socket) return
    this.socket.emit("stopTyping", { to, data })
  }

  // Recording methods
  public startRecording(appointmentId: string): void {
    if (!this.socket) return
    this.socket.emit("startRecording", { appointmentId })
  }

  public stopRecording(appointmentId: string): void {
    if (!this.socket) return
    this.socket.emit("stopRecording", { appointmentId })
  }

  // Timeout methods
  public setCallTimeout(timeout: NodeJS.Timeout): void {
    this.callTimeout = timeout
  }

  public clearCallTimeout(): void {
    if (this.callTimeout) {
      clearInterval(this.callTimeout)
      this.callTimeout = null
    }
  }

  // Cleanup method
  public cleanup(): void {
    this.clearCallTimeout()

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
      this.localStream = null
    }

    // Reset state
    this.remoteStream = null
    this.callId = null
    this.remoteDescSet = false
    this.candidateQueue = []

    // Don't disconnect the socket here as it might be used by other components
  }

  // Event registration methods
  public onConnect(callback: () => void): void {
    this.onConnectCallback = callback
  }

  public onDisconnect(callback: (reason: string) => void): void {
    this.onDisconnectCallback = callback
  }

  public onConnectionError(callback: (error: Error) => void): void {
    this.onConnectionErrorCallback = callback
  }

  public onJoinedCall(callback: (data: any) => void): void {
    this.onJoinedCallCallback = callback
  }

  public onCallRinging(callback: (data: any) => void): void {
    this.onCallRingingCallback = callback
  }

  public onCallAccepted(callback: (data: any) => void): void {
    this.onCallAcceptedCallback = callback
  }

  public onCallEnded(callback: (data: any) => void): void {
    this.onCallEndedCallback = callback
  }

  public onCallError(callback: (data: any) => void): void {
    this.onCallErrorCallback = callback
  }

  public onCallRejected(callback: (data: any) => void): void {
    this.onCallRejectedCallback = callback
  }

  public onCallNotAnswered(callback: (data: any) => void): void {
    this.onCallNotAnsweredCallback = callback
  }

  public onRecordingStarted(callback: () => void): void {
    this.onRecordingStartedCallback = callback
  }

  public onRecordingStopped(callback: () => void): void {
    this.onRecordingStoppedCallback = callback
  }

  public onIncomingCall(callback: (data: any) => void): void {
    this.onIncomingCallCallback = callback
  }

  public onCallCancelled(callback: (data: any) => void): void {
    this.onCallCancelledCallback = callback
  }

  public onCallTimeout(callback: (data: any) => void): void {
    this.onCallTimeoutCallback = callback
  }

  public onRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback
  }

  public onChatMessage(callback: (message: any) => void): void {
    this.onChatMessageCallback = callback
  }

  public onMessageReceived(callback: (message: any) => void): void {
    this.onMessageReceivedCallback = callback
  }

  public onUserStatusChange(callback: (data: any) => void): void {
    this.onUserStatusChangeCallback = callback
  }

  public onUserTyping(callback: (data: any) => void): void {
    this.onUserTypingCallback = callback
  }

  public onUserStoppedTyping(callback: (data: any) => void): void {
    this.onUserStoppedTypingCallback = callback
  }
}
