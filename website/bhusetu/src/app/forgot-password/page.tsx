"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Landmark, Eye, EyeOff, Loader2, Mail, Lock, ShieldCheck, ArrowRight } from "lucide-react"

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [step, setStep] = useState<"EMAIL" | "OTP_NEW_PASSWORD">("EMAIL")
    const [email, setEmail] = useState("")
    const [otp, setOtp] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)

    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSendOtp(e: React.FormEvent) {
        e.preventDefault()
        setError("")
        setSuccess("")
        setLoading(true)

        try {
            const res = await fetch("/api/auth/forgot-password/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Failed to send OTP")
                setLoading(false)
                return
            }

            setSuccess("An OTP has been successfully sent to your email.")
            setStep("OTP_NEW_PASSWORD")
        } catch {
            setError("Network error. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    async function handleResetPassword(e: React.FormEvent) {
        e.preventDefault()
        setError("")
        setSuccess("")

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.")
            return
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters.")
            return
        }

        setLoading(true)

        try {
            const res = await fetch("/api/auth/forgot-password/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp, newPassword }),
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Failed to reset password")
                setLoading(false)
                return
            }

            setSuccess("Password updated successfully. Redirecting to login...")
            setStep("EMAIL") // Reset form 

            setTimeout(() => {
                router.push("/login")
            }, 2000)
        } catch {
            setError("Network error. Please try again.")
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb] px-4 py-12">
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
                    <h1 className="mt-6 text-2xl font-bold text-gray-900">
                        Forgot Password
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        {step === "EMAIL" ? "Enter your email to receive an OTP" : "Enter OTP and your new password"}
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 pt-6">
                    {error && (
                        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 bg-red-50/50">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 bg-green-50/50">
                            {success}
                        </div>
                    )}

                    {step === "EMAIL" ? (
                        <form onSubmit={handleSendOtp} className="space-y-5">
                            {/* Email */}
                            <div>
                                <label className="flex text-sm font-medium text-slate-700 mb-1.5 items-center gap-2">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    Email address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                />
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                                Send Reset OTP
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-5">
                            {/* OTP */}
                            <div>
                                <label className="flex text-sm font-medium text-slate-700 mb-1.5 items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                                    Verification Code (OTP)
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="Enter 6-digit OTP"
                                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition tracking-widest font-mono text-center"
                                    maxLength={6}
                                />
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="flex text-sm font-medium text-slate-700 mb-1.5 items-center gap-2">
                                    <Lock className="h-4 w-4 text-slate-400" />
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="flex text-sm font-medium text-slate-700 mb-1.5 items-center gap-2">
                                    <Lock className="h-4 w-4 text-slate-400" />
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading || !otp || !newPassword || !confirmPassword}
                                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                                Reset Password
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-slate-500 mt-6">
                    <Link
                        href="/login"
                        className="font-semibold text-blue-600 hover:text-blue-700"
                    >
                        &larr; Back to login
                    </Link>
                </p>
            </div>
        </div>
    )
}
