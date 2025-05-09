import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

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
  userId?: string
}

interface User {
  img: string
  name: string
  title: string
  time?: string
  lastMessage?: string
}

interface MessageState {
  selectedUser: User | null
  messages: Message[]
  isLoading: boolean
}

const initialState: MessageState = {
  selectedUser: null,
  messages: [],
  isLoading: false,
}

const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    setSelectedUser: (state, action: PayloadAction<User>) => {
      state.selectedUser = action.payload
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload)
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
  },
})

export const { setSelectedUser, addMessage, setMessages, setLoading } = messageSlice.actions
export default messageSlice.reducer
