import { createListenerMiddleware } from "@reduxjs/toolkit"
import { ChatService } from "@/service/chat.service"

// Create the middleware
export const chatMiddleware = createListenerMiddleware()

// Add a listener for when the app starts
chatMiddleware.startListening({
  predicate: (action, currentState, previousState) => {
    // Initialize the chat service when the app starts
    // We can check for user authentication here if needed
    const token = localStorage.getItem("token")
    if (token) {
      const chatService = ChatService.getInstance()
      chatService.setConfig({
        baseUrl: process.env.NEXT_PUBLIC_API_URL || "",
        token,
      })
      return true
    }
    return false
  },
  effect: async (action, listenerApi) => {
    // This effect runs when the predicate returns true
    console.log("Chat service initialized")
  },
})
