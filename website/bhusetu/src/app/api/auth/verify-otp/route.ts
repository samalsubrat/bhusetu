import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyOtp, signToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { userId, otp } = await req.json()

    if (!userId || !otp) {
      return NextResponse.json(
        { error: "User ID and OTP are required." },
        { status: 400 }
      )
    }

    // ── Find the latest unused OTP for this user ────────────────────────────
    const otpRecord = await prisma.otp.findFirst({
      where: {
        userId,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    })

    if (!otpRecord) {
      return NextResponse.json(
        { error: "OTP expired or not found. Please request a new one." },
        { status: 400 }
      )
    }

    const valid = await verifyOtp(otp, otpRecord.code)
    if (!valid) {
      return NextResponse.json({ error: "Invalid OTP." }, { status: 400 })
    }

    // ── Mark OTP as used & verify user ──────────────────────────────────────
    await prisma.$transaction([
      prisma.otp.update({
        where: { id: otpRecord.id },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { isVerified: true },
      }),
    ])

    // ── Issue session ───────────────────────────────────────────────────────
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, role: true, name: true },
    })

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours

    await prisma.session.create({
      data: { userId: user.id, token, expiresAt },
    })

    // ── Set HTTP-only cookie ────────────────────────────────────────────────
    const response = NextResponse.json({
      message: "Email verified successfully.",
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 2 * 60 * 60, // 2 hours in seconds
    })

    return response
  } catch (error) {
    console.error("[VERIFY_OTP]", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
