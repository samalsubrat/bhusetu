"use client"

import { useState, useRef, useEffect, useCallback, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Landmark, Loader2, MailCheck } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  )
}

function VerifyForm() {
  const { verifyOtp, resendOtp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get("userId") || ""

  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // ── Redirect if no userId ──────────────────────────────────────────────
  useEffect(() => {
    if (!userId) router.replace("/signup")
  }, [userId, router])

  // ── Cooldown timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  // ── Handle input ───────────────────────────────────────────────────────
  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!text) return
    const next = [...otp]
    for (let i = 0; i < 6; i++) {
      next[i] = text[i] || ""
    }
    setOtp(next)
    inputRefs.current[Math.min(text.length, 5)]?.focus()
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (code: string) => {
      setError("")
      setLoading(true)

      const result = await verifyOtp(userId, code)

      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else {
        router.push("/dashboard")
      }
    },
    [verifyOtp, userId, router]
  )

  // ── Auto-submit when all 6 digits entered ─────────────────────────────
  useEffect(() => {
    const code = otp.join("")
    if (code.length === 6 && !loading) {
      handleSubmit(code)
    }
  }, [otp, loading, handleSubmit])

  // ── Resend ─────────────────────────────────────────────────────────────
  async function handleResend() {
    setResending(true)
    setError("")
    const result = await resendOtp(userId)
    if (result.error) {
      setError(result.error)
    }
    setResending(false)
    setResendCooldown(60)
  }

  if (!userId) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="rounded-lg bg-blue-600 p-2 text-white">
              <Landmark className="h-6 w-6" />
            </div>
            <span className="text-2xl font-black tracking-tight text-blue-600">
              BhuSetu
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <MailCheck className="h-7 w-7 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">
            Check your email
          </h1>
          <p className="text-sm text-slate-500 mb-8">
            We sent a 6-digit verification code to your email.
            <br />
            Enter it below to verify your account.
          </p>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {/* OTP Inputs */}
          <div className="flex justify-center gap-3 mb-8" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-13 w-11 rounded-lg border border-slate-300 text-center text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            ))}
          </div>

          {/* Submit */}
          <button
            onClick={() => handleSubmit(otp.join(""))}
            disabled={loading || otp.join("").length !== 6}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Verify Email
          </button>

          {/* Resend */}
          <div className="mt-6">
            {resendCooldown > 0 ? (
              <p className="text-sm text-slate-400">
                Resend code in {resendCooldown}s
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {resending ? "Sending..." : "Didn\u2019t receive a code? Resend"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
