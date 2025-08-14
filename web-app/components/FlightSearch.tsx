'use client'

import { useState } from 'react'
import { Search, Plane, MapPin, Calendar, Users, Loader2, Filter } from 'lucide-react'

interface Flight {
  id: string
  from: string
  to: string
  departure: string
  arrival: string
  airline: string
  price: string
  currency: string
  duration: string
  stops: number
}

export default function FlightSearch() {
  const [searchParams, setSearchParams] = useState({
    from: '',
    to: '',
    date: '',
    passengers: 1,
    travelClass: 'ECONOMY'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [flights, setFlights] = useState<Flight[]>([])
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchParams.from || !searchParams.to || !searchParams.date) {
      setError('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    setError('')
    setFlights([])

    try {
      const response = await fetch('/api/search-flights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...searchParams,
          userId: 'web-user-' + Date.now(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const data = await response.json()
      setFlights(data.flights || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Search Form */}
      <div className="card mb-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-6">
          Search for Flights
        </h4>
        <form onSubmit={handleSearch} className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From
              </label>
              <input
                type="text"
                value={searchParams.from}
                onChange={(e) => handleInputChange('from', e.target.value)}
                placeholder="Airport code (e.g., SFO)"
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To
              </label>
              <input
                type="text"
                value={searchParams.to}
                onChange={(e) => handleInputChange('to', e.target.value)}
                placeholder="Airport code (e.g., JFK)"
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={searchParams.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passengers
              </label>
              <select
                value={searchParams.passengers}
                onChange={(e) => handleInputChange('passengers', parseInt(e.target.value))}
                className="input-field"
              >
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Travel Class
              </label>
              <select
                value={searchParams.travelClass}
                onChange={(e) => handleInputChange('travelClass', e.target.value)}
                className="input-field w-32"
              >
                <option value="ECONOMY">Economy</option>
                <option value="BUSINESS">Business</option>
                <option value="FIRST">First</option>
              </select>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search Flights
                </>
              )}
            </button>
          </div>
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

      {/* Results */}
      {flights.length > 0 && (
        <div className="card">
          <h4 className="text-lg font-semibold text-gray-900 mb-6">
            Found {flights.length} Flights
          </h4>
          
          <div className="space-y-4">
            {flights.map((flight) => (
              <div
                key={flight.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-lg font-semibold">{flight.departure}</p>
                      <p className="text-sm text-gray-500">{flight.from}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-px bg-gray-300"></div>
                      <Plane className="w-4 h-4 text-blue-600" />
                      <div className="w-16 h-px bg-gray-300"></div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-lg font-semibold">{flight.arrival}</p>
                      <p className="text-sm text-gray-500">{flight.to}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {flight.price} {flight.currency}
                    </p>
                    <p className="text-sm text-gray-500">
                      {flight.duration} • {flight.stops} stop{flight.stops !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-gray-500">{flight.airline}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!isLoading && flights.length === 0 && !error && (
        <div className="card text-center text-gray-500">
          <p>No flights found. Try adjusting your search criteria.</p>
        </div>
      )}
    </div>
  )
}
