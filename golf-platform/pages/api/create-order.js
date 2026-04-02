export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { amount, plan, userId } = req.body

  const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.log("📦 MOCK ORDER:", { amount, plan, userId })
    return res.status(200).json({
      id: "mock_order_" + Date.now(),
      amount: amount * 100,
      currency: "INR",
      mock: true
    })
  }

  try {
    const razorpay = require("razorpay")
    
    const instance = new razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    })

    const order = await instance.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${userId}_${Date.now()}`,
      notes: {
        plan,
        userId
      }
    })

    return res.status(200).json(order)
  } catch (err) {
    console.error("Razorpay error:", err)
    return res.status(500).json({ error: "Failed to create order" })
  }
}