import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // ── Verify JWT ──────────────────────────────────────────────────────────
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // ── Verify session still exists in DB ───────────────────────────────────
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            isVerified: true,
            createdAt: true,
          },
        },
      },
    })

    if (!session || session.expiresAt < new Date()) {
      // Clean up expired session
      if (session) {
        await prisma.session.delete({ where: { id: session.id } })
      }
      const response = NextResponse.json({ user: null }, { status: 401 })
      response.cookies.set("token", "", { maxAge: 0, path: "/" })
      return response
    }

    return NextResponse.json({ user: session.user })
  } catch (error) {
    console.error("[ME]", error)
    return NextResponse.json({ user: null }, { status: 500 })
  }
}
