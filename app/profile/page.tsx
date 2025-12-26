"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navbar } from "@/components/navbar"
import { ProtectedRoute } from "@/components/protected-route"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useAuth } from "@/contexts/simple-auth-context"
import { uploadProfilePicture, deleteProfilePicture } from "@/lib/storage"
import { createClient } from "@/utils/supabase/client"
import { getUserAvatarUrl } from "@/lib/utils/avatar"
import { CheckCircleIcon, AlertCircleIcon, UserIcon, Camera, Trash2, Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function Profile() {
  const { currentUser, logout, refreshUser } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState(currentUser?.user_metadata?.display_name || "")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [error, setError] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null) // Local state for immediate updates
  const [avatarTimestamp, setAvatarTimestamp] = useState<number>(Date.now()) // For cache-busting
  const [showChangePictureDialog, setShowChangePictureDialog] = useState(false)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsLoading(true);

    try {
      // Update user metadata in Supabase
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName }
      })

      if (error) {
        throw error
      }

      setSuccessMessage("Profile updated successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !currentUser) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB")
      return
    }

    setIsUploadingImage(true)
    setError("")
    setSuccessMessage("")

    try {
      // Upload and get the new avatar URL immediately
      const newAvatarUrl = await uploadProfilePicture(currentUser.id, file)
      
      // Update local state immediately for real-time display
      setAvatarUrl(newAvatarUrl)
      setAvatarTimestamp(Date.now()) // Force image reload with cache-busting
      
      // Refresh user data in background to sync with auth context
      refreshUser().catch(err => console.error("Error refreshing user:", err))
      
      setSuccessMessage("Profile picture updated successfully!")
      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    } catch (err: any) {
      setError(err.message || "Failed to upload profile picture")
    } finally {
      setIsUploadingImage(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDeleteImage = async () => {
    if (!currentUser) return

    setIsUploadingImage(true)
    setError("")
    setSuccessMessage("")

    try {
      // Delete profile picture using userId
      await deleteProfilePicture(currentUser.id)
      
      // Clear local avatar URL immediately
      setAvatarUrl(null)
      setAvatarTimestamp(Date.now()) // Force image reload
      
      // Refresh user data in background
      refreshUser().catch(err => console.error("Error refreshing user:", err))
      
      setSuccessMessage("Profile picture removed successfully!")
      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    } catch (err: any) {
      setError(err.message || "Failed to remove profile picture")
    } finally {
      setIsUploadingImage(false)
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to log out");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleProfilePictureClick = () => {
    setShowChangePictureDialog(true)
  }

  const handleUploadClick = () => {
    setShowChangePictureDialog(false)
    triggerFileInput()
  }

  const handleDeleteClick = async () => {
    setShowChangePictureDialog(false)
    await handleDeleteImage()
  }

  // Update local avatar URL when currentUser changes (only if local state is null)
  useEffect(() => {
    if (currentUser && avatarUrl === null) {
      getUserAvatarUrl(currentUser).then(url => {
        if (url && url !== "/placeholder.svg") {
          setAvatarUrl(url)
        }
      }).catch(err => {
        console.debug('Error fetching avatar URL:', err)
        setAvatarUrl(null)
      })
    }
  }, [currentUser, avatarUrl])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black text-white">
        <Navbar />

        <main className="container mx-auto px-6 pt-24 pb-16">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              {/* Profile Picture Section */}
              <div className="relative mx-auto h-32 w-32 mb-4">
                <div 
                  className="relative h-full w-full rounded-full overflow-hidden bg-gray-900 border-4 border-gray-800 cursor-pointer group"
                  onClick={handleProfilePictureClick}
                >
                  {avatarUrl ? (
                    <Image
                      key={`${avatarUrl}-${avatarTimestamp}`}
                      src={`${avatarUrl}?t=${avatarTimestamp}`}
                      alt="Profile"
                      fill
                      className="object-cover"
                      sizes="128px"
                      unoptimized
                      priority
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gray-800">
                      <UserIcon className="h-16 w-16 text-gray-400" />
                    </div>
                  )}

                  {/* Hover overlay */}
                  {!isUploadingImage && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  )}

                  {/* Loading overlay */}
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <LoadingSpinner size="small" />
                    </div>
                  )}
                </div>

              </div>

              {/* Hidden file input */}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

              <h1 className="text-3xl font-bold">Your Profile</h1>
              <p className="text-gray-400 mt-2">{currentUser?.email}</p>
            </div>

            {/* Messages */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-md mb-6 flex items-center gap-2">
                <AlertCircleIcon size={20} />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-md mb-6 flex items-center gap-2">
                <CheckCircleIcon size={20} />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-gray-900 border-gray-800 focus:border-teal-500 text-white"
                  placeholder="Enter your display name"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || isUploadingImage}
                className="w-full bg-teal-500 text-black hover:bg-teal-400"
              >
                {isLoading ? "Updating..." : "Update Profile"}
              </Button>

              <div className="pt-4 space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="w-full border-gray-800 hover:bg-teal-500/10 hover:text-teal-400 hover:border-teal-500"
                >
                  <a href="/swipe">Start Swiping</a>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full border-gray-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500"
                >
                  Sign Out
                </Button>
              </div>
            </form>

            {/* Upload instructions */}
            <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
              <div className="flex items-start gap-3">
                <Upload className="h-5 w-5 text-teal-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-white mb-1">Profile Picture Tips</h3>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Use a clear, well-lit photo</li>
                    <li>• Maximum file size: 5MB</li>
                    <li>• Supported formats: JPG, PNG, GIF</li>
                    <li>• Square images work best</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>

        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-gray-950 to-transparent -z-10"></div>

        {/* Change Profile Picture Dialog */}
        <Dialog open={showChangePictureDialog} onOpenChange={setShowChangePictureDialog}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Change Profile Picture</DialogTitle>
              <DialogDescription className="text-gray-400">
                Choose an option to update your profile picture
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <Button
                type="button"
                onClick={handleUploadClick}
                disabled={isUploadingImage}
                className="w-full bg-teal-500 text-black hover:bg-teal-400 justify-start"
              >
                <Camera className="h-4 w-4 mr-2" />
                {avatarUrl ? "Upload New Picture" : "Upload Picture"}
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  onClick={handleDeleteClick}
                  disabled={isUploadingImage}
                  variant="outline"
                  className="w-full border-red-500 text-red-400 hover:bg-red-500/10 hover:text-red-300 justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Current Picture
                </Button>
              )}
              <Button
                type="button"
                onClick={() => setShowChangePictureDialog(false)}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
