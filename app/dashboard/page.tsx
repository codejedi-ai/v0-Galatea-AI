"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useAuth } from "@/contexts/simple-auth-context"
import { getUserAvatarUrl } from "@/lib/utils/avatar"
import { Users, MessageCircle, Heart, TrendingUp } from "lucide-react"

export default function Dashboard() {
  const { currentUser, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !currentUser) {
      router.push("/sign-in")
    }
  }, [currentUser, loading, router, mounted])

  useEffect(() => {
    if (currentUser) {
      getUserAvatarUrl(currentUser)
        .then(url => {
          setAvatarUrl(url)
        })
        .catch(err => {
          // Silently handle errors - just show placeholder
          console.debug('Error fetching avatar:', err)
          setAvatarUrl(null)
        })
    } else {
      setAvatarUrl(null)
    }
  }, [currentUser])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <LoadingSpinner size="xlarge" text="Loading your dashboard..." />
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <main className="container mx-auto px-6 pt-24 pb-16">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="mb-6">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Profile"
                width={96}
                height={96}
                className="w-24 h-24 rounded-full border-4 border-teal-500 mx-auto mb-4 object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-teal-500 flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-black" />
              </div>
            )}
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Welcome back, {" "}
            <span className="text-teal-400">
              {currentUser.user_metadata?.full_name || 
               currentUser.user_metadata?.name || 
               currentUser.user_metadata?.preferred_username ||
               currentUser.email?.split('@')[0]}
            </span>!
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Your AI companions are waiting for you. Ready to continue your relationships?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gray-900 border-gray-700 hover:border-teal-500 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Heart className="text-teal-500" size={24} />
                Find Love
              </CardTitle>
              <CardDescription>
                Browse AI companions and find your perfect romantic partner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full bg-teal-500 hover:bg-teal-400 text-black">
                <Link href="/start-swiping">
                  Find Your Match
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700 hover:border-teal-500 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MessageCircle className="text-teal-500" size={24} />
                Your Relationships
              </CardTitle>
              <CardDescription>
                Continue intimate conversations with your AI partners
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-black">
                <Link href="/chats">
                  View Chats
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700 hover:border-teal-500 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="text-teal-500" size={24} />
                Profile Settings
              </CardTitle>
              <CardDescription>
                Customize your profile and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-black">
                <Link href="/profile">
                  Edit Profile
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center p-6 bg-gray-900 rounded-lg border border-gray-700">
            <TrendingUp className="text-teal-500 mx-auto mb-2" size={32} />
            <div className="text-2xl font-bold text-white">0</div>
            <div className="text-gray-400 text-sm">Total Matches</div>
          </div>
          
          <div className="text-center p-6 bg-gray-900 rounded-lg border border-gray-700">
            <MessageCircle className="text-teal-500 mx-auto mb-2" size={32} />
            <div className="text-2xl font-bold text-white">0</div>
            <div className="text-gray-400 text-sm">Active Chats</div>
          </div>
          
          <div className="text-center p-6 bg-gray-900 rounded-lg border border-gray-700">
            <Heart className="text-teal-500 mx-auto mb-2" size={32} />
            <div className="text-2xl font-bold text-white">0</div>
            <div className="text-gray-400 text-sm">Likes Given</div>
          </div>
          
          <div className="text-center p-6 bg-gray-900 rounded-lg border border-gray-700">
            <Users className="text-teal-500 mx-auto mb-2" size={32} />
            <div className="text-2xl font-bold text-white">New</div>
            <div className="text-gray-400 text-sm">Member</div>
          </div>
        </div>
      </main>
    </div>
  )
}
