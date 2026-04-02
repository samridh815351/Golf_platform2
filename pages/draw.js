// ==============================
// File: draw.js
// Purpose: Monthly draw system - generates random winning numbers and calculates prizes based on matches
// ==============================

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Navbar from "../components/Navbar"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"

export default function Draw() {
  // Store winning numbers from draw
  const [drawNumbers, setDrawNumbers] = useState([])
  // Store user's current scores
  const [userScores, setUserScores] = useState([])
  // Store number of matches
  const [matches, setMatches] = useState(0)
  // Store calculated reward amount
  const [reward, setReward] = useState(0)
  const [loading, setLoading] = useState(true)
  // Track if draw is currently running
  const [running, setRunning] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscription, setSubscription] = useState(null)

  const router = useRouter()
  const { user } = useAuth()

  // Check subscription on mount
  useEffect(() => {
    if (user) {
      checkSubscription()
    } else {
      setLoading(false)
    }
  }, [user])

  // Function: checkSubscription
  // Purpose: Verify user has active subscription to participate in draw
  const checkSubscription = async () => {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!data) {
      setIsSubscribed(false)
      setSubscription(null)
      setLoading(false)
      return
    }

    setSubscription(data)
    // Check if subscription is active and not expired
    const isValid = data.status === "active" && new Date(data.end_date) > new Date()
    setIsSubscribed(isValid)

    if (isValid) {
      fetchScores()
    } else {
      setLoading(false)
    }
  }

  // Function: fetchScores
  // Purpose: Get user's current scores for draw matching
  const fetchScores = async () => {
    const { data, error } = await supabase
      .from("scores")
      .select("score")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)

    if (data) {
      setUserScores(data.map(s => s.score))
    }
    setLoading(false)
  }

  // Function: generateRandomNumbers
  // Purpose: Generate 5 unique random numbers between 1-45 for the draw
  const generateRandomNumbers = () => {
    let nums = []
    while (nums.length < 5) {
      let n = Math.floor(Math.random() * 45) + 1
      if (!nums.includes(n)) nums.push(n)
    }
    // Sort numbers in ascending order
    return nums.sort((a, b) => a - b)
  }

  // Function: generateDraw
  // Purpose: Run the monthly draw - generate numbers, calculate matches, determine prize
  const generateDraw = async () => {
    if (running) return
    setRunning(true)

    try {
      // Generate 5 random winning numbers
      const numbers = generateRandomNumbers()
      setDrawNumbers(numbers)

      // Calculate how many user scores match winning numbers
      const matchCount = userScores.filter(n => numbers.includes(n)).length
      setMatches(matchCount)

      // Prize distribution: total pool = ₹1000
      const totalPool = 1000
      let amount = 0

      // Calculate reward based on number of matches
      if (matchCount === 5) amount = totalPool * 0.4      // 5 matches = ₹400 (40%)
      else if (matchCount === 4) amount = totalPool * 0.35 // 4 matches = ₹350 (35%)
      else if (matchCount === 3) amount = totalPool * 0.25 // 3 matches = ₹250 (25%)

      setReward(amount)

      // Save draw record to database
      await supabase.from("draws").insert({
        user_id: user.id,
        numbers: numbers,
        matches: matchCount,
        reward: amount
      })

      // If user won, add to winnings table
      if (amount > 0) {
        await supabase.from("winnings").insert({
          user_id: user.id,
          matches: matchCount,
          amount: amount
        })
      }
    } catch (err) {
      console.error("Draw error:", err)
    } finally {
      setRunning(false)
    }
  }

  // Reusable card component
  const Card = ({ title, children }) => (
    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
      <h3 className="text-gray-400 text-sm mb-3 tracking-wide">{title}</h3>
      {children}
    </div>
  )

  // Number display component
  const NumberBox = ({ num, isWinning }) => (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg font-semibold text-lg ${
      isWinning 
        ? "bg-yellow-500 text-black shadow-lg" 
        : "bg-slate-700 text-white"
    }`}>
      {num}
    </span>
  )

  // Loading state
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

  // Subscription required
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
              Subscribe to participate in the draw.
            </p>
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

  // Main draw page
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Navbar />
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 tracking-wide">Monthly Draw</h1>

        {/* Check if user has scores to participate */}
        {userScores.length === 0 ? (
          <Card title="Participation">
            <p className="text-gray-400 mb-4">Add at least one score to participate in the draw.</p>
            <button
              onClick={() => router.push("/scores")}
              className="bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold rounded-xl px-5 py-2 hover:scale-105 transition-transform"
            >
              Add Scores
            </button>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Run Draw Button */}
            <div className="flex justify-center">
              <button
                onClick={generateDraw}
                disabled={running}
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-xl px-6 py-3 hover:scale-105 transition-transform disabled:opacity-50"
              >
                {running ? "Generating..." : "Run Draw"}
              </button>
            </div>

            {/* Show results after draw */}
            {drawNumbers.length > 0 && (
              <div className="grid md:grid-cols-2 gap-6">
                <Card title="Your Scores">
                  <div className="flex gap-2 flex-wrap">
                    {userScores.map((num, i) => (
                      <NumberBox 
                        key={i} 
                        num={num} 
                        isWinning={drawNumbers.includes(num)} 
                      />
                    ))}
                  </div>
                </Card>

                <Card title="Winning Numbers">
                  <div className="flex gap-2 flex-wrap">
                    {drawNumbers.map((num, i) => (
                      <NumberBox key={i} num={num} isWinning={true} />
                    ))}
                  </div>
                </Card>

                <Card title="Result">
                  <div className="text-center py-2">
                    <p className="text-gray-400 text-sm mb-2">Matches</p>
                    <p className="text-4xl font-bold">{matches}/5</p>
                  </div>
                </Card>

                <Card title="Prize">
                  <div className="text-center py-2">
                    {reward > 0 ? (
                      <>
                        <p className="text-gray-400 text-sm mb-2">You Won!</p>
                        <p className="text-4xl font-bold text-green-400">₹{reward}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-400 text-sm mb-2">No Reward</p>
                        <p className="text-sm text-gray-500">Minimum 3 matches required</p>
                      </>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}