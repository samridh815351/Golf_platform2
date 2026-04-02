export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, plan } = req.body

  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET

  if (!RAZORPAY_KEY_SECRET) {
    console.log("📦 MOCK VERIFICATION:", {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      userId,
      plan
    })
    return res.status(200).json({ verified: true, mock: true })
  }

  try {
    const crypto = require("crypto")

    const generatedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex")

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ verified: false, error: "Invalid signature" })
    }

    return res.status(200).json({ verified: true })
  } catch (err) {
    console.error("Verification error:", err)
    return res.status(500).json({ error: "Verification failed" })
  }
}