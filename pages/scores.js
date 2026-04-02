// ==============================
// File: scores.js
// Purpose: Allow users to add and view their golf scores (1-45)
// ==============================

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Navbar from "../components/Navbar"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"

export default function Scores() {
  // Store input score value
  const [score, setScore] = useState("")
  // Store selected date
  const [date, setDate] = useState("")
  // Store list of user's scores
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  // Track subscription status
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscription, setSubscription] = useState(null)

  const router = useRouter()
  const { user } = useAuth()

  // Check subscription when user logs in
  useEffect(() => {
    if (user) {
      checkSubscription()
    } else {
      setLoading(false)
    }
  }, [user])

  // Function: checkSubscription
  // Purpose: Verify user has active subscription to access scores
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
    setSubscription(data)
    const isValid = data.status === "active" && new Date(data.end_date) > new Date()
    setIsSubscribed(isValid)

    // Load scores if subscription is valid
    if (isValid) {
      fetchScores()
    } else {
      setLoading(false)
    }
  }

  // Function: fetchScores
  // Purpose: Get all scores for the current user
  const fetchScores = async () => {
    const { data } = await supabase
      .from("scores")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (data) setScores(data)
    setLoading(false)
  }

  // Function: addScore
  // Purpose: Validate and save new score to database
  const addScore = async () => {
    // Prevent empty submissions
    if (!score || !date || processing) return

    // Convert score to number
    const scoreNum = parseInt(score)
    
    // Validate score range (1-45 for golf game)
    if (scoreNum < 1 || scoreNum > 45) {
      alert("Score must be between 1 and 45")
      return
    }

    setProcessing(true)

    try {
      // Get existing scores in chronological order
      const { data: existing } = await supabase
        .from("scores")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })

      // Keep only last 5 scores - delete oldest if needed
      if (existing && existing.length >= 5) {
        await supabase
          .from("scores")
          .delete()
          .eq("id", existing[0].id)
      }

      // Insert new score into database
      await supabase.from("scores").insert({
        user_id: user.id,
        score: scoreNum,
        score_date: date
      })

      // Clear form inputs
      setScore("")
      setDate("")
      
      // Refresh score list
      fetchScores()

    } catch (err) {
      console.error("Error:", err)
    } finally {
      setProcessing(false)
    }
  }

  // Reusable card component
  const Card = ({ children, title }) => (
    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
      {title && <h2 className="text-xl font-semibold mb-4 tracking-wide">{title}</h2>}
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

  // Show subscription required message
  if (!isSubscribed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <Navbar />
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-64px)]">
          <Card>
            <h2 className="text-2xl font-bold mb-4 tracking-wide">
              {subscription ? `Subscription: ${subscription.status}` : "No Subscription"}
            </h2>
            <p className="text-gray-400 mb-6">
              Subscribe to add scores.
            </p>
            {/* Redirect to subscription page */}
            <button
              onClick={() => router.push("/subscribe")}
              className="bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold rounded-xl px-5 py-2 hover:scale-105 transition-transform"
            >
              {subscription ? "Renew" : "Subscribe Now"}
            </button>
          </Card>
        </div>
      </div>
    )
  }

  // Main scores page for active subscribers
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Navbar />
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 tracking-wide">Score Management</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Form to add new score */}
          <Card title="Add Score">
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Score (1-45)</label>
                <input
                  type="number"
                  placeholder="Enter score"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Submit button */}
              <button
                onClick={addScore}
                disabled={processing}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold rounded-xl px-5 py-2 hover:scale-105 transition-transform disabled:opacity-50"
              >
                {processing ? "Saving..." : "Add Score"}
              </button>
            </div>
          </Card>

          {/* Display user's score history */}
          <Card title="Your Scores">
            {scores.length > 0 ? (
              <div className="space-y-2">
                {scores.map((s) => (
                  <div key={s.id} className="bg-slate-700/50 p-3 rounded-xl flex justify-between items-center">
                    <span className="text-lg font-semibold">{s.score}</span>
                    <span className="text-gray-400">{s.score_date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No scores yet</p>
            )}
            {scores.length > 0 && (
              <p className="text-gray-400 text-sm mt-4">Last {scores.length} scores (max 5)</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}