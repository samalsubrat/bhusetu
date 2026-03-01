import Razorpay from "razorpay"
import { NextResponse } from "next/server"

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: Request) {
    try {
        const { amount, currency = "INR", receipt } = await req.json()

        const order = await razorpay.orders.create({
            amount: amount * 100, // convert to paise
            currency,
            receipt: receipt ?? `receipt_${Date.now()}`,
        })

        return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency })
    } catch (error) {
        console.error("Razorpay order creation failed:", error)
        return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
    }
}
