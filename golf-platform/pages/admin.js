// ==============================
// File: admin.js
// Purpose: Admin dashboard to manage users, subscriptions, scores, charities, winners, and verifications
// ==============================

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Navbar from "../components/Navbar"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"

export default function Admin() {
  // Store various data for admin view
  const [users, setUsers] = useState([])
  const [scores, setScores] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [charities, setCharities] = useState([])
  const [winners, setWinners] = useState([])
  const [draws, setDraws] = useState([])
  const [verifications, setVerifications] = useState([])
  const [loading, setLoading] = useState(true)
  // Store user's role (admin/user)
  const [userRole, setUserRole] = useState(null)
  // Track which tab is currently active
  const [activeTab, setActiveTab] = useState("users")

  const router = useRouter()
  const { user } = useAuth()

  // Check admin role when component mounts
  useEffect(() => {
    if (!user) return
    checkAdminRole()
  }, [user])

  // Function: checkAdminRole
  // Purpose: Verify user has admin role before allowing access
  const checkAdminRole = async () => {
    try {
      // Get current authentication session
      const { data: { session } } = await supabase.auth.getSession()
      
      // Redirect to login if no session
      if (!session) {
        router.push("/admin-login")
        return
      }

      // Fetch user's profile to check role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle()

      // Default to user role if not set
      const role = profile?.role || "user"
      setUserRole(role)

      // Redirect if not admin
      if (role !== "admin") {
        router.push("/admin-login")
        return
      }

      // Load all admin data
      fetchData()
    } catch (err) {
      console.error("Error checking role:", err)
      router.push("/admin-login")
    }
  }

  // Function: fetchData
  // Purpose: Load all data needed for admin dashboard
  const fetchData = async () => {
    try {
      // Fetch all data in parallel for better performance
      const [usersRes, scoresRes, subsRes, charitiesRes, winnersRes, drawsRes, verifRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("scores").select("*").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
        supabase.from("charities").select("*"),
        supabase.from("winnings").select("*").order("created_at", { ascending: false }),
        supabase.from("draws").select("*").order("created_at", { ascending: false }),
        supabase.from("winner_verifications").select("*").order("created_at", { ascending: false })
      ])

      // Update state with fetched data
      setUsers(usersRes.data || [])
      setScores(scoresRes.data || [])
      setSubscriptions(subsRes.data || [])
      setCharities(charitiesRes.data || [])
      setWinners(winnersRes.data || [])
      setDraws(drawsRes.data || [])
      setVerifications(verifRes.data || [])
    } catch (err) {
      console.error("Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }

  // Function: deleteScore
  // Purpose: Remove a score from database
  const deleteScore = async (scoreId) => {
    if (!confirm("Delete this score?")) return
    try {
      await supabase.from("scores").delete().eq("id", scoreId)
      // Update local state to remove deleted score
      setScores(scores.filter(s => s.id !== scoreId))
    } catch (err) {
      console.error("Error deleting score:", err)
    }
  }

  // Function: updateSubscriptionStatus
  // Purpose: Activate or expire a subscription
  const updateSubscriptionStatus = async (subId, newStatus) => {
    try {
      // Update in database
      await supabase
        .from("subscriptions")
        .update({ status: newStatus })
        .eq("id", subId)
      
      // Update local state
      setSubscriptions(subscriptions.map(s => 
        s.id === subId ? { ...s, status: newStatus } : s
      ))
      alert(`Subscription ${newStatus}!`)
    } catch (err) {
      console.error("Error updating status:", err)
    }
  }

  // Function: markWinnerAsPaid
  // Purpose: Mark winner's payout as paid
  const markWinnerAsPaid = async (winnerId) => {
    try {
      // Update payout status in database
      await supabase
        .from("winnings")
        .update({ payout_status: "paid" })
        .eq("id", winnerId)
      
      // Update local state
      setWinners(winners.map(w => 
        w.id === winnerId ? { ...w, payout_status: "paid" } : w
      ))
    } catch (err) {
      console.error("Error marking as paid:", err)
    }
  }

  // Function: addCharity
  // Purpose: Create new charity in database
  const addCharity = async () => {
    const name = prompt("Enter charity name:")
    if (!name) return
    
    const desc = prompt("Enter charity description:") || ""
    
    try {
      await supabase.from("charities").insert({ name, description: desc })
      fetchData()
      alert("Charity added!")
    } catch (err) {
      console.error("Error adding charity:", err)
    }
  }

  // Function: deleteCharity
  // Purpose: Remove charity from database
  const deleteCharity = async (charityId) => {
    if (!confirm("Delete this charity?")) return
    try {
      await supabase.from("charities").delete().eq("id", charityId)
      // Update local state
      setCharities(charities.filter(c => c.id !== charityId))
    } catch (err) {
      console.error("Error deleting charity:", err)
    }
  }

  // Function: updateVerificationStatus
  // Purpose: Approve or reject winner verification
  const updateVerificationStatus = async (verifId, newStatus) => {
    try {
      // Update verification status in database
      await supabase
        .from("winner_verifications")
        .update({ status: newStatus })
        .eq("id", verifId)
      
      // Update local state
      setVerifications(verifications.map(v => 
        v.id === verifId ? { ...v, status: newStatus } : v
      ))
      alert(`Verification ${newStatus}!`)
    } catch (err) {
      console.error("Error updating verification:", err)
    }
  }

  // Function: runMonthlyDraw
  // Purpose: Generate random winning numbers for monthly draw
  const runMonthlyDraw = async () => {
    // Generate 5 unique random numbers between 1-45
    const numbers = []
    while (numbers.length < 5) {
      const num = Math.floor(Math.random() * 45) + 1
      if (!numbers.includes(num)) numbers.push(num)
    }
    
    try {
      // Save draw to database
      await supabase.from("draws").insert({
        numbers: numbers,
        created_at: new Date().toISOString()
      })
      alert(`Monthly draw complete! Numbers: ${numbers.join(", ")}`)
      fetchData()
    } catch (err) {
      console.error("Error running draw:", err)
    }
  }

  // Tab configuration
  const tabs = [
    { id: "users", label: "Users" },
    { id: "scores", label: "Scores" },
    { id: "subscriptions", label: "Subscriptions" },
    { id: "charities", label: "Charities" },
    { id: "winners", label: "Winners" },
    { id: "verifications", label: "Verifications" },
    { id: "analytics", label: "Analytics" }
  ]

  // Loading or not admin
  if (loading || userRole !== "admin") {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <Navbar />
        <p>Loading...</p>
      </div>
    )
  }

  // Main admin dashboard
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <Navbar />
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Button to run monthly draw */}
      <div className="mb-6">
        <button
          onClick={runMonthlyDraw}
          className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded"
        >
          Run Monthly Draw
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              activeTab === tab.id ? "bg-green-500" : "bg-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="bg-slate-800 p-4 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">All Users ({users.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Gender</th>
                  <th className="text-left p-2">City</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-700">
                    <td className="p-2">{u.name || "N/A"}</td>
                    <td className="p-2">{u.role || "user"}</td>
                    <td className="p-2">{u.gender || "N/A"}</td>
                    <td className="p-2">{u.city || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="text-gray-400 p-4">No users yet</p>}
          </div>
        </div>
      )}

      {/* Scores Tab */}
      {activeTab === "scores" && (
        <div className="bg-slate-800 p-4 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">All Scores ({scores.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-2">User ID</th>
                  <th className="text-left p-2">Score</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {scores.slice(0, 50).map(s => (
                  <tr key={s.id} className="border-b border-slate-700">
                    <td className="p-2">{s.user_id?.slice(0, 12)}...</td>
                    <td className="p-2">{s.score}</td>
                    <td className="p-2">{s.score_date || "N/A"}</td>
                    <td className="p-2">
                      <button
                        onClick={() => deleteScore(s.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {scores.length === 0 && <p className="text-gray-400 p-4">No scores yet</p>}
          </div>
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === "subscriptions" && (
        <div className="bg-slate-800 p-4 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">All Subscriptions ({subscriptions.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-2">User ID</th>
                  <th className="text-left p-2">Plan</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Expires</th>
                  <th className="text-left p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.slice(0, 50).map(s => (
                  <tr key={s.id} className="border-b border-slate-700">
                    <td className="p-2">{s.user_id?.slice(0, 12)}...</td>
                    <td className="p-2 capitalize">{s.plan}</td>
                    <td className="p-2">
                      <span className={s.status === "active" ? "text-green-400" : "text-red-400"}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-2">{new Date(s.end_date).toLocaleDateString()}</td>
                    <td className="p-2">
                      {s.status === "active" ? (
                        <button
                          onClick={() => updateSubscriptionStatus(s.id, "expired")}
                          className="text-yellow-400 hover:text-yellow-300"
                        >
                          Expire
                        </button>
                      ) : (
                        <button
                          onClick={() => updateSubscriptionStatus(s.id, "active")}
                          className="text-green-400 hover:text-green-300"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {subscriptions.length === 0 && <p className="text-gray-400 p-4">No subscriptions</p>}
          </div>
        </div>
      )}

      {/* Charities Tab */}
      {activeTab === "charities" && (
        <div className="bg-slate-800 p-4 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Charities ({charities.length})</h2>
            <button
              onClick={addCharity}
              className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-sm"
            >
              Add Charity
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {charities.map(c => (
              <div key={c.id} className="bg-slate-700 p-4 rounded-xl">
                <h3 className="font-semibold">{c.name}</h3>
                <p className="text-gray-400 text-sm">{c.description}</p>
                <button
                  onClick={() => deleteCharity(c.id)}
                  className="text-red-400 text-sm mt-2"
                >
                  Delete
                </button>
              </div>
            ))}
            {charities.length === 0 && <p className="text-gray-400">No charities yet</p>}
          </div>
        </div>
      )}

      {/* Winners Tab */}
      {activeTab === "winners" && (
        <div className="bg-slate-800 p-4 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Winners ({winners.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-2">User ID</th>
                  <th className="text-left p-2">Matches</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Payout</th>
                  <th className="text-left p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {winners.map(w => (
                  <tr key={w.id} className="border-b border-slate-700">
                    <td className="p-2">{w.user_id?.slice(0, 12)}...</td>
                    <td className="p-2">{w.matches}</td>
                    <td className="p-2">₹{w.amount}</td>
                    <td className="p-2">
                      <span className={w.payout_status === "paid" ? "text-green-400" : "text-yellow-400"}>
                        {w.payout_status || "pending"}
                      </span>
                    </td>
                    <td className="p-2">
                      {(w.payout_status !== "paid") && (
                        <button
                          onClick={() => markWinnerAsPaid(w.id)}
                          className="text-green-400 hover:text-green-300"
                        >
                          Mark as Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {winners.length === 0 && <p className="text-gray-400 p-4">No winners yet</p>}
          </div>
        </div>
      )}

      {/* Verifications Tab */}
      {activeTab === "verifications" && (
        <div className="bg-slate-800 p-4 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Winner Verifications ({verifications.length})</h2>
          <div className="space-y-4">
            {verifications.map(v => (
              <div key={v.id} className="bg-slate-700 p-4 rounded-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm">User ID: {v.user_id?.slice(0, 12)}...</p>
                    <p className="text-sm">Winning ID: {v.winning_id?.slice(0, 12)}...</p>
                    <p className="text-sm">Status: 
                      <span className={
                        v.status === "approved" ? "text-green-400" :
                        v.status === "rejected" ? "text-red-400" :
                        "text-yellow-400"
                      }>
                        {" "} {v.status}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      Submitted: {new Date(v.created_at).toLocaleString()}
                    </p>
                    {v.proof_url && (
                      <a 
                        href={v.proof_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 text-sm hover:underline"
                      >
                        View Proof
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {v.status === "pending" && (
                      <>
                        <button
                          onClick={() => updateVerificationStatus(v.id, "approved")}
                          className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateVerificationStatus(v.id, "rejected")}
                          className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {verifications.length === 0 && <p className="text-gray-400 p-4">No verifications yet</p>}
          </div>
        </div>
      )}

      {/* Analytics Tab - Display key metrics */}
      {activeTab === "analytics" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800 p-6 rounded-xl">
            <h3 className="text-gray-400">Total Users</h3>
            <p className="text-3xl font-bold">{users.length}</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl">
            <h3 className="text-gray-400">Active Subscriptions</h3>
            <p className="text-3xl font-bold">
              {subscriptions.filter(s => s.status === "active").length}
            </p>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl">
            <h3 className="text-gray-400">Total Prize Pool</h3>
            <p className="text-3xl font-bold">
              ₹{winners.reduce((sum, w) => sum + (w.amount || 0), 0)}
            </p>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl">
            <h3 className="text-gray-400">Total Draws</h3>
            <p className="text-3xl font-bold">{draws.length}</p>
          </div>
        </div>
      )}
    </div>
  )
}