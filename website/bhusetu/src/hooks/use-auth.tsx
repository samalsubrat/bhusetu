"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  name: string
  phone: string | null
  role: "OWNER" | "BUYER" | "ADMIN"
  isVerified: boolean
  createdAt: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  signup: (data: SignupData) => Promise<SignupResult>
  verifyOtp: (userId: string, otp: string) => Promise<VerifyResult>
  resendOtp: (userId: string) => Promise<{ error?: string }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

interface SignupData {
  email: string
  password: string
  name: string
  phone?: string
  role?: string
}

interface LoginResult {
  error?: string
  userId?: string
  needsVerification?: boolean
}

interface SignupResult {
  error?: string
  userId?: string
}

interface VerifyResult {
  error?: string
  user?: AuthUser
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // ── Fetch current user ──────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // ── Signup ──────────────────────────────────────────────────────────────
  const signup = useCallback(async (data: SignupData): Promise<SignupResult> => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) return { error: json.error }
      return { userId: json.userId }
    } catch {
      return { error: "Network error. Please try again." }
    }
  }, [])

  // ── Verify OTP ──────────────────────────────────────────────────────────
  const verifyOtp = useCallback(
    async (userId: string, otp: string): Promise<VerifyResult> => {
      try {
        const res = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId, otp }),
        })
        const json = await res.json()
        if (!res.ok) return { error: json.error }
        setUser(json.user)
        return { user: json.user }
      } catch {
        return { error: "Network error. Please try again." }
      }
    },
    []
  )

  // ── Resend OTP ──────────────────────────────────────────────────────────
  const resendOtp = useCallback(
    async (userId: string): Promise<{ error?: string }> => {
      try {
        const res = await fetch("/api/auth/resend-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        })
        const json = await res.json()
        if (!res.ok) return { error: json.error }
        return {}
      } catch {
        return { error: "Network error. Please try again." }
      }
    },
    []
  )

  // ── Login ───────────────────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        })
        const json = await res.json()
        if (!res.ok) {
          return {
            error: json.error,
            userId: json.userId,
            needsVerification: json.needsVerification,
          }
        }
        setUser(json.user)
        return {}
      } catch {
        return { error: "Network error. Please try again." }
      }
    },
    []
  )

  // ── Logout ──────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
    } finally {
      setUser(null)
      router.push("/login")
    }
  }, [router])

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, verifyOtp, resendOtp, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>")
  }
  return ctx
}
