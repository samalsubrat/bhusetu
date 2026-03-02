"server only"

import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface SendOtpEmailParams {
  to: string
  otp: string
  name: string
}

export async function sendOtpEmail({ to, otp, name }: SendOtpEmailParams) {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f7f9fb; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #2563eb; color: white; padding: 8px 12px; border-radius: 8px; font-weight: 700; font-size: 18px;">
          BhuSetu
        </div>
      </div>
      <div style="background: white; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="margin: 0 0 8px; color: #1e293b; font-size: 20px;">Verify your email</h2>
        <p style="color: #64748b; margin: 0 0 24px; font-size: 14px;">
          Hi ${name}, use the code below to verify your BhuSetu account. It expires in <strong>10 minutes</strong>.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; background: #f1f5f9; border: 2px dashed #2563eb; color: #1e293b; font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 16px 32px; border-radius: 8px;">
            ${otp}
          </span>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
          If you did not request this, please ignore this email.
        </p>
      </div>
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 16px;">
        &copy; ${new Date().getFullYear()} BhuSetu &mdash; National Land Registry
      </p>
    </div>
  `

  await transporter.sendMail({
    from: `"BhuSetu" <${process.env.SMTP_USER}>`,
    to,
    subject: `${otp} — BhuSetu Email Verification`,
    html,
  })
}
