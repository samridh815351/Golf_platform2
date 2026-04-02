import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { useAuth } from "../contexts/AuthContext"

export default function Home() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { user, signIn, signUp } = useAuth()

  useEffect(() => {
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setError("Check your email for confirmation link")
      }
      router.push("/dashboard")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
      <div className="bg-slate-800 p-8 rounded-2xl w-80 shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? "Login" : "Sign Up"}
        </h2>

        {error && (
          <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-3 p-2 rounded bg-slate-700"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-4 p-2 rounded bg-slate-700"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded disabled:opacity-50"
          >
            {loading ? "Loading..." : isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        <p
          className="text-sm mt-4 text-center cursor-pointer text-gray-400"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin
            ? "Create new account"
            : "Already have an account?"}
        </p>
      </div>
    </div>
  )
}
