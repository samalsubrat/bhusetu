"server only"

import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { type NextRequest } from "next/server"

const JWT_SECRET = process.env.JWT_SECRET!
const SALT_ROUNDS = 12

// ─── Password ────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string
  email: string
  role: string
}

export function signToken(payload: JwtPayload, expiresInSeconds = 7 * 24 * 60 * 60): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresInSeconds })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

// ─── OTP ─────────────────────────────────────────────────────────────────────

export function generateOtp(): string {
  // 6-digit numeric OTP
  return crypto.randomInt(100_000, 999_999).toString()
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, SALT_ROUNDS)
}

export async function verifyOtp(
  otp: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(otp, hash)
}

// ─── Session ────────────────────────────────────────────────────────────────

export function verifySession(req: NextRequest): JwtPayload | null {
  const token = req.cookies.get("token")?.value
  if (!token) return null
  return verifyToken(token)
}
