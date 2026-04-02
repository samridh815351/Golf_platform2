import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Navbar from "../../components/Navbar"
import { supabase } from "../../lib/supabase"

export default function Analytics() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalPrizePool: 0,
    totalCharity: 0,
    totalWinners: 0,
    totalDraws: 0
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAdminAndFetch()
  }, [])

  const checkAdminAndFetch = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push("/admin-login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (profile?.role !== "admin") {
        router.push("/admin-login")
        return
      }

      fetchAnalytics()
    } catch (err) {
      console.error("Error:", err)
      router.push("/admin-login")
    }
  }

  const fetchAnalytics = async () => {
    try {
      const [usersRes, subsRes, winningsRes, charityRes, winnersCountRes, drawsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("winnings").select("amount"),
        supabase.from("charities").select("amount"),
        supabase.from("winnings").select("id", { count: "exact", head: true }),
        supabase.from("draws").select("id", { count: "exact", head: true })
      ])

      const totalPrize = winningsRes.data?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0
      const totalCharity = charityRes.data?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0

      setStats({
        totalUsers: usersRes.count || 0,
        activeSubscriptions: subsRes.count || 0,
        totalPrizePool: totalPrize,
        totalCharity: totalCharity,
        totalWinners: winnersCountRes.count || 0,
        totalDraws: drawsRes.count || 0
      })
    } catch (err) {
      console.error("Analytics error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <Navbar />
        <p>Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <Navbar />
      
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-slate-800 p-6 rounded-xl">
            <div className="text-gray-400 text-sm mb-2">Total Users</div>
            <div className="text-4xl font-bold text-blue-400">{stats.totalUsers}</div>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl">
            <div className="text-gray-400 text-sm mb-2">Active Subscriptions</div>
            <div className="text-4xl font-bold text-green-400">{stats.activeSubscriptions}</div>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl">
            <div className="text-gray-400 text-sm mb-2">Total Prize Pool</div>
            <div className="text-4xl font-bold text-yellow-400">₹{stats.totalPrizePool.toLocaleString()}</div>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl">
            <div className="text-gray-400 text-sm mb-2">Total Charity</div>
            <div className="text-4xl font-bold text-purple-400">₹{stats.totalCharity.toLocaleString()}</div>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl">
            <div className="text-gray-400 text-sm mb-2">Total Winners</div>
            <div className="text-4xl font-bold text-orange-400">{stats.totalWinners}</div>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl">
            <div className="text-gray-400 text-sm mb-2">Total Draws</div>
            <div className="text-4xl font-bold text-cyan-400">{stats.totalDraws}</div>
          </div>
        </div>

        <div className="mt-8 bg-slate-800 p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Platform Summary</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-700 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Conversion Rate</p>
              <p className="text-2xl font-bold">
                {stats.totalUsers > 0 
                  ? ((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1) 
                  : 0}%
              </p>
            </div>
            <div className="bg-slate-700 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Avg Prize per Winner</p>
              <p className="text-2xl font-bold">
                ₹{stats.totalWinners > 0 
                  ? Math.round(stats.totalPrizePool / stats.totalWinners).toLocaleString() 
                  : 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}