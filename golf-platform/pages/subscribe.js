// ==============================
// File: subscribe.js
// Purpose: Handle user subscription - create/renew monthly or yearly plans
// ==============================

import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import Navbar from "../components/Navbar"
import { supabase } from "../lib/supabase"
import { useAuth } from "../contexts/AuthContext"

export default function Subscribe() {
  const router = useRouter()
  const { user } = useAuth()
  // Track if subscription process is running
  const [loading, setLoading] = useState(false)
  // Store current subscription data
  const [subscription, setSubscription] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true)

  // Fetch current subscription on mount
  useEffect(() => {
    if (user) {
      fetchSubscription()
    } else {
      setInitialLoading(false)
    }
  }, [user])

  // Function: fetchSubscription
  // Purpose: Get user's current subscription status from database
  const fetchSubscription = async () => {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    setSubscription(data)
    setInitialLoading(false)
  }

  // Function: handleSubscribe
  // Purpose: Create or update subscription based on selected plan
  const handleSubscribe = async (plan) => {
    if (!user || loading) return
    setLoading(true)

    try {
      const startDate = new Date()
      let endDate = new Date()

      // Calculate end date based on plan
      if (plan === "monthly") {
        endDate.setDate(startDate.getDate() + 30)
      } else if (plan === "yearly") {
        endDate.setFullYear(startDate.getFullYear() + 1)
      }

      // Set price based on plan
      const amount = plan === "monthly" ? 100 : 1000

      // Check if subscription already exists
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

      let result

      if (existing) {
        // Update existing subscription
        result = await supabase
          .from("subscriptions")
          .update({
            plan,
            status: "active",
            amount,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
          })
          .eq("user_id", user.id)
      } else {
        // Create new subscription
        result = await supabase
          .from("subscriptions")
          .insert({
            user_id: user.id,
            plan,
            status: "active",
            amount,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
          })
      }

      if (result.error) {
        alert("Error: " + result.error.message)
      } else {
        alert("Subscription Activated Successfully!")
        // Redirect to dashboard after successful subscription
        router.push("/dashboard")
      }
    } catch (err) {
      console.error("Error:", err)
      alert("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  // Reusable card component
  const Card = ({ children }) => (
    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
      {children}
    </div>
  )

  // Loading state
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <Navbar />
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-64px)]">
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Check if subscription is active and not expired
  const isActive = subscription && 
    subscription.status === "active" && 
    new Date(subscription.end_date) > new Date()

  // Show current subscription status for active users
  if (isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <Navbar />
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-64px)]">
          <Card>
            <div className="text-center">
              {/* Success icon */}
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold mb-4 tracking-wide text-green-400">You're Subscribed!</h1>
              {/* Subscription details */}
              <div className="bg-slate-700/50 rounded-xl p-6 mb-6 space-y-3">
                <p className="text-gray-400">Plan: <span className="text-white font-semibold capitalize">{subscription.plan}</span></p>
                <p className="text-gray-400">Status: <span className="text-green-400 font-semibold">{subscription.status}</span></p>
                <p className="text-gray-400">Expires: <span className="text-white">{new Date(subscription.end_date).toLocaleDateString()}</span></p>
              </div>
              {/* Navigate to dashboard */}
              <button
                onClick={() => router.push("/dashboard")}
                className="bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold rounded-xl px-8 py-3 hover:scale-105 transition-transform"
              >
                Go to Dashboard
              </button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Subscription plans selection
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Navbar />
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-center tracking-wide">Choose Your Plan</h1>
        <p className="text-gray-400 text-center mb-8">Unlock all features and start winning!</p>

        {/* Show current expired/cancelled subscription status */}
        {subscription && !isActive && (
          <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-xl p-4 mb-8 max-w-md mx-auto text-center">
            <p className="text-yellow-400">Current: {subscription.status}</p>
            <p className="text-gray-400">Subscribe again to access all features.</p>
          </div>
        )}

        {/* Plan options - Monthly and Yearly */}
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Monthly plan button */}
          <button
            onClick={() => handleSubscribe("monthly")}
            disabled={loading}
            className="bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-2xl p-8 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-left disabled:opacity-50"
          >
            <div className="text-2xl font-bold mb-2">Monthly</div>
            <div className="text-4xl font-bold text-green-400 mb-2">₹100</div>
            <div className="text-gray-400">30 days access</div>
          </button>

          {/* Yearly plan button (highlighted as best value) */}
          <button
            onClick={() => handleSubscribe("yearly")}
            disabled={loading}
            className="bg-slate-800/60 backdrop-blur-md border-2 border-blue-500 rounded-2xl p-8 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-left disabled:opacity-50 relative overflow-hidden"
          >
            {/* Best value badge */}
            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-3 py-1 rounded-bl-xl font-semibold">
              BEST VALUE
            </div>
            <div className="text-2xl font-bold mb-2">Yearly</div>
            <div className="text-4xl font-bold text-blue-400 mb-2">₹1,000</div>
            <div className="text-gray-400">365 days access</div>
          </button>
        </div>

        {/* Loading indicator */}
        {loading && (
          <p className="text-center mt-6 text-gray-400 animate-pulse">Activating subscription...</p>
        )}
      </div>
    </div>
  )
}