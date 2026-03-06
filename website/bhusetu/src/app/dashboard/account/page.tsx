"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
    User,
    Mail,
    Phone,
    Shield,
    ShieldCheck,
    KeyRound,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Eye,
    EyeOff,
    Send,
    Clock,
    Pencil,
    X,
    Calendar,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────
type EditSection = "profile" | "password" | null

// ─── OTP Timer Hook ──────────────────────────────────────────────────
function useOtpTimer(initialSeconds = 0) {
    const [seconds, setSeconds] = useState(initialSeconds)
    const interval = useRef<NodeJS.Timeout | null>(null)

    const start = useCallback((duration = 60) => {
        setSeconds(duration)
        if (interval.current) clearInterval(interval.current)
        interval.current = setInterval(() => {
            setSeconds((prev) => {
                if (prev <= 1) {
                    if (interval.current) clearInterval(interval.current)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }, [])

    useEffect(() => {
        return () => {
            if (interval.current) clearInterval(interval.current)
        }
    }, [])

    return { seconds, isActive: seconds > 0, start }
}

// ─── Status Toast ────────────────────────────────────────────────────
function StatusMessage({
    type,
    message,
    onDismiss,
}: {
    type: "success" | "error"
    message: string
    onDismiss: () => void
}) {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 5000)
        return () => clearTimeout(timer)
    }, [onDismiss])

    return (
        <div
            className={`flex items-center gap-3 rounded-xl border p-4 text-sm animate-in slide-in-from-top-2 duration-300 ${type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
                }`}
        >
            {type === "success" ? (
                <CheckCircle2 className="size-5 shrink-0" />
            ) : (
                <AlertCircle className="size-5 shrink-0" />
            )}
            <span className="flex-1">{message}</span>
            <button onClick={onDismiss} className="shrink-0 hover:opacity-70 transition-opacity">
                <X className="size-4" />
            </button>
        </div>
    )
}

// ─── Info Row ────────────────────────────────────────────────────────
function InfoRow({
    icon,
    label,
    value,
    badge,
}: {
    icon: React.ReactNode
    label: string
    value: string
    badge?: React.ReactNode
}) {
    return (
        <div className="flex items-start gap-4 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">{value}</p>
            </div>
            {badge && <div className="shrink-0 mt-1">{badge}</div>}
        </div>
    )
}

// ─── Role Label ──────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
    CITIZEN: "Citizen",
    REVENUE_INSPECTOR: "Revenue Inspector",
    ADDITIONAL_TAHASILDAR: "Addl. Tahasildar",
    TAHASILDAR: "Tahasildar",
    COLLECTOR: "Collector",
    ADMIN: "Admin",
}

// ─── Main Component ──────────────────────────────────────────────────
export default function AccountPage() {
    const { user, refresh, loading: authLoading } = useAuth()
    const otpTimer = useOtpTimer()

    // Edit state
    const [editSection, setEditSection] = useState<EditSection>(null)
    const [otpSent, setOtpSent] = useState(false)
    const [otpValue, setOtpValue] = useState("")
    const [sendingOtp, setSendingOtp] = useState(false)
    const [saving, setSaving] = useState(false)

    // Profile fields
    const [editName, setEditName] = useState("")
    const [editPhone, setEditPhone] = useState("")

    // Password fields
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showCurrentPw, setShowCurrentPw] = useState(false)
    const [showNewPw, setShowNewPw] = useState(false)
    const [showConfirmPw, setShowConfirmPw] = useState(false)

    // Feedback
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)

    // Reset fields when entering edit mode
    const startEdit = (section: EditSection) => {
        setEditSection(section)
        setOtpSent(false)
        setOtpValue("")
        setStatus(null)
        if (section === "profile") {
            setEditName(user?.name ?? "")
            setEditPhone(user?.phone ?? "")
        } else if (section === "password") {
            setCurrentPassword("")
            setNewPassword("")
            setConfirmPassword("")
        }
    }

    const cancelEdit = () => {
        setEditSection(null)
        setOtpSent(false)
        setOtpValue("")
    }

    // ── Send OTP ─────────────────────────────────────────────────────
    const handleSendOtp = async () => {
        setSendingOtp(true)
        setStatus(null)
        try {
            const res = await fetch("/api/account/send-otp", {
                method: "POST",
                credentials: "include",
            })
            const data = await res.json()
            if (!res.ok) {
                setStatus({ type: "error", message: data.error })
                return
            }
            setOtpSent(true)
            otpTimer.start(60)
            setStatus({ type: "success", message: "Verification code sent to your email." })
        } catch {
            setStatus({ type: "error", message: "Failed to send OTP. Please try again." })
        } finally {
            setSendingOtp(false)
        }
    }

    // ── Save Changes ─────────────────────────────────────────────────
    const handleSave = async () => {
        if (!otpValue.trim()) {
            setStatus({ type: "error", message: "Please enter the verification code." })
            return
        }

        // Validate based on section
        if (editSection === "profile") {
            if (!editName.trim() || editName.trim().length < 2) {
                setStatus({ type: "error", message: "Name must be at least 2 characters." })
                return
            }
        }

        if (editSection === "password") {
            if (!currentPassword) {
                setStatus({ type: "error", message: "Please enter your current password." })
                return
            }
            if (newPassword.length < 8) {
                setStatus({ type: "error", message: "New password must be at least 8 characters." })
                return
            }
            if (newPassword !== confirmPassword) {
                setStatus({ type: "error", message: "New passwords don't match." })
                return
            }
        }

        setSaving(true)
        setStatus(null)

        try {
            const payload: Record<string, string> = { otp: otpValue.trim() }

            if (editSection === "profile") {
                payload.name = editName.trim()
                payload.phone = editPhone.trim()
            }

            if (editSection === "password") {
                payload.currentPassword = currentPassword
                payload.newPassword = newPassword
            }

            const res = await fetch("/api/account/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            })

            const data = await res.json()

            if (!res.ok) {
                setStatus({ type: "error", message: data.error })
                return
            }

            setStatus({ type: "success", message: data.message })
            setEditSection(null)
            setOtpSent(false)
            setOtpValue("")
            await refresh()
        } catch {
            setStatus({ type: "error", message: "Something went wrong. Please try again." })
        } finally {
            setSaving(false)
        }
    }

    // ── Loading ──────────────────────────────────────────────────────
    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-sm text-slate-500">Loading account...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-1 flex-col gap-8 p-6 sm:p-10 max-w-4xl mx-auto w-full">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                    Account Settings
                </h1>
                <p className="text-slate-500 mt-1">
                    Manage your profile, credentials, and security.
                </p>
            </div>

            {/* Status Toast */}
            {status && (
                <StatusMessage
                    type={status.type}
                    message={status.message}
                    onDismiss={() => setStatus(null)}
                />
            )}

            {/* ─── Profile Overview ───────────────────────────────────── */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-6 pb-4">
                    <div className="flex items-center gap-2">
                        <User className="size-4 text-primary" />
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                            Profile Information
                        </h2>
                    </div>
                    {editSection !== "profile" && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit("profile")}
                            className="gap-1.5 text-xs font-semibold"
                        >
                            <Pencil className="size-3" />
                            Edit
                        </Button>
                    )}
                </div>
                <Separator />

                {editSection === "profile" ? (
                    /* ── Edit Profile Form ─────────────────────────────── */
                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Full Name
                                </Label>
                                <Input
                                    id="edit-name"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Enter your full name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-phone" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Phone Number
                                </Label>
                                <Input
                                    id="edit-phone"
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    placeholder="+91 9876543210"
                                />
                            </div>
                        </div>

                        {/* OTP Section */}
                        <OtpVerificationBlock
                            otpSent={otpSent}
                            otpValue={otpValue}
                            setOtpValue={setOtpValue}
                            sendingOtp={sendingOtp}
                            saving={saving}
                            otpTimer={otpTimer}
                            onSendOtp={handleSendOtp}
                            onSave={handleSave}
                            onCancel={cancelEdit}
                        />
                    </div>
                ) : (
                    /* ── Read-only Profile ─────────────────────────────── */
                    <div className="px-6 divide-y divide-slate-100">
                        <InfoRow
                            icon={<User className="size-4" />}
                            label="Full Name"
                            value={user.name}
                        />
                        <InfoRow
                            icon={<Mail className="size-4" />}
                            label="Email Address"
                            value={user.email}
                            badge={
                                user.isVerified ? (
                                    <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                                        <ShieldCheck className="size-3" />
                                        Verified
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold">
                                        <AlertCircle className="size-3" />
                                        Unverified
                                    </Badge>
                                )
                            }
                        />
                        <InfoRow
                            icon={<Phone className="size-4" />}
                            label="Phone Number"
                            value={user.phone || "Not provided"}
                        />
                        <InfoRow
                            icon={<Shield className="size-4" />}
                            label="Role"
                            value={ROLE_LABELS[user.role] ?? user.role}
                        />
                        <InfoRow
                            icon={<Calendar className="size-4" />}
                            label="Member Since"
                            value={new Date(user.createdAt).toLocaleDateString("en-IN", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                            })}
                        />
                    </div>
                )}
            </section>

            {/* ─── Change Password ────────────────────────────────────── */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-6 pb-4">
                    <div className="flex items-center gap-2">
                        <KeyRound className="size-4 text-primary" />
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                            Password & Security
                        </h2>
                    </div>
                    {editSection !== "password" && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit("password")}
                            className="gap-1.5 text-xs font-semibold"
                        >
                            <Pencil className="size-3" />
                            Change Password
                        </Button>
                    )}
                </div>
                <Separator />

                {editSection === "password" ? (
                    /* ── Password Form ─────────────────────────────────── */
                    <div className="p-6 space-y-5">
                        <div className="space-y-4">
                            {/* Current Password */}
                            <div className="space-y-2">
                                <Label htmlFor="current-pw" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Current Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="current-pw"
                                        type={showCurrentPw ? "text" : "password"}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter your current password"
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showCurrentPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="new-pw" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        New Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="new-pw"
                                            type={showNewPw ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Min. 8 characters"
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPw(!showNewPw)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showNewPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-pw" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Confirm New Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="confirm-pw"
                                            type={showConfirmPw ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter new password"
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPw(!showConfirmPw)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showConfirmPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Password Strength Indicator */}
                            {newPassword && (
                                <PasswordStrength password={newPassword} />
                            )}
                        </div>

                        {/* OTP Section */}
                        <OtpVerificationBlock
                            otpSent={otpSent}
                            otpValue={otpValue}
                            setOtpValue={setOtpValue}
                            sendingOtp={sendingOtp}
                            saving={saving}
                            otpTimer={otpTimer}
                            onSendOtp={handleSendOtp}
                            onSave={handleSave}
                            onCancel={cancelEdit}
                        />
                    </div>
                ) : (
                    /* ── Read-only Security Info ───────────────────────── */
                    <div className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                <KeyRound className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900">Password</p>
                                <p className="text-xs text-slate-400">
                                    Last changed — <span className="font-medium">Unknown</span>
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* ─── Security Notice ─────────────────────────────────────── */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pb-4">
                <ShieldCheck className="size-4" />
                All account changes require email verification for your security.
            </div>
        </div>
    )
}


// ─── OTP Verification Block ──────────────────────────────────────────
function OtpVerificationBlock({
    otpSent,
    otpValue,
    setOtpValue,
    sendingOtp,
    saving,
    otpTimer,
    onSendOtp,
    onSave,
    onCancel,
}: {
    otpSent: boolean
    otpValue: string
    setOtpValue: (v: string) => void
    sendingOtp: boolean
    saving: boolean
    otpTimer: { seconds: number; isActive: boolean; start: (d?: number) => void }
    onSendOtp: () => void
    onSave: () => void
    onCancel: () => void
}) {
    return (
        <div className="space-y-4 pt-2">
            <Separator />

            {!otpSent ? (
                /* Step 1: Request OTP */
                <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-start gap-3">
                        <Mail className="size-5 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">Email Verification Required</p>
                            <p className="text-xs text-slate-500 mt-1">
                                To protect your account, we&apos;ll send a 6-digit code to your registered email.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                        <Button
                            onClick={onSendOtp}
                            disabled={sendingOtp}
                            className="gap-1.5 font-bold cursor-pointer"
                        >
                            {sendingOtp ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Send className="size-4" />
                            )}
                            {sendingOtp ? "Sending..." : "Send Verification Code"}
                        </Button>
                        <Button variant="ghost" onClick={onCancel} className="text-slate-500 font-semibold cursor-pointer">
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                /* Step 2: Enter OTP & Save */
                <div className="space-y-4">
                    <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-100">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="size-5 text-emerald-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-emerald-800">Code Sent!</p>
                                <p className="text-xs text-emerald-600 mt-0.5">
                                    Check your inbox for the 6-digit verification code.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="otp-input" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Verification Code
                        </Label>
                        <div className="flex items-center gap-3">
                            <Input
                                id="otp-input"
                                value={otpValue}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "").slice(0, 6)
                                    setOtpValue(val)
                                }}
                                placeholder="000000"
                                maxLength={6}
                                className="font-mono text-lg tracking-[0.3em] text-center max-w-[200px]"
                                autoFocus
                            />
                            <button
                                onClick={onSendOtp}
                                disabled={sendingOtp || otpTimer.isActive}
                                className="text-xs font-semibold text-primary hover:text-blue-700 disabled:text-slate-400 transition-colors flex items-center gap-1 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                            >
                                {otpTimer.isActive ? (
                                    <>
                                        <Clock className="size-3" />
                                        Resend in {otpTimer.seconds}s
                                    </>
                                ) : (
                                    "Resend Code"
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <Button
                            onClick={onSave}
                            disabled={saving || otpValue.length < 6}
                            className="gap-1.5 font-bold cursor-pointer"
                        >
                            {saving ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="size-4" />
                            )}
                            {saving ? "Saving..." : "Verify & Save Changes"}
                        </Button>
                        <Button variant="ghost" onClick={onCancel} className="text-slate-500 font-semibold cursor-pointer">
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}


// ─── Password Strength Indicator ─────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
    const checks = [
        { label: "8+ characters", met: password.length >= 8 },
        { label: "Uppercase letter", met: /[A-Z]/.test(password) },
        { label: "Lowercase letter", met: /[a-z]/.test(password) },
        { label: "Number", met: /[0-9]/.test(password) },
        { label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
    ]
    const score = checks.filter((c) => c.met).length
    const strengthLabel =
        score <= 1 ? "Weak" : score <= 2 ? "Fair" : score <= 3 ? "Good" : score <= 4 ? "Strong" : "Excellent"
    const strengthColor =
        score <= 1
            ? "bg-red-500"
            : score <= 2
                ? "bg-orange-500"
                : score <= 3
                    ? "bg-amber-500"
                    : score <= 4
                        ? "bg-blue-500"
                        : "bg-emerald-500"

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
                        style={{ width: `${(score / 5) * 100}%` }}
                    />
                </div>
                <span className="text-xs font-semibold text-slate-500">{strengthLabel}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
                {checks.map((check) => (
                    <span
                        key={check.label}
                        className={`text-xs flex items-center gap-1 ${check.met ? "text-emerald-600" : "text-slate-400"}`}
                    >
                        {check.met ? <CheckCircle2 className="size-3" /> : <div className="size-3 rounded-full border border-slate-300" />}
                        {check.label}
                    </span>
                ))}
            </div>
        </div>
    )
}
