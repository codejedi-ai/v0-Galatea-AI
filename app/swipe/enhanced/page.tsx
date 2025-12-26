"use client"

import { useState, useEffect } from "react"
import { motion, type PanInfo, useMotionValue, useTransform } from "framer-motion"
import { Heart, X, Star, MessageCircle, ArrowLeft, Sparkles, Filter, Shuffle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SwipeCard } from "@/components/swipe-card"
import { Navbar } from "@/components/navbar"
import { ProtectedRoute } from "@/components/protected-route"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/utils/supabase/client"
import { processSwipeDecision } from "@/lib/database/swipes"

interface AICompanion {
  id: string
  name: string
  age: number
  bio: string
  personality: string
  interests: string[]
  personality_traits: string[]
  communication_style: string
  learning_capacity?: string
  backstory?: string
  favorite_topics: string[]
  relationship_goals: string[]
  image_url: string
  compatibility_score?: number
}

export default function EnhancedSwipePage() {
  const [companions, setCompanions] = useState<AICompanion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [matches, setMatches] = useState<string[]>([])
  const [rejections, setRejections] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    ageRange: [18, 35],
    interests: [] as string[],
    personalities: [] as string[]
  })
  const router = useRouter()
  const { toast } = useToast()

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-30, 30])
  const cardOpacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])
  const nopeOpacity = useTransform(x, [-150, -50], [1, 0])
  const nopeScale = useTransform(x, [-150, -50], [1, 0.8])
  const likeOpacity = useTransform(x, [50, 150], [0, 1])
  const likeScale = useTransform(x, [50, 150], [0.8, 1])

  useEffect(() => {
    loadCompanions()
  }, [])

  const loadCompanions = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get companions user hasn't swiped on yet
      const { data: swipedCompanions } = await supabase
        .from('swipe_decisions')
        .select('companion_id')
        .eq('user_id', user.id)

      const swipedIds = swipedCompanions?.map(s => s.companion_id) || []

      let query = supabase
        .from('companions')
        .select('*')
        .eq('is_active', true)
        .not('id', 'in', `(${swipedIds.length > 0 ? swipedIds.join(',') : 'null'})`)

      // Apply filters
      if (filters.ageRange) {
        query = query.gte('age', filters.ageRange[0]).lte('age', filters.ageRange[1])
      }

      const { data: fetchedCompanions, error: companionsError } = await query
        .order('compatibility_score', { ascending: false })
        .limit(20)

      if (companionsError) throw companionsError
      
      if (fetchedCompanions.length === 0) {
        setError("No more companions available. Check back later!")
      } else {
        setCompanions(fetchedCompanions)
      }
    } catch (err) {
      setError("Failed to load companions. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwipe = async (direction: "left" | "right" | "up") => {
    if (currentIndex >= companions.length || isProcessing) return

    const currentCompanion = companions[currentIndex]
    setIsProcessing(true)

    try {
      let decision: 'like' | 'pass' | 'super_like'
      if (direction === "right") {
        decision = 'like'
      } else if (direction === "up") {
        decision = 'super_like'
      } else {
        decision = 'pass'
      }

      // Process swipe decision (includes match creation)
      const result = await processSwipeDecision(currentCompanion.id, decision)

      if (result.success) {
        if (decision === 'like' || decision === 'super_like') {
          setMatches(prev => [...prev, currentCompanion.id])
          
          if (result.is_match) {
            toast({
              title: "🎉 It's a Match!",
              description: `You matched with ${currentCompanion.name}! Start chatting now.`,
            })
          } else {
            toast({
              title: "Liked!",
              description: `You liked ${currentCompanion.name}.`,
            })
          }
        } else {
          setRejections(prev => [...prev, currentCompanion.id])
        }
      } else {
        throw new Error(result.error || "Failed to process swipe")
      }

      // Move to next companion
      if (currentIndex < companions.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        // Load more companions or show completion
        await loadCompanions()
        setCurrentIndex(0)
      }
    } catch (error) {
      console.error("Swipe error:", error)
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100

    if (Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > threshold) {
        handleSwipe("right")
      } else {
        handleSwipe("left")
      }
    } else if (info.offset.y < -threshold) {
      handleSwipe("up")
    }

    // Reset card position
    x.set(0)
  }

  const shuffleCompanions = () => {
    const shuffled = [...companions].sort(() => Math.random() - 0.5)
    setCompanions(shuffled)
    setCurrentIndex(0)
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <LoadingSpinner size="medium" text="Loading companions..." />
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-black">
          <Navbar />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Sparkles className="h-16 w-16 text-teal-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-4">All caught up!</h2>
              <p className="text-gray-300 mb-8">{error}</p>
              <div className="space-y-4">
                <Button onClick={loadCompanions} className="bg-teal-500 text-black hover:bg-teal-400 w-full">
                  Refresh
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/matches">View Your Matches ({matches.length})</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (companions.length === 0) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-black">
          <Navbar />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Sparkles className="h-16 w-16 text-teal-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-4">All caught up!</h2>
              <p className="text-gray-300 mb-8">You've seen all available companions.</p>
              <div className="space-y-4">
                <Button asChild className="bg-teal-500 text-black hover:bg-teal-400 w-full">
                  <Link href="/matches">View Your Matches ({matches.length})</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard">Return to Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const currentCompanion = companions[currentIndex]
  const nextCompanion = companions[currentIndex + 1]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black">
        <Navbar />

        <main className="pt-20 pb-8 px-4">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between mb-6 max-w-md mx-auto">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-6 w-6 text-white" />
              </Link>
            </Button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">Discover</h1>
              <p className="text-sm text-gray-400">
                {currentIndex + 1} of {companions.length}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={shuffleCompanions}>
                <Shuffle className="h-5 w-5 text-gray-400" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-5 w-5 text-gray-400" />
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="max-w-md mx-auto mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
              <h3 className="text-white font-semibold mb-3">Filters</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400">Age Range: {filters.ageRange[0]} - {filters.ageRange[1]}</label>
                  <input
                    type="range"
                    min="18"
                    max="50"
                    value={filters.ageRange[1]}
                    onChange={(e) => setFilters(prev => ({ ...prev, ageRange: [18, parseInt(e.target.value)] }))}
                    className="w-full mt-1"
                  />
                </div>
                <Button onClick={loadCompanions} size="sm" className="w-full bg-teal-500 text-black">
                  Apply Filters
                </Button>
              </div>
            </div>
          )}

          {/* Card Stack */}
          <div className="relative max-w-md mx-auto h-[600px]">
            {/* Next card (underneath) */}
            {nextCompanion && (
              <div
                className="absolute inset-0 rounded-2xl overflow-hidden"
                style={{
                  zIndex: 0,
                  transform: "scale(0.95) translateY(10px)",
                  opacity: 0.7,
                }}
              >
                <SwipeCard
                  companion={nextCompanion}
                  onSwipeLeft={() => {}}
                  onSwipeRight={() => {}}
                  onSuperLike={() => {}}
                />
              </div>
            )}

            {/* Current card (on top) */}
            <motion.div
              className="absolute inset-0 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
              style={{
                zIndex: 1,
                x,
                rotate,
                opacity: cardOpacity,
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              whileDrag={{ scale: 1.05 }}
            >
              <SwipeCard
                companion={currentCompanion}
                onSwipeLeft={() => handleSwipe("left")}
                onSwipeRight={() => handleSwipe("right")}
                onSuperLike={() => handleSwipe("up")}
              />
            </motion.div>

            {/* Enhanced Swipe indicators */}
            <motion.div
              className="absolute top-20 left-8 bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-lg rotate-[-30deg] border-4 border-red-500 shadow-lg"
              style={{
                opacity: nopeOpacity,
                scale: nopeScale,
              }}
            >
              PASS
            </motion.div>

            <motion.div
              className="absolute top-20 right-8 bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-lg rotate-[30deg] border-4 border-green-500 shadow-lg"
              style={{
                opacity: likeOpacity,
                scale: likeScale,
              }}
            >
              LIKE
            </motion.div>
          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex justify-center items-center gap-6 mt-8">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-16 h-16 border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-400 hover:scale-110 transition-all"
              onClick={() => handleSwipe("left")}
              disabled={isProcessing}
            >
              <X className="h-7 w-7" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-14 h-14 border-blue-500 text-blue-500 hover:bg-blue-500/10 hover:text-blue-400 hover:scale-110 transition-all"
              onClick={() => handleSwipe("up")}
              disabled={isProcessing}
            >
              <Star className="h-6 w-6" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-16 h-16 border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-400 hover:scale-110 transition-all"
              onClick={() => handleSwipe("right")}
              disabled={isProcessing}
            >
              <Heart className="h-7 w-7" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-14 h-14 border-purple-500 text-purple-500 hover:bg-purple-500/10 hover:text-purple-400 hover:scale-110 transition-all"
              onClick={() => router.push('/chats')}
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </div>

          {/* Enhanced Progress indicator */}
          <div className="max-w-md mx-auto mt-6">
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentIndex + 1) / companions.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-3">
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-green-500" />
                Matches: {matches.length}
              </span>
              <span>Remaining: {companions.length - currentIndex - 1}</span>
              <span className="flex items-center gap-1">
                <X className="h-3 w-3 text-red-500" />
                Passed: {rejections.length}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="max-w-md mx-auto mt-6 grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
              <div className="text-lg font-bold text-green-400">{matches.length}</div>
              <div className="text-xs text-gray-400">Matches</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
              <div className="text-lg font-bold text-blue-400">{currentCompanion?.compatibility_score || 0}%</div>
              <div className="text-xs text-gray-400">Compatibility</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
              <div className="text-lg font-bold text-purple-400">{companions.length - currentIndex - 1}</div>
              <div className="text-xs text-gray-400">Remaining</div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}