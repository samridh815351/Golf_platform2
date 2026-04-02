import { useState } from "react"
import { useRouter } from "next/router"
import Navbar from "../components/Navbar"
import { supabase } from "../lib/supabase"

export default function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", authData.user.id)
        .maybeSingle()

      if (profileError) {
        await supabase.auth.signOut()
        setError("Error checking role")
        setLoading(false)
        return
      }

      if (profile?.role !== "admin") {
        await supabase.auth.signOut()
        setError("Access denied. Admin role required.")
        setLoading(false)
        return
      }

      router.push("/admin")
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-wide">Admin Login</h1>
            <p className="text-gray-400 text-sm mt-2">Enter your credentials to access admin panel</p>
          </div>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 p-4 rounded-xl mb-6">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-gray-400 text-sm ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 rounded-xl bg-slate-700 border border-slate-600 mt-1 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="admin@example.com"
                required
              />
            </div>
            
            <div>
              <label className="text-gray-400 text-sm ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 rounded-xl bg-slate-700 border border-slate-600 mt-1 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="••••••••"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:scale-105 transition-transform p-4 rounded-xl font-semibold shadow-lg"
            >
              {loading ? "Logging in..." : "Login as Admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}