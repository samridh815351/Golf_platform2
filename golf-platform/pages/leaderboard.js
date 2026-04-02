import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Navbar from "../components/Navbar"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      router.push("/")
      return
    }
    fetchLeaderboard()
  }, [user])

  const fetchLeaderboard = async () => {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .order("created_at", { ascending: false })

      if (!profiles || profiles.length === 0) {
        setLoading(false)
        return
      }

      const leaderboardData = await Promise.all(
        profiles.map(async (profile) => {
          const { data: scores } = await supabase
            .from("scores")
            .select("score")
            .eq("user_id", profile.user_id)
            .order("created_at", { ascending: false })
            .limit(5)

          const { data: winnings } = await supabase
            .from("winnings")
            .select("amount")
            .eq("user_id", profile.user_id)

          const totalScore = scores?.reduce((sum, s) => sum + (s.score || 0), 0) || 0
          const totalWinnings = winnings?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0

          return {
            userId: profile.user_id,
            name: profile.name || "Anonymous",
            totalScore,
            totalWinnings
          }
        })
      )

      leaderboardData.sort((a, b) => b.totalWinnings - a.totalWinnings)

      leaderboardData.forEach((entry, index) => {
        entry.rank = index + 1
      })

      setLeaderboard(leaderboardData)
    } catch (err) {
      console.error("Leaderboard error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <Navbar />
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <Navbar />

      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>

        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="p-4 text-left">Rank</th>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">Score (Last 5)</th>
                <th className="p-4 text-left">Total Winnings</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry.userId} className="border-t border-slate-700 hover:bg-slate-750">
                  <td className="p-4">
                    <span className={`font-bold ${
                      entry.rank === 1 ? "text-yellow-400" :
                      entry.rank === 2 ? "text-gray-300" :
                      entry.rank === 3 ? "text-amber-600" :
                      "text-white"
                    }`}>
                      #{entry.rank}
                    </span>
                  </td>
                  <td className="p-4">{entry.name}</td>
                  <td className="p-4">{entry.totalScore}</td>
                  <td className="p-4 text-green-400 font-semibold">₹{entry.totalWinnings}</td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-400">
                    No data yet. Submit scores to appear on leaderboard!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}