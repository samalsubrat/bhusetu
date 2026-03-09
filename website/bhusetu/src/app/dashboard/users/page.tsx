"use client"

import { useEffect, useState } from "react"
import { useAuth, type AuthUser } from "@/hooks/use-auth"
import { ShieldAlert, Loader2, ShieldCheck, AlertCircle, ChevronDown, Check } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

const ROLE_LABELS: Record<string, string> = {
    CITIZEN: "Citizen",
    REVENUE_INSPECTOR: "Revenue Inspector",
    ADDITIONAL_TAHASILDAR: "Addl. Tahasildar",
    TAHASILDAR: "Tahasildar",
    COLLECTOR: "Collector",
    ADMIN: "Admin",
}

const ALL_ROLES = [
    "CITIZEN",
    "REVENUE_INSPECTOR",
    "ADDITIONAL_TAHASILDAR",
    "TAHASILDAR",
    "COLLECTOR",
    "ADMIN"
]

export default function UsersPage() {
    const { user: currentUser } = useAuth()
    const [users, setUsers] = useState<AuthUser[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/users", { credentials: "include" })
            if (!res.ok) throw new Error("Failed to load users")
            const data = await res.json()
            setUsers(data.users)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            // Optimistic update
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u))

            const res = await fetch(`/api/users/${userId}/role`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ role: newRole })
            })

            if (!res.ok) {
                throw new Error("Failed to update role")
            }
        } catch (err) {
            // Revert on error
            fetchUsers()
            alert("Failed to update role. Ensure you have the right permissions.")
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="size-8 animate-spin text-blue-600" />
                    <p className="text-sm text-slate-500">Loading user directory...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-6">
                <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 flex flex-col items-center max-w-sm text-center">
                    <ShieldAlert className="size-10 mb-2" />
                    <h2 className="font-bold text-lg">Access Denied</h2>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 sm:p-10 max-w-7xl mx-auto w-full space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                    User Management
                </h1>
                <p className="text-slate-500 mt-1">
                    Manage system users, their verification status, and assign roles.
                </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="p-4 pl-6">Name & Email</th>
                                <th className="p-4">Phone</th>
                                <th className="p-4">Member Since</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 pr-6">Role</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 pl-6">
                                        <div className="font-semibold text-slate-900">{u.name}</div>
                                        <div className="text-slate-500 text-xs mt-0.5">{u.email}</div>
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {u.phone || <span className="text-slate-400 italic">Not provided</span>}
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {new Date(u.createdAt).toLocaleDateString("en-IN", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric"
                                        })}
                                    </td>
                                    <td className="p-4">
                                        {u.isVerified ? (
                                            <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold whitespace-nowrap">
                                                <ShieldCheck className="size-3" />
                                                Verified
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold whitespace-nowrap">
                                                <AlertCircle className="size-3" />
                                                Unverified
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="p-4 pr-6">
                                        {/* Disable dropdown for self to prevent locking self out accidentally */}
                                        {u.id === currentUser?.id ? (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase tracking-widest text-[10px]">
                                                {ROLE_LABELS[u.role] ?? u.role} (You)
                                            </Badge>
                                        ) : (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="flex items-center justify-between w-full min-w-[150px] bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 transition-colors uppercase tracking-wider text-slate-700">
                                                    {ROLE_LABELS[u.role] ?? u.role}
                                                    <ChevronDown className="size-3 opacity-50" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-[180px]">
                                                    {ALL_ROLES.map((roleKey) => (
                                                        <DropdownMenuItem
                                                            key={roleKey}
                                                            onClick={() => handleRoleChange(u.id, roleKey)}
                                                            className="text-xs uppercase tracking-wider font-semibold cursor-pointer flex justify-between items-center"
                                                        >
                                                            {ROLE_LABELS[roleKey]}
                                                            {u.role === roleKey && <Check className="size-3 text-blue-600" />}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
