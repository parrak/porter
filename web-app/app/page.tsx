'use client'

import { useState } from 'react'
import { Search, Plane, MapPin, Calendar, Users, MessageCircle } from 'lucide-react'
import TravelPlanner from '@/components/TravelPlanner'
import FlightSearch from '@/components/FlightSearch'
import ChatWidget from '@/components/ChatWidget'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'planner' | 'search' | 'chat'>('planner')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Plane className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Porter Travel</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <button
                onClick={() => setActiveTab('planner')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'planner'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                AI Planner
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'search'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Flight Search
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'chat'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Chat Assistant
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Plan Your Perfect Trip with AI
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get personalized travel recommendations, search flights, and plan your journey with our intelligent travel assistant.
          </p>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'planner' && (
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <MessageCircle className="w-6 h-6 mr-2 text-blue-600" />
                AI Travel Planner
              </h3>
              <TravelPlanner />
            </div>
          )}

          {activeTab === 'search' && (
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <Search className="w-6 h-6 mr-2 text-blue-600" />
                Flight Search
              </h3>
              <FlightSearch />
            </div>
          )}

          {activeTab === 'chat' && (
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <MessageCircle className="w-6 h-6 mr-2 text-blue-600" />
                Travel Chat Assistant
              </h3>
              <ChatWidget />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2024 Porter Travel. Powered by AI for smarter travel planning.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
