"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/use-toast";
import {
  ChatService,
  type Conversation,
  type Message,
} from "@/service/chat.service";
import { SocketService } from "@/service/socket.service";

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  setActiveConversation: (conversation: Conversation) => void;
  sendMessage: (message: string) => Promise<void>;
  startNewConversation: (userId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, token, BASE_URL } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const chatService = ChatService.getInstance();
  const socketService = SocketService.getInstance();

  // Initialize chat service and socket connection
  useEffect(() => {
    if (token && BASE_URL && user) {
      chatService.setConfig(BASE_URL, token);
      socketService.connect(token, BASE_URL);

      // Set up socket event handlers
      socketService.onMessageReceived((data) => {
        // Add the new message to the messages list if it's for the active conversation
        if (
          activeConversation &&
          (data.data.conversation_id === activeConversation.id ||
            data.from === activeConversation.creator_id ||
            data.from === activeConversation.participant_id)
        ) {
          setMessages((prev) => [...prev, data.data]);

          // Refresh conversations to update last message
          refreshConversations();
        } else {
          // Just refresh conversations to show new message indicator
          refreshConversations();
        }
      });

      // Load conversations
      refreshConversations();
    }
  }, [token, BASE_URL, user]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id);
    }
  }, [activeConversation]);

  const refreshConversations = async () => {
    try {
      setIsLoading(true);
      const conversationsData = await chatService.getConversations();
      setConversations(conversationsData);

      // If there's an active conversation, refresh it
      if (activeConversation) {
        const updatedConversation = conversationsData.find(
          (c) => c.id === activeConversation.id
        );
        if (updatedConversation) {
          setActiveConversation(updatedConversation);
        }
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setIsLoading(true);
      const messagesData = await chatService.getMessages(conversationId);
      setMessages(messagesData);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (message: string) => {
    if (!activeConversation || !user) return;

    try {
      setIsSending(true);

      // Determine the receiver ID (the other person in the conversation)
      const receiverId =
        activeConversation.creator_id === user.id
          ? activeConversation.participant_id
          : activeConversation.creator_id;

      // Send message via API
      await chatService.sendMessage(receiverId, activeConversation.id, message);

      // Refresh messages
      await loadMessages(activeConversation.id);

      // Refresh conversations to update last message
      await refreshConversations();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const startNewConversation = async (userId: string) => {
    if (!user) return;

    try {
      setIsLoading(true);
      const conversation = await chatService.createConversation(
        user.id,
        userId
      );

      // Refresh conversations
      await refreshConversations();

      // Set the new conversation as active
      setActiveConversation(conversation);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    conversations,
    activeConversation,
    messages,
    isLoading,
    isSending,
    setActiveConversation,
    sendMessage,
    startNewConversation,
    refreshConversations,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
