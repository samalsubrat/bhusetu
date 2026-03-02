import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value

    if (token) {
      // Delete the session from DB
      await prisma.session.deleteMany({ where: { token } })
    }

    const response = NextResponse.json({ message: "Signed out." })

    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error("[LOGOUT]", error)
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    )
  }
}
