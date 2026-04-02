// ==============================
// File: charity.js
// Purpose: Allow users to select a charity to support (10% of winnings donated)
// ==============================

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Navbar from "../components/Navbar"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"

export default function Charity() {
  // Available charity options
  const charities = [
    { id: 1, name: "Helping Hands", desc: "Support education for kids" },
    { id: 2, name: "Green Earth", desc: "Plant trees and save nature" },
    { id: 3, name: "Health First", desc: "Medical support for needy" },
  ]

  // Store currently selected charity ID
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  // Track subscription status
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [subscription, setSubscription] = useState(null)

  const router = useRouter()
  const { user } = useAuth()

  // Check subscription when component mounts
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    checkSubscription()
  }, [user])

  // Function: checkSubscription
  // Purpose: Verify user has active subscription to select charity
  const checkSubscription = async () => {
    // Fetch latest subscription
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    // No subscription found
    if (!sub) {
      setHasActiveSubscription(false)
      setSubscription(null)
      setLoading(false)
      return
    }

    // Check if subscription is active and not expired
    if (sub.status === "active") {
      const now = new Date()
      const endDate = new Date(sub.end_date)

      // Check if subscription has expired
      if (now > endDate) {
        // Update expired status in database
        await supabase
          .from("subscriptions")
          .update({ status: "expired" })
          .eq("id", sub.id)

        setSubscription({ ...sub, status: "expired" })
        setHasActiveSubscription(false)
      } else {
        setSubscription(sub)
        setHasActiveSubscription(true)
      }
    } else {
      setSubscription(sub)
      setHasActiveSubscription(false)
    }

    setLoading(false)

    // Load user's saved charity if subscription is active
    if (sub?.status === "active" || (sub && new Date(sub.end_date) > new Date())) {
      fetchCharity()
    }
  }

  // Function: fetchCharity
  // Purpose: Get user's previously selected charity
  const fetchCharity = async () => {
    const { data } = await supabase
      .from("user_charities")
      .select("charity_id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (data) setSelected(data.charity_id)
  }

  // Function: handleSelect
  // Purpose: Save or update user's charity selection
  const handleSelect = async (charityId) => {
    if (saving) return
    setSaving(true)

    try {
      // Check if user already has a charity selection
      const { data: existing } = await supabase
        .from("user_charities")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (existing) {
        // Update existing selection
        await supabase
          .from("user_charities")
          .update({ charity_id: charityId })
          .eq("user_id", user.id)
      } else {
        // Create new charity selection with 10% donation
        await supabase.from("user_charities").insert({
          user_id: user.id,
          charity_id: charityId,
          donation_percent: 10
        })
      }

      setSelected(charityId)

    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // Reusable card component
  const Card = ({ children }) => (
    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
      {children}
    </div>
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

  // Subscription required message
  if (!hasActiveSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <Navbar />
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-64px)]">
          <Card>
            <h2 className="text-2xl font-bold mb-4 tracking-wide">
              {subscription ? `Subscription: ${subscription.status}` : "No Subscription"}
            </h2>
            <p className="text-gray-400 mb-6">
              You need an active subscription to select a charity.
            </p>
            {/* Redirect to subscription page */}
            <button
              onClick={() => router.push("/subscribe")}
              className="bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold rounded-xl px-5 py-2 hover:scale-105 transition-transform"
            >
              {subscription ? "Renew Subscription" : "Subscribe Now"}
            </button>
          </Card>
        </div>
      </div>
    )
  }

  // Main charity selection page
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Navbar />
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 tracking-wide">Select Charity</h1>

        {/* Display charity options as selectable cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {charities.map((c) => (
            <div
              key={c.id}
              onClick={() => handleSelect(c.id)}
              className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                selected === c.id
                  ? "border-2 border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20"
                  : "bg-slate-800/60 backdrop-blur-md border border-slate-700 shadow-lg hover:shadow-xl"
              }`}
            >
              <h2 className="text-xl font-semibold mb-2">{c.name}</h2>
              <p className="text-gray-400">{c.desc}</p>
              {/* Show selected indicator */}
              {selected === c.id && (
                <div className="mt-4 flex items-center gap-2 text-green-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-semibold">Selected</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Show confirmation when charity is selected */}
        {selected && (
          <div className="mt-8 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
            <p className="text-green-400 font-semibold">
              Selected: {charities.find(c => c.id === selected)?.name}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}