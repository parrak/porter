'use client'

import { useState } from 'react'
import { Send, Plane, MapPin, Calendar, Users, DollarSign, Loader2 } from 'lucide-react'

interface TripPlan {
  destination: string
  dates: string
  duration: string
  budget: string
  activities: string[]
  accommodation: string
  transportation: string
  recommendations: string[]
}

export default function TravelPlanner() {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsLoading(true)
    setError('')
    setTripPlan(null)

    try {
      const response = await fetch('/api/plan-trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          userId: 'web-user-' + Date.now(), // Simple user ID for demo
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to plan trip: ${response.statusText}`)
      }

      const data = await response.json()
      setTripPlan(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to plan trip')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Input Form */}
      <div className="card mb-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Describe Your Dream Trip
        </h4>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Tell me about your dream trip! For example: 'I want to visit Japan for 2 weeks in spring, love food and culture, budget around $5000, prefer to stay in traditional ryokans'"
              className="input-field h-32 resize-none"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Planning Your Trip...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Plan My Trip
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card mb-8 border-red-200 bg-red-50">
          <div className="text-red-800">
            <h4 className="font-semibold mb-2">Error</h4>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Trip Plan Display */}
      {tripPlan && (
        <div className="card">
          <h4 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Plane className="w-6 h-6 mr-2 text-blue-600" />
            Your Personalized Trip Plan
          </h4>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Destination</p>
                  <p className="font-medium">{tripPlan.destination}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Dates</p>
                  <p className="font-medium">{tripPlan.dates}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">{tripPlan.duration}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Budget</p>
                  <p className="font-medium">{tripPlan.budget}</p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Accommodation</p>
                <p className="font-medium">{tripPlan.accommodation}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-2">Transportation</p>
                <p className="font-medium">{tripPlan.transportation}</p>
              </div>
            </div>
          </div>

          {/* Activities */}
          <div className="mt-6">
            <p className="text-sm text-gray-500 mb-2">Recommended Activities</p>
            <div className="flex flex-wrap gap-2">
              {tripPlan.activities.map((activity, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {activity}
                </span>
              ))}
            </div>
          </div>

          {/* Additional Recommendations */}
          <div className="mt-6">
            <p className="text-sm text-gray-500 mb-2">Additional Tips</p>
            <ul className="space-y-2">
              {tripPlan.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
