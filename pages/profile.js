// ==============================
// File: profile.js
// Purpose: User profile management - view/edit personal details, manage subscription, view winnings
// ==============================

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Navbar from "../components/Navbar"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"

export default function Profile() {
  // Store subscription data
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  
  // Store user profile data
  const [profile, setProfile] = useState(null)
  // Track if user is editing profile
  const [isEditing, setIsEditing] = useState(false)
  // Form fields for profile
  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    age: "",
    phone: "",
    city: ""
  })

  // Store user's winning records
  const [myWinnings, setMyWinnings] = useState([])
  // Track if upload is in progress
  const [uploading, setUploading] = useState(false)

  const router = useRouter()
  const { user } = useAuth()

  // Load data when user logs in
  useEffect(() => {
    if (!user) {
      router.push("/")
      return
    }
    fetchData()
  }, [user])

  // Function: fetchData
  // Purpose: Load subscription, profile, and winnings data
  const fetchData = async () => {
    try {
      // Fetch subscription from database
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      // Check if subscription needs expiration update
      if (subData) {
        if (subData.status === "active") {
          const now = new Date()
          const endDate = new Date(subData.end_date)
          // Mark as expired if past end date
          if (now > endDate) {
            await supabase
              .from("subscriptions")
              .update({ status: "expired" })
              .eq("id", subData.id)
            subData.status = "expired"
          }
        }
        setSubscription(subData)
      }

      // Fetch user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      if (profileData) {
        setProfile(profileData)
        // Populate form with existing data
        setFormData({
          name: profileData.name || "",
          gender: profileData.gender || "",
          age: profileData.age || "",
          phone: profileData.phone || "",
          city: profileData.city || ""
        })
      }

      // Fetch user's winning records
      const { data: winningsData } = await supabase
        .from("winnings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (winningsData) {
        setMyWinnings(winningsData)
      }
    } catch (err) {
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Enable editing mode
  const handleEdit = () => {
    setIsEditing(true)
  }

  // Cancel editing and reset form
  const handleCancel = () => {
    setIsEditing(false)
    // Reset form to original values
    if (profile) {
      setFormData({
        name: profile.name || "",
        gender: profile.gender || "",
        age: profile.age || "",
        phone: profile.phone || "",
        city: profile.city || ""
      })
    }
  }

  // Function: handleSave
  // Purpose: Save profile changes to database
  const handleSave = async () => {
    if (processing) return
    setProcessing(true)

    try {
      // Prepare profile data object
      const profileData = {
        user_id: user.id,
        name: formData.name || null,
        gender: formData.gender || null,
        age: formData.age ? parseInt(formData.age) : null,
        phone: formData.phone || null,
        city: formData.city || null
      }

      // Upsert - insert if new, update if exists
      const { data, error } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "user_id" })
        .select()
        .single()

      if (error) {
        alert("Failed to save: " + error.message)
      } else {
        setProfile(data)
        setIsEditing(false)
        alert("Profile updated successfully!")
      }
    } catch (err) {
      alert("Something went wrong")
    } finally {
      setProcessing(false)
    }
  }

  // Update form field
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Function: handleUpgrade
  // Purpose: Upgrade subscription from monthly to yearly
  const handleUpgrade = async () => {
    if (!subscription || subscription.plan === "yearly" || processing) return

    const confirmed = confirm("Upgrade to yearly plan for ₹1,000?")
    if (!confirmed) return

    setProcessing(true)

    try {
      const now = new Date()
      const endDate = new Date()
      // Add 1 year to current date
      endDate.setFullYear(now.getFullYear() + 1)

      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan: "yearly",
          amount: 1000,
          start_date: now.toISOString(),
          end_date: endDate.toISOString()
        })
        .eq("user_id", user.id)

      if (error) {
        alert("Failed to upgrade: " + error.message)
      } else {
        alert("Subscription upgraded to yearly!")
        fetchData()
      }
    } catch (err) {
      alert("Failed to upgrade subscription")
    } finally {
      setProcessing(false)
    }
  }

  // Function: handleCancelSub
  // Purpose: Cancel active subscription
  const handleCancelSub = async () => {
    if (!subscription || subscription.status !== "active" || processing) return

    const confirmed = confirm("Are you sure you want to cancel your subscription?")
    if (!confirmed) return

    setProcessing(true)

    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("user_id", user.id)

      if (error) {
        alert("Failed to cancel: " + error.message)
      } else {
        alert("Subscription cancelled!")
        fetchData()
      }
    } catch (err) {
      alert("Failed to cancel subscription")
    } finally {
      setProcessing(false)
    }
  }

  // Function: handleSubmitVerification
  // Purpose: Allow winners to upload proof for verification
  const handleSubmitVerification = async (winningId) => {
    // Create hidden file input
    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.accept = "image/*"
    
    fileInput.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      setUploading(true)
      try {
        // Generate unique filename
        const fileExt = file.name.split(".").pop()
        const fileName = `${user.id}/${winningId}-${Date.now()}.${fileExt}`
        
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("verification-proofs")
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("verification-proofs")
          .getPublicUrl(fileName)

        // Create verification record
        const { error: insertError } = await supabase
          .from("winner_verifications")
          .insert({
            user_id: user.id,
            winning_id: winningId,
            proof_url: urlData.publicUrl,
            status: "pending"
          })

        if (insertError) throw insertError

        alert("Verification submitted!")
        fetchData()
      } catch (err) {
        console.error("Verification error:", err)
        alert("Failed to submit verification")
      } finally {
        setUploading(false)
      }
    }

    fileInput.click()
  }

  // Reusable card component
  const Card = ({ children, title }) => (
    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
      {title && <h2 className="text-xl font-semibold mb-4 tracking-wide">{title}</h2>}
      {children}
    </div>
  )

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <Navbar />
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-64px)]">
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Main profile page
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Navbar />

      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 tracking-wide">My Profile</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Personal Details Card */}
          <Card title="Personal Details">
            <div className="flex justify-between items-center mb-4">
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl px-4 py-2 transition-all"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {/* Show form when editing */}
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleChange("gender", e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleChange("age", e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter your age"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter city"
                  />
                </div>

                {/* Save/Cancel buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={processing}
                    className="bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold rounded-xl px-5 py-2 hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    {processing ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={processing}
                    className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl px-5 py-2 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Display profile data
              <div className="space-y-2">
                <p className="text-gray-400">Email: <span className="text-white">{user?.email}</span></p>
                <p className="text-gray-400">Name: <span className="text-white font-semibold">{profile?.name || "Not set"}</span></p>
                <p className="text-gray-400">Gender: <span className="text-white">{profile?.gender || "Not set"}</span></p>
                <p className="text-gray-400">Age: <span className="text-white">{profile?.age || "Not set"}</span></p>
                <p className="text-gray-400">Phone: <span className="text-white">{profile?.phone || "Not set"}</span></p>
                <p className="text-gray-400">City: <span className="text-white">{profile?.city || "Not set"}</span></p>
              </div>
            )}
          </Card>

          {/* Subscription Details Card */}
          <Card title="Subscription Details">
            {subscription ? (
              <div className="space-y-3">
                <p className="text-gray-400">Plan: <span className="text-white text-lg font-semibold capitalize">{subscription.plan}</span></p>
                <p className="text-gray-400">Status: <span className={`text-lg ${
                  subscription.status === "active" ? "text-green-400 font-semibold" : "text-yellow-400"
                }`}>{subscription.status}</span></p>
                <p className="text-gray-400">Amount Paid: <span className="text-white">₹{subscription.amount}</span></p>
                <p className="text-gray-400">Expires: <span className="text-white">{new Date(subscription.end_date).toLocaleDateString()}</span></p>

                {/* Show upgrade/cancel buttons for active subscriptions */}
                {subscription.status === "active" && (
                  <div className="flex flex-col gap-3 mt-6">
                    {subscription.plan === "monthly" && (
                      <button
                        onClick={handleUpgrade}
                        disabled={processing}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl px-5 py-2 hover:scale-105 transition-transform disabled:opacity-50"
                      >
                        {processing ? "Processing..." : "Upgrade to Yearly"}
                      </button>
                    )}
                    <button
                      onClick={handleCancelSub}
                      disabled={processing}
                      className="bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl px-5 py-2 hover:scale-105 transition-transform disabled:opacity-50"
                    >
                      {processing ? "Processing..." : "Cancel Subscription"}
                    </button>
                  </div>
                )}

                {/* Show subscribe button for expired/cancelled */}
                {(subscription.status === "cancelled" || subscription.status === "expired") && (
                  <button
                    onClick={() => router.push("/subscribe")}
                    className="mt-4 bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold rounded-xl px-5 py-2 hover:scale-105 transition-transform"
                  >
                    Subscribe Now
                  </button>
                )}
              </div>
            ) : (
              // No subscription found
              <div>
                <p className="text-gray-400 mb-4">No subscription found</p>
                <button
                  onClick={() => router.push("/subscribe")}
                  className="bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold rounded-xl px-5 py-2 hover:scale-105 transition-transform"
                >
                  Subscribe Now
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* Show winnings section if user has wins */}
        {myWinnings.length > 0 && (
          <div className="mt-6">
            <Card title="My Winnings">
              <div className="space-y-3">
                {myWinnings.map(win => (
                  <div key={win.id} className="bg-slate-700/50 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-semibold">Matches: {win.matches}</p>
                      <p className="text-green-400 font-bold">₹{win.amount}</p>
                      <p className="text-sm text-gray-400">Status: {win.status || "unpaid"}</p>
                    </div>
                    {/* Show submit proof button for paid winners */}
                    {win.status === "paid" && (
                      <button
                        onClick={() => handleSubmitVerification(win.id)}
                        disabled={uploading}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl px-4 py-2 hover:scale-105 transition-transform disabled:opacity-50"
                      >
                        {uploading ? "Uploading..." : "Submit Proof"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}