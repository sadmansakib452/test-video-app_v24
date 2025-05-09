export interface User {
  id: string
  name: string
  avatar?: string
  avatar_url?: string
  email?: string
  type?: string
}

export interface Message {
  id: string
  message: string
  created_at: string
  status: "SENT" | "DELIVERED" | "READ"
  sender: User
  receiver: User
  attachment?: any
}

export interface Conversation {
  id: string
  creator_id: string
  participant_id: string
  created_at: string
  updated_at: string
  creator: User
  participant: User
  messages?: Message[]
  lastMessage?: Message
}

export class ChatService {
  private static instance: ChatService
  private baseUrl = ""
  private token = ""
  private isInitialized = false
  private socketService: any = null

  private constructor() {
    // Initialize from localStorage if available
    this.initFromLocalStorage()
  }

  private initFromLocalStorage() {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token")
      if (token) {
        this.token = token
        this.baseUrl = process.env.NEXT_PUBLIC_API_URL || ""
        this.isInitialized = true
        console.log("ChatService initialized from localStorage with token:", token.substring(0, 10) + "...")
      }
    }
  }

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  public setConfig(baseUrl: string, token: string): void {
    this.baseUrl = baseUrl
    this.token = token
    this.isInitialized = true
    console.log("ChatService configured with:", { baseUrl: this.baseUrl, tokenLength: this.token?.length })

    // Store token in localStorage for persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("token", this.token)
    }
  }

  public setSocketService(socketService: any): void {
    this.socketService = socketService
    console.log("Socket service set in ChatService")
  }

  public isConfigured(): boolean {
    const configured = this.isInitialized && !!this.baseUrl && !!this.token
    if (!configured) {
      // Try to initialize from localStorage again
      this.initFromLocalStorage()
      return this.isInitialized && !!this.baseUrl && !!this.token
    }
    return configured
  }

  // Helper method to safely parse JSON
  private async safeParseJSON(response: Response): Promise<any> {
    const text = await response.text()
    try {
      return JSON.parse(text)
    } catch (error) {
      // If parsing fails, throw a more helpful error
      const preview = text.substring(0, 50)
      throw new Error(`Invalid JSON response: ${preview}...`)
    }
  }

  // Helper method to create authenticated fetch requests
  private async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.isConfigured()) {
      throw new Error("Chat service not configured")
    }

    // Ensure we have the latest token from localStorage
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("token")
      if (storedToken && storedToken !== this.token) {
        this.token = storedToken
      }
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${this.token}`,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    // Handle 401 Unauthorized errors
    if (response.status === 401) {
      console.error("Authentication error: Token may be invalid or expired")

      // Clear token if it's invalid
      if (typeof window !== "undefined") {
        // Don't clear localStorage here as it might be needed for re-login
        // Just log the error for now
        console.error("Token validation failed, user may need to re-login")
      }

      throw new Error("Authentication failed: Please log in again")
    }

    return response
  }

  public async getConversations(): Promise<Conversation[]> {
    try {
      console.log("Fetching conversations with token:", this.token ? this.token.substring(0, 10) + "..." : "No token")

      const response = await this.authenticatedFetch(`${this.baseUrl}/api/chat/conversation`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await this.safeParseJSON(response)

      if (!data.success) {
        throw new Error(data.message || "Failed to get conversations")
      }

      return data.data
    } catch (error) {
      console.error("Error getting conversations:", error)
      // Return empty array instead of throwing to prevent UI from breaking
      return []
    }
  }

  public async getMessages(conversationId: string): Promise<Message[]> {
    try {
      console.log("Fetching messages for conversation:", conversationId)
      console.log("Using token:", this.token ? this.token.substring(0, 10) + "..." : "No token")

      const response = await this.authenticatedFetch(
        `${this.baseUrl}/api/chat/message?conversation_id=${conversationId}`,
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await this.safeParseJSON(response)

      if (!data.success) {
        throw new Error(data.message || "Failed to get messages")
      }

      return data.data
    } catch (error) {
      console.error("Error getting messages:", error)
      throw error
    }
  }

  public async sendMessage(receiverId: string, conversationId: string, message: string): Promise<any> {
    try {
      console.log("Sending message to:", receiverId, "in conversation:", conversationId)

      const response = await this.authenticatedFetch(`${this.baseUrl}/api/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiver_id: receiverId,
          conversation_id: conversationId,
          message,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await this.safeParseJSON(response)

      if (!data.success) {
        throw new Error(data.message || "Failed to send message")
      }

      // Then emit via socket for real-time delivery if socket is connected
      // Add null checks to prevent the "Cannot read properties of undefined" error
      if (this.socketService && this.socketService.isConnected()) {
        // Get the current user from localStorage or another source
        const currentUser = this.getCurrentUser()

        // Create a message object with the necessary properties
        const socketMessage = {
          conversation_id: conversationId,
          message,
          sender: currentUser || { id: "unknown" },
          receiver: { id: receiverId },
          created_at: new Date().toISOString(),
          id: data.data?.id || Date.now().toString(),
          status: "SENT",
        }

        this.socketService.sendMessage(receiverId, socketMessage)
      }

      return data.data
    } catch (error) {
      console.error("Error sending message:", error)
      throw error
    }
  }

  // Helper method to get the current user information
  private getCurrentUser(): User | null {
    if (typeof window !== "undefined") {
      // Try to get user info from localStorage or another source
      const userEmail = localStorage.getItem("userEmail")
      const userId = localStorage.getItem("userId")

      if (userId) {
        return {
          id: userId,
          name: userEmail || "Current User",
        }
      }
    }
    return null
  }

  public async createConversation(creatorId: string, participantId: string): Promise<any> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/api/chat/conversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creator_id: creatorId,
          participant_id: participantId,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await this.safeParseJSON(response)

      if (!data.success) {
        throw new Error(data.message || "Failed to create conversation")
      }

      return data.data
    } catch (error) {
      console.error("Error creating conversation:", error)
      throw error
    }
  }

  // Methods for typing indicators
  public sendTypingStatus(receiverId: string, conversationId: string): void {
    if (!this.socketService || !this.socketService.isConnected()) return

    this.socketService.sendTypingStatus(receiverId, {
      conversation_id: conversationId,
    })
  }

  public stopTypingStatus(receiverId: string, conversationId: string): void {
    if (!this.socketService || !this.socketService.isConnected()) return

    this.socketService.stopTypingStatus(receiverId, {
      conversation_id: conversationId,
    })
  }
}
