"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

type User = {
  id: string
  name: string
  email: string
  type: "user" | "coach"
  avatar_url?: string
}

type AuthContextType = {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  googleLogin: (userType: string) => void
  logout: () => void
  BASE_URL: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  const BASE_URL = "http://192.168.4.4:4001"

  useEffect(() => {
    const savedToken = localStorage.getItem("token")
    if (savedToken) {
      setToken(savedToken)
      fetchUserProfile(savedToken)
    } else {
      setIsLoading(false)
      if (pathname !== "/" && pathname !== "/register" && !pathname.includes("/auth/google")) {
        router.push("/")
      }
    }
  }, [pathname, router])

  const fetchUserProfile = async (authToken: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })

      if (!res.ok) {
        throw new Error("Failed to fetch user profile")
      }

      const result = await res.json()
      if (result.success) {
        setUser(result.data)
        if (pathname === "/") {
          router.push("/dashboard")
        }
      } else {
        logout()
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      logout()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!data.success) {
        toast({
          title: "Login failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        })
        return false
      }

      const authToken = data.authorization.token
      setToken(authToken)
      localStorage.setItem("token", authToken)
      localStorage.setItem("userEmail", email)

      await fetchUserProfile(authToken)
      router.push("/dashboard")
      return true
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Login failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const googleLogin = (userType: string) => {
    window.location.href = `${BASE_URL}/api/auth/google?userType=${userType}`
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("userEmail")
    setToken(null)
    setUser(null)
    router.push("/")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        googleLogin,
        logout,
        BASE_URL,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
