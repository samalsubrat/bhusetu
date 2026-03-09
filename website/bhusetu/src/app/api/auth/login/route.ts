import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPassword, signToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      )
    }

    // ── Find user ───────────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      )
    }

    // ── Check password ──────────────────────────────────────────────────────
    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      )
    }

    // ── Check email verified ────────────────────────────────────────────────
    if (!user.isVerified) {
      return NextResponse.json(
        {
          error: "Please verify your email before signing in.",
          userId: user.id,
          needsVerification: true,
        },
        { status: 403 }
      )
    }

    // ── Issue session ───────────────────────────────────────────────────────
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
    await prisma.session.create({
      data: { userId: user.id, token, expiresAt },
    })

    const response = NextResponse.json({
      message: "Signed in successfully.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 2 * 60 * 60, // 2 hours
    })

    return response
  } catch (error) {
    console.error("[LOGIN]", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
