"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useAuth } from "@/contexts/simple-auth-context"
import { getUserAvatarUrl } from "@/lib/utils/avatar"
import { getUserBannerUrl } from "@/lib/utils/banner"
import { uploadBanner, deleteBanner } from "@/lib/storage"
import { Users, MessageCircle, Heart, TrendingUp, Camera, Trash2, Image as ImageIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function Dashboard() {
  const { currentUser, loading, refreshUser } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [bannerTimestamp, setBannerTimestamp] = useState<number>(Date.now())
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [showChangeBannerDialog, setShowChangeBannerDialog] = useState(false)
  const bannerFileInputRef = useRef<HTMLInputElement>(null)

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

      getUserBannerUrl(currentUser)
        .then(url => {
          setBannerUrl(url)
        })
        .catch(err => {
          console.debug('Error fetching banner:', err)
          setBannerUrl(null)
        })
    } else {
      setAvatarUrl(null)
      setBannerUrl(null)
    }
  }, [currentUser])

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !currentUser) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB")
      return
    }

    setIsUploadingBanner(true)

    try {
      // Upload and get the new banner URL immediately
      const newBannerUrl = await uploadBanner(currentUser.id, file)

      // Update local state immediately for real-time display
      setBannerUrl(newBannerUrl)
      setBannerTimestamp(Date.now()) // Force image reload with cache-busting

      // Refresh user data in background to sync with auth context
      refreshUser().catch(err => console.error("Error refreshing user:", err))
    } catch (err: any) {
      alert(err.message || "Failed to upload banner")
    } finally {
      setIsUploadingBanner(false)
      // Reset file input
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = ""
      }
    }
  }

  const handleBannerDelete = async () => {
    if (!currentUser) return

    setIsUploadingBanner(true)

    try {
      // Delete banner using userId
      await deleteBanner(currentUser.id)

      // Clear local banner URL immediately
      setBannerUrl(null)
      setBannerTimestamp(Date.now()) // Force image reload

      // Refresh user data in background
      refreshUser().catch(err => console.error("Error refreshing user:", err))
    } catch (err: any) {
      alert(err.message || "Failed to remove banner")
    } finally {
      setIsUploadingBanner(false)
    }
  }

  const handleBannerClick = () => {
    setShowChangeBannerDialog(true)
  }

  const handleBannerUploadClick = () => {
    setShowChangeBannerDialog(false)
    bannerFileInputRef.current?.click()
  }

  const handleBannerDeleteClick = async () => {
    setShowChangeBannerDialog(false)
    await handleBannerDelete()
  }

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
        {/* Banner Section */}
        <div className="relative w-full mb-8 -mx-6 px-6">
          <div
            className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden bg-gray-900 cursor-pointer group"
            onClick={handleBannerClick}
          >
            {bannerUrl ? (
              <Image
                key={`${bannerUrl}-${bannerTimestamp}`}
                src={`${bannerUrl}?t=${bannerTimestamp}`}
                alt="Banner"
                fill
                className="object-cover"
                sizes="100vw"
                unoptimized
                priority
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-r from-gray-800 to-gray-900">
                <ImageIcon className="h-16 w-16 text-gray-600" />
              </div>
            )}

            {/* Hover overlay */}
            {!isUploadingBanner && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-center">
                  <Camera className="h-12 w-12 text-white mx-auto mb-2" />
                  <p className="text-white text-sm">Change Banner</p>
                </div>
              </div>
            )}

            {/* Loading overlay */}
            {isUploadingBanner && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <LoadingSpinner size="medium" />
              </div>
            )}
          </div>

          {/* Hidden file input for banner */}
          <input
            ref={bannerFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleBannerUpload}
            className="hidden"
          />
        </div>

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

      {/* Change Banner Dialog */}
      <Dialog open={showChangeBannerDialog} onOpenChange={setShowChangeBannerDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Change Banner</DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose an option to update your banner
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              type="button"
              onClick={handleBannerUploadClick}
              disabled={isUploadingBanner}
              className="w-full bg-teal-500 text-black hover:bg-teal-400 justify-start"
            >
              <Camera className="h-4 w-4 mr-2" />
              {bannerUrl ? "Upload New Banner" : "Upload Banner"}
            </Button>
            {bannerUrl && (
              <Button
                type="button"
                onClick={handleBannerDeleteClick}
                disabled={isUploadingBanner}
                variant="outline"
                className="w-full border-red-500 text-red-400 hover:bg-red-500/10 hover:text-red-300 justify-start"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Current Banner
              </Button>
            )}
            <Button
              type="button"
              onClick={() => setShowChangeBannerDialog(false)}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
