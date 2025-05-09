"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/components/ui/use-toast"

export default function GoogleCallbackPage() {
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const { BASE_URL } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const code = searchParams.get("code")
      const state = searchParams.get("state") || "user"

      if (!code) {
        setError("No authorization code received")
        setIsProcessing(false)
        return
      }

      try {
        const response = await fetch(`${BASE_URL}/api/auth/google/callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            userType: state,
          }),
        })

        const data = await response.json()

        if (data.success) {
          // Store the token and user data
          localStorage.setItem("token", data.data.token)
          localStorage.setItem("userEmail", data.data.user.email)

          toast({
            title: "Login Successful",
            description: "You have been logged in with Google",
          })

          // Redirect to dashboard
          router.push("/dashboard")
        } else {
          setError(data.message || "Google login failed")
        }
      } catch (error) {
        console.error("Google login error:", error)
        setError("An unexpected error occurred")
      } finally {
        setIsProcessing(false)
      }
    }

    handleOAuthCallback()
  }, [searchParams, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md text-center">
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold mb-2">Processing Google Login</h1>
            <p className="text-gray-500">Please wait while we complete your login...</p>
          </>
        ) : error ? (
          <>
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-2">Login Failed</h1>
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={() => router.push("/")} className="px-4 py-2 bg-primary text-white rounded-md">
              Return to Login
            </button>
          </>
        ) : (
          <>
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h1 className="text-2xl font-bold mb-2">Login Successful</h1>
            <p className="text-gray-500 mb-4">Redirecting to dashboard...</p>
          </>
        )}
      </div>
    </div>
  )
}
