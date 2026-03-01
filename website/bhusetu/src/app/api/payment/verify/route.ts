import crypto from "crypto"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

        const body = `${razorpay_order_id}|${razorpay_payment_id}`
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
            .update(body)
            .digest("hex")

        if (expectedSignature !== razorpay_signature) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
        }

        return NextResponse.json({ success: true, paymentId: razorpay_payment_id })
    } catch (error) {
        console.error("Payment verification failed:", error)
        return NextResponse.json({ error: "Verification failed" }, { status: 500 })
    }
}
