import { useRouter } from "next/router"
import { useAuth } from "../contexts/AuthContext"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function Navbar() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (user) {
      checkAdminRole()
    }
  }, [user])

  const checkAdminRole = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()

    setIsAdmin(profile?.role === "admin")
  }

  const handleLogout = async () => {
    await signOut()
    if (router.pathname === "/admin") {
      router.push("/admin-login")
    } else {
      router.push("/")
    }
  }

  const isActive = (path) => router.pathname === path

  return (
    <nav className="backdrop-blur-md bg-slate-900/70 border-b border-slate-700 p-4 flex gap-2 items-center flex-wrap sticky top-0 z-50">
      <div className="flex gap-1">
        <NavBtn path="/dashboard" label="Dashboard" active={isActive("/dashboard")} />
        <NavBtn path="/scores" label="Scores" active={isActive("/scores")} />
        <NavBtn path="/charity" label="Charity" active={isActive("/charity")} />
        <NavBtn path="/draw" label="Draw" active={isActive("/draw")} />
        <NavBtn path="/leaderboard" label="Leaderboard" active={isActive("/leaderboard")} />
        <NavBtn path="/profile" label="Profile" active={isActive("/profile")} />
      </div>
      {isAdmin && (
        <div className="flex gap-1 ml-4 pl-4 border-l border-slate-700">
          <NavBtn path="/admin" label="Admin" active={isActive("/admin")} highlight="text-yellow-400" />
          <NavBtn path="/admin/analytics" label="Analytics" active={isActive("/admin/analytics")} highlight="text-cyan-400" />
        </div>
      )}
      <button 
        onClick={handleLogout} 
        className="ml-auto text-red-400 hover:text-red-300 px-4 py-2 rounded-xl hover:bg-slate-800 transition-all"
      >
        Logout
      </button>
    </nav>
  )
}

function NavBtn({ path, label, active, highlight }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(path)}
      className={`px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 ${
        active 
          ? "bg-green-500/20 text-green-400 font-semibold" 
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      } ${highlight || ""}`}
    >
      {label}
    </button>
  )
}