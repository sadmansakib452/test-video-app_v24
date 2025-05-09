import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import { ChatService, type Conversation, type Message } from "@/service/chat.service"
import { SocketService } from "@/service/socket.service"

interface ChatState {
  conversations: Conversation[]
  activeConversation: Conversation | null
  messages: Message[]
  isLoading: boolean
  isSending: boolean
  error: string | null
  isInitialized: boolean
  typingUsers: Record<string, boolean> // conversationId -> isTyping
  authError: boolean
}

const initialState: ChatState = {
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  isInitialized: false,
  typingUsers: {},
  authError: false,
}

// Initialize chat services
export const initializeChat = createAsyncThunk("chat/initialize", async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem("token")
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || ""

    if (!token || !baseUrl) {
      return rejectWithValue("Missing token or API URL")
    }

    console.log("Initializing chat with token:", token.substring(0, 10) + "...")
    console.log("API URL:", baseUrl)

    // Initialize chat service
    const chatService = ChatService.getInstance()
    chatService.setConfig(baseUrl, token)

    // Initialize socket service
    const socketService = SocketService.getInstance()
    await socketService.connect(token, baseUrl)

    // Set up socket event handlers for real-time messaging
    socketService.onMessageReceived((data) => {
      // Handle incoming messages
      console.log("Message received in Redux:", data)
      // We'll handle this in the component
    })

    return true
  } catch (error) {
    console.error("Failed to initialize chat:", error)
    return rejectWithValue((error as Error).message)
  }
})

// Async thunks
export const fetchConversations = createAsyncThunk(
  "chat/fetchConversations",
  async (_, { rejectWithValue, dispatch }) => {
    try {
      // Make sure chat is initialized
      const chatService = ChatService.getInstance()
      if (!chatService.isConfigured()) {
        await dispatch(initializeChat()).unwrap()
      }

      const conversations = await chatService.getConversations()
      return conversations
    } catch (error) {
      console.error("Error in fetchConversations thunk:", error)

      // Check if it's an auth error
      if ((error as Error).message.includes("Authentication failed")) {
        return rejectWithValue({ message: (error as Error).message, authError: true })
      }

      return rejectWithValue((error as Error).message)
    }
  },
)

export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async (conversationId: string, { rejectWithValue, dispatch }) => {
    try {
      // Make sure chat is initialized
      const chatService = ChatService.getInstance()
      if (!chatService.isConfigured()) {
        await dispatch(initializeChat()).unwrap()
      }

      const messages = await chatService.getMessages(conversationId)
      return messages
    } catch (error) {
      console.error("Error in fetchMessages thunk:", error)

      // Check if it's an auth error
      if ((error as Error).message.includes("Authentication failed")) {
        return rejectWithValue({ message: (error as Error).message, authError: true })
      }

      return rejectWithValue((error as Error).message)
    }
  },
)

export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async (
    { receiverId, conversationId, message }: { receiverId: string; conversationId: string; message: string },
    { rejectWithValue, dispatch, getState },
  ) => {
    try {
      // Make sure chat is initialized
      const chatService = ChatService.getInstance()
      if (!chatService.isConfigured()) {
        await dispatch(initializeChat()).unwrap()
      }

      // Try to send the message
      await chatService.sendMessage(receiverId, conversationId, message)

      // If successful, fetch updated messages
      try {
        const messages = await chatService.getMessages(conversationId)
        return messages
      } catch (fetchError) {
        console.error("Error fetching messages after sending:", fetchError)

        // If we can't fetch messages, at least add the sent message to the state
        // Get current state
        const state = getState() as { chat: ChatState }
        const { messages, activeConversation } = state.chat

        if (activeConversation) {
          // Create a temporary message object
          const tempMessage: Message = {
            id: `temp-${Date.now()}`,
            message,
            created_at: new Date().toISOString(),
            status: "SENT",
            sender: {
              id: localStorage.getItem("userId") || "unknown",
              name: localStorage.getItem("userEmail") || "Current User",
            },
            receiver: { id: receiverId, name: "Recipient" },
          }

          // Return current messages plus the new one
          return [...messages, tempMessage]
        }

        // If no active conversation, just return current messages
        return messages
      }
    } catch (error) {
      console.error("Error in sendMessage thunk:", error)

      // Check if it's an auth error
      if ((error as Error).message.includes("Authentication failed")) {
        return rejectWithValue({ message: (error as Error).message, authError: true })
      }

      return rejectWithValue((error as Error).message)
    }
  },
)

export const createConversation = createAsyncThunk(
  "chat/createConversation",
  async ({ creatorId, participantId }: { creatorId: string; participantId: string }, { rejectWithValue, dispatch }) => {
    try {
      // Make sure chat is initialized
      const chatService = ChatService.getInstance()
      if (!chatService.isConfigured()) {
        await dispatch(initializeChat()).unwrap()
      }

      const conversation = await chatService.createConversation(creatorId, participantId)
      return conversation
    } catch (error) {
      console.error("Error in createConversation thunk:", error)

      // Check if it's an auth error
      if ((error as Error).message.includes("Authentication failed")) {
        return rejectWithValue({ message: (error as Error).message, authError: true })
      }

      return rejectWithValue((error as Error).message)
    }
  },
)

export const sendTypingStatus = createAsyncThunk(
  "chat/sendTypingStatus",
  async (
    { receiverId, conversationId }: { receiverId: string; conversationId: string },
    { rejectWithValue, dispatch },
  ) => {
    try {
      // Make sure chat is initialized
      const chatService = ChatService.getInstance()
      if (!chatService.isConfigured()) {
        await dispatch(initializeChat()).unwrap()
      }

      chatService.sendTypingStatus(receiverId, conversationId)
      return { conversationId, isTyping: true }
    } catch (error) {
      console.error("Error sending typing status:", error)
      return rejectWithValue((error as Error).message)
    }
  },
)

export const stopTypingStatus = createAsyncThunk(
  "chat/stopTypingStatus",
  async (
    { receiverId, conversationId }: { receiverId: string; conversationId: string },
    { rejectWithValue, dispatch },
  ) => {
    try {
      // Make sure chat is initialized
      const chatService = ChatService.getInstance()
      if (!chatService.isConfigured()) {
        await dispatch(initializeChat()).unwrap()
      }

      chatService.stopTypingStatus(receiverId, conversationId)
      return { conversationId, isTyping: false }
    } catch (error) {
      console.error("Error stopping typing status:", error)
      return rejectWithValue((error as Error).message)
    }
  },
)

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveConversation: (state, action: PayloadAction<Conversation>) => {
      state.activeConversation = action.payload
      // Reset messages when changing conversations
      state.messages = []
      state.error = null
      // Reset typing status
      state.typingUsers = {}
    },
    clearActiveConversation: (state) => {
      state.activeConversation = null
      state.messages = []
      state.error = null
      state.typingUsers = {}
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      // Check if message already exists
      const exists = state.messages.some((msg) => msg.id === action.payload.id)
      if (!exists) {
        state.messages.push(action.payload)
      }
    },
    clearError: (state) => {
      state.error = null
      state.authError = false
    },
    setUserTyping: (state, action: PayloadAction<{ conversationId: string; isTyping: boolean }>) => {
      state.typingUsers[action.payload.conversationId] = action.payload.isTyping
    },
    resetAuthError: (state) => {
      state.authError = false
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize chat
      .addCase(initializeChat.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(initializeChat.fulfilled, (state) => {
        state.isLoading = false
        state.isInitialized = true
        state.authError = false
      })
      .addCase(initializeChat.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isInitialized = false
        state.authError = true
      })

      // Fetch conversations
      .addCase(fetchConversations.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading = false
        state.conversations = action.payload
        state.isInitialized = true
        state.authError = false

        // Update active conversation if it exists
        if (state.activeConversation) {
          const updatedConversation = action.payload.find((c) => c.id === state.activeConversation?.id)
          if (updatedConversation) {
            state.activeConversation = updatedConversation
          }
        }
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoading = false

        if (typeof action.payload === "object" && action.payload !== null && "authError" in action.payload) {
          state.error = (action.payload as any).message
          state.authError = true
        } else {
          state.error = action.payload as string
        }
      })

      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoading = false
        state.messages = action.payload
        state.authError = false
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoading = false

        if (typeof action.payload === "object" && action.payload !== null && "authError" in action.payload) {
          state.error = (action.payload as any).message
          state.authError = true
        } else {
          state.error = action.payload as string
        }
      })

      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.isSending = true
        state.error = null
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isSending = false
        state.messages = action.payload
        state.authError = false
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isSending = false

        if (typeof action.payload === "object" && action.payload !== null && "authError" in action.payload) {
          state.error = (action.payload as any).message
          state.authError = true
        } else {
          state.error = action.payload as string
        }
      })

      // Create conversation
      .addCase(createConversation.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createConversation.fulfilled, (state, action) => {
        state.isLoading = false
        state.activeConversation = action.payload
        state.conversations.push(action.payload)
        state.authError = false
      })
      .addCase(createConversation.rejected, (state, action) => {
        state.isLoading = false

        if (typeof action.payload === "object" && action.payload !== null && "authError" in action.payload) {
          state.error = (action.payload as any).message
          state.authError = true
        } else {
          state.error = action.payload as string
        }
      })

      // Typing status
      .addCase(sendTypingStatus.fulfilled, (state, action) => {
        if (action.payload) {
          state.typingUsers[action.payload.conversationId] = action.payload.isTyping
        }
      })
      .addCase(stopTypingStatus.fulfilled, (state, action) => {
        if (action.payload) {
          state.typingUsers[action.payload.conversationId] = action.payload.isTyping
        }
      })
  },
})

export const { setActiveConversation, clearActiveConversation, addMessage, clearError, setUserTyping, resetAuthError } =
  chatSlice.actions
export default chatSlice.reducer
