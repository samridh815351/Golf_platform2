// ==============================
// File: dashboard.js
// Purpose: Main user dashboard showing subscription status, scores, charity, and winnings
// ==============================

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Navbar from "../components/Navbar"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"

export default function Dashboard() {
  // Store user's score history
  const [scores, setScores] = useState([])
  // Store selected charity
  const [charity, setCharity] = useState(null)
  // Store total winnings amount
  const [winnings, setWinnings] = useState(0)
  // Store subscription details
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  // Track if user has active subscription
  const [isSubscribed, setIsSubscribed] = useState(false)

  const router = useRouter()
  const { user } = useAuth()

  // List of available charities
  const charityList = [
    { id: 1, name: "Helping Hands" },
    { id: 2, name: "Green Earth" },
    { id: 3, name: "Health First" },
  ]

  // Check subscription status when user logs in
  useEffect(() => {
    if (user) {
      checkSubscription()
    }
  }, [user])

  // Function: checkSubscription
  // Purpose: Verify if user has active subscription
  const checkSubscription = async () => {
    // Fetch subscription from database
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    // No subscription found
    if (!data) {
      setIsSubscribed(false)
      setSubscription(null)
      setLoading(false)
      return
    }

    // Check if subscription is active and not expired
    const isValid = data.status === "active" && new Date(data.end_date) > new Date()

    setSubscription(data)
    setIsSubscribed(isValid)
    setLoading(false)

    // Load user data if subscription is valid
    if (isValid) {
      fetchData()
    }
  }

  // Function: fetchData
  // Purpose: Load scores, charity, and winnings for the user
  const fetchData = async () => {
    try {
      // Fetch user's scores
      const { data: scoreData } = await supabase
        .from("scores")
        .select("score")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)

      setScores(scoreData?.map(s => s.score) || [])

      // Fetch user's selected charity
      const { data: userCharity } = await supabase
        .from("user_charities")
        .select("charity_id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (userCharity) {
        const found = charityList.find(c => c.id === userCharity.charity_id)
        setCharity(found || null)
      }

      // Fetch all winnings and calculate total
      const { data: winningsData } = await supabase
        .from("winnings")
        .select("amount")
        .eq("user_id", user.id)

      const total = winningsData?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0
      setWinnings(total)
    } catch (err) {
      console.error("Fetch error:", err)
    }
  }

  // Reusable card component for dashboard sections
  const Card = ({ title, children }) => (
    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
      <h3 className="text-gray-400 text-sm mb-3 tracking-wide">{title}</h3>
      {children}
    </div>
  )

  // Show loading while checking authentication
  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <Navbar />
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-64px)]">
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to subscription page if no active subscription
  if (!isSubscribed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <Navbar />
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-2xl p-8 shadow-lg max-w-md text-center hover:shadow-xl transition-all">
            <h2 className="text-2xl font-bold mb-4 tracking-wide">
              {subscription ? `Subscription: ${subscription.status}` : "No Subscription"}
            </h2>
            <p className="text-gray-400 mb-6">
              Subscribe to access all features.
            </p>
            {/* Navigate to subscription page */}
            <button
              onClick={() => router.push("/subscribe")}
              className="bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold rounded-xl px-5 py-2 hover:scale-105 transition-transform"
            >
              {subscription ? "Renew" : "Subscribe Now"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main dashboard view for subscribed users
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Navbar />
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 tracking-wide">Dashboard</h1>

        {/* Grid layout showing key metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card title="Your Subscription">
            {subscription && (
              <div className="space-y-2">
                <p className="text-gray-400">Plan: <span className="text-white font-semibold capitalize">{subscription.plan}</span></p>
                <p className="text-gray-400">Status: <span className="text-green-400 font-semibold">{subscription.status}</span></p>
                <p className="text-gray-400">Expires: {new Date(subscription.end_date).toLocaleDateString()}</p>
              </div>
            )}
          </Card>

          <Card title="Last 5 Scores">
            <p className="text-xl font-semibold">
              {scores.length > 0 ? scores.join(", ") : "No scores yet"}
            </p>
          </Card>

          <Card title="Selected Charity">
            <p className="text-xl font-semibold text-purple-400">
              {charity ? charity.name : "Not selected"}
            </p>
          </Card>

          <Card title="Total Winnings">
            <p className="text-3xl font-bold text-green-400">₹{winnings.toLocaleString()}</p>
          </Card>
        </div>

        {/* Navigation buttons to other pages */}
        <div className="mt-8 flex flex-wrap gap-4">
          <button
            onClick={() => router.push("/scores")}
            className="bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold rounded-xl px-5 py-2 hover:scale-105 transition-transform"
          >
            Add Scores
          </button>
          <button
            onClick={() => router.push("/charity")}
            className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl px-5 py-2 transition-all"
          >
            Select Charity
          </button>
          <button
            onClick={() => router.push("/draw")}
            className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl px-5 py-2 transition-all"
          >
            Run Draw
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl px-5 py-2 transition-all"
          >
            Profile
          </button>
        </div>
      </div>
    </div>
  )
}