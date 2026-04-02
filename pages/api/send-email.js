export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { type, email, name, data: emailData } = req.body

  const templates = {
    subscription_activated: {
      subject: "Subscription Activated - Golf Platform",
      body: `Hi ${name || "User"},\n\nYour subscription has been activated successfully!\n\nPlan: ${emailData?.plan}\nValid until: ${emailData?.endDate}\n\nHappy golfing!\n- Golf Platform Team`
    },
    monthly_draw: {
      subject: "Monthly Draw Results - Golf Platform",
      body: `Hi ${name || "User"},\n\nThe monthly draw results are out!\n\nWinning Numbers: ${emailData?.numbers?.join(", ")}\n\nCheck your dashboard to see if you're a winner!\n\n- Golf Platform Team`
    },
    winning_notification: {
      subject: "Congratulations! You Won! - Golf Platform",
      body: `Hi ${name || "User"},\n\nCongratulations! You won ₹${emailData?.amount}!\n\nMatches: ${emailData?.matches}\nAmount: ₹${emailData?.amount}\n\nVisit your profile to submit verification proof.\n\n- Golf Platform Team`
    }
  }

  const template = templates[type]
  if (!template) {
    return res.status(400).json({ error: "Invalid email type" })
  }

  const MOCK_MODE = !process.env.SMTP_HOST

  if (MOCK_MODE) {
    console.log("📧 MOCK EMAIL:", {
      to: email,
      subject: template.subject,
      body: template.body
    })
    return res.status(200).json({ success: true, mode: "mock" })
  }

  try {
    const nodemailer = require("nodemailer")
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: template.subject,
      text: template.body
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error("Email error:", err)
    return res.status(500).json({ error: "Failed to send email" })
  }
}