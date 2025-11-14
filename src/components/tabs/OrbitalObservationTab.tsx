/**
 * ORBITAL OBSERVATION — OSINT INTELLIGENCE TAB
 * Military-grade geospatial intelligence display
 */

import React, { useState, useEffect } from 'react'
import { LocationIntel } from '../../lib/osint/dataFetchers'
import { fetchLocationIntel } from '../../lib/osint/dataFetchers'

interface OrbitalObservationTabProps {
  lat: number
  lng: number
  locationName: string
  country: string
}

export const OrbitalObservationTab: React.FC<OrbitalObservationTabProps> = ({
  lat,
  lng,
  locationName,
  country,
}) => {
  const [intel, setIntel] = useState<LocationIntel | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeLayer, setActiveLayer] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let mounted = true

    const loadIntel = async () => {
      setLoading(true)
      setProgress(0)

      try {
        const data = await fetchLocationIntel(lat, lng, locationName, country)
        if (mounted) {
          setIntel(data)
          setLoading(false)
          setProgress(100)
        }
      } catch (error) {
        console.error('Failed to fetch OSINT data:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadIntel()

    return () => {
      mounted = false
    }
  }, [lat, lng, locationName, country])

  const exportData = (format: 'json' | 'pdf') => {
    if (!intel) return

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(intel, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orbital-observation-${locationName}-${Date.now()}.json`
      a.click()
    } else {
      // PDF export would require a library like jsPDF
      alert('PDF export coming soon')
    }
  }

  if (loading) {
    return (
      <div className="p-6 h-full bg-tech-panel flex items-center justify-center">
        <div className="text-center">
          <div className="text-tech-primary text-lg font-mono mb-4">ORBITAL OBSERVATION</div>
          <div className="text-tech-text-muted text-sm font-mono mb-2">Acquiring intelligence...</div>
          <div className="w-64 h-1 bg-tech-border">
            <div
              className="h-full bg-tech-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (!intel) {
    return (
      <div className="p-6 h-full bg-tech-panel flex items-center justify-center">
        <div className="text-tech-error text-sm font-mono">Failed to acquire intelligence</div>
      </div>
    )
  }

  const layers = [
    { id: 'infrastructure', label: 'INFRASTRUCTURE', icon: '🏗️' },
    { id: 'activity', label: 'ACTIVITY PATTERNS', icon: '📡' },
    { id: 'sentiment', label: 'SENTIMENT & CHATTER', icon: '💬' },
    { id: 'threats', label: 'THREAT VECTORS', icon: '⚠️' },
    { id: 'history', label: 'HISTORICAL CONTEXT', icon: '📜' },
  ]

  return (
    <div className="h-full bg-tech-panel overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tech-panel border-b border-tech-border p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-tech-primary rounded-full animate-pulse" />
            <div>
              <div className="text-sm font-mono uppercase text-tech-text">ORBITAL OBSERVATION</div>
              <div className="text-xs font-mono text-tech-text-muted">
                {locationName}, {country} • {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-tech-primary/20 border border-tech-primary text-tech-primary text-xs font-mono">
              OBSERVATION MODE ACTIVE
            </div>
            <button
              onClick={() => exportData('json')}
              className="px-3 py-1 bg-tech-panel border border-tech-border text-tech-text text-xs font-mono hover:border-tech-primary transition-colors"
            >
              EXPORT JSON
            </button>
          </div>
        </div>
        <div className="text-xs font-mono text-tech-text-muted">
          Timestamp: {new Date(intel.timestamp).toLocaleString()} • Source: Open Intelligence
        </div>
      </div>

      {/* Layers Navigation */}
      <div className="border-b border-tech-border p-4">
        <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">INTELLIGENCE LAYERS</div>
        <div className="flex flex-wrap gap-2">
          {layers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(activeLayer === layer.id ? null : layer.id)}
              className={`px-3 py-2 text-xs font-mono uppercase transition-all border ${
                activeLayer === layer.id
                  ? 'bg-tech-primary text-tech-bg border-tech-primary'
                  : 'bg-tech-panel border-tech-border text-tech-text hover:border-tech-primary'
              }`}
            >
              {layer.icon} {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layer Content */}
      <div className="p-6 space-y-6">
        {/* Infrastructure Layer */}
        {(activeLayer === null || activeLayer === 'infrastructure') && (
          <div className="space-y-4">
            <div className="text-xs font-mono uppercase text-tech-text-muted mb-3">🏗️ INFRASTRUCTURE</div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-tech-bg border border-tech-border">
                <div className="text-tech-text-muted mb-1">Airports</div>
                <div className="text-lg font-bold text-tech-primary">{intel.layers.infrastructure.airports.length}</div>
                <div className="text-xs text-tech-text-muted mt-1">
                  {intel.layers.infrastructure.airports.filter(a => a.type === 'military').length} military
                </div>
              </div>
              <div className="p-3 bg-tech-bg border border-tech-border">
                <div className="text-tech-text-muted mb-1">Ports</div>
                <div className="text-lg font-bold text-tech-primary">{intel.layers.infrastructure.ports.length}</div>
                <div className="text-xs text-tech-text-muted mt-1">
                  {intel.layers.infrastructure.ports.reduce((sum, p) => sum + p.ships, 0)} vessels
                </div>
              </div>
              <div className="p-3 bg-tech-bg border border-tech-border">
                <div className="text-tech-text-muted mb-1">Data Centers</div>
                <div className="text-lg font-bold text-tech-primary">{intel.layers.infrastructure.dataCenters.length}</div>
              </div>
              <div className="p-3 bg-tech-bg border border-tech-border">
                <div className="text-tech-text-muted mb-1">Telecom Nodes</div>
                <div className="text-lg font-bold text-tech-primary">{intel.layers.infrastructure.telecom.length}</div>
              </div>
            </div>

            <div className="space-y-2">
              {intel.layers.infrastructure.airports.map((airport, i) => (
                <div key={i} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-tech-text">{airport.name} ({airport.icao})</span>
                    <span className={`px-2 py-0.5 ${
                      airport.type === 'military' ? 'bg-tech-error/20 text-tech-error' :
                      airport.type === 'commercial' ? 'bg-tech-primary/20 text-tech-primary' :
                      'bg-tech-secondary/20 text-tech-secondary'
                    }`}>
                      {airport.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-tech-text-muted text-[10px] mt-1">
                    {airport.activeFlights} active flights • {airport.lat.toFixed(4)}, {airport.lng.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Patterns Layer */}
        {(activeLayer === null || activeLayer === 'activity') && (
          <div className="space-y-4">
            <div className="text-xs font-mono uppercase text-tech-text-muted mb-3">📡 ACTIVITY PATTERNS</div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-tech-bg border border-tech-border">
                <div className="text-tech-text-muted mb-1">Current Flights</div>
                <div className="text-lg font-bold text-tech-primary">{intel.layers.activity.flights.current}</div>
                <div className="text-xs text-tech-text-muted mt-1">
                  {intel.layers.activity.flights.militaryFlights} military
                </div>
              </div>
              <div className="p-3 bg-tech-bg border border-tech-border">
                <div className="text-tech-text-muted mb-1">24h Flights</div>
                <div className="text-lg font-bold text-tech-primary">{intel.layers.activity.flights.last24h}</div>
                <div className={`text-xs mt-1 ${
                  intel.layers.activity.flights.trend === 'up' ? 'text-tech-error' :
                  intel.layers.activity.flights.trend === 'down' ? 'text-tech-primary' :
                  'text-tech-text-muted'
                }`}>
                  Trend: {intel.layers.activity.flights.trend.toUpperCase()}
                </div>
              </div>
              <div className="p-3 bg-tech-bg border border-tech-border">
                <div className="text-tech-text-muted mb-1">Maritime</div>
                <div className="text-lg font-bold text-tech-primary">{intel.layers.activity.maritime.ships}</div>
                <div className="text-xs text-tech-text-muted mt-1">ships in area</div>
              </div>
            </div>

            {intel.layers.activity.events.length > 0 && (
              <div>
                <div className="text-tech-text-muted mb-2">Recent Events</div>
                <div className="space-y-2">
                  {intel.layers.activity.events.map((event, i) => (
                    <div key={i} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-tech-text">{event.description}</span>
                        <span className="px-2 py-0.5 bg-tech-warning/20 text-tech-warning">
                          {event.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-tech-text-muted text-[10px] mt-1">
                        {new Date(event.timestamp).toLocaleString()} • Source: {event.source}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sentiment Layer */}
        {(activeLayer === null || activeLayer === 'sentiment') && (
          <div className="space-y-4">
            <div className="text-xs font-mono uppercase text-tech-text-muted mb-3">💬 SENTIMENT & CHATTER</div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-tech-bg border border-tech-border">
                <div className="text-tech-text-muted mb-1">Social Mentions</div>
                <div className="text-lg font-bold text-tech-primary">{intel.layers.sentiment.socialMedia.mentions}</div>
                <div className={`text-xs mt-1 ${
                  intel.layers.sentiment.socialMedia.sentiment === 'positive' ? 'text-tech-primary' :
                  intel.layers.sentiment.socialMedia.sentiment === 'negative' ? 'text-tech-error' :
                  'text-tech-text-muted'
                }`}>
                  {intel.layers.sentiment.socialMedia.sentiment.toUpperCase()}
                </div>
              </div>
              <div className="p-3 bg-tech-bg border border-tech-border">
                <div className="text-tech-text-muted mb-1">News Articles</div>
                <div className="text-lg font-bold text-tech-primary">{intel.layers.sentiment.news.articles}</div>
              </div>
              <div className="p-3 bg-tech-bg border border-tech-border">
                <div className="text-tech-text-muted mb-1">Chatter Volume</div>
                <div className="text-lg font-bold text-tech-primary">{intel.layers.sentiment.chatter.volume.toUpperCase()}</div>
              </div>
            </div>

            <div>
              <div className="text-tech-text-muted mb-2">Top Keywords</div>
              <div className="flex flex-wrap gap-2">
                {intel.layers.sentiment.socialMedia.keywords.map((kw, i) => (
                  <div
                    key={i}
                    className={`px-2 py-1 text-xs font-mono border ${
                      kw.sentiment > 0.3 ? 'bg-tech-primary/20 border-tech-primary text-tech-primary' :
                      kw.sentiment < -0.3 ? 'bg-tech-error/20 border-tech-error text-tech-error' :
                      'bg-tech-secondary/20 border-tech-secondary text-tech-secondary'
                    }`}
                  >
                    {kw.word} ({kw.count})
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Threat Vectors Layer */}
        {(activeLayer === null || activeLayer === 'threats') && (
          <div className="space-y-4">
            <div className="text-xs font-mono uppercase text-tech-text-muted mb-3">⚠️ THREAT VECTORS</div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-tech-bg border border-tech-border">
                <div className="text-tech-text-muted mb-1">Cyber Threat Score</div>
                <div className={`text-lg font-bold ${
                  intel.layers.threats.cyber.threatScore > 70 ? 'text-tech-error' :
                  intel.layers.threats.cyber.threatScore > 40 ? 'text-tech-warning' :
                  'text-tech-primary'
                }`}>
                  {intel.layers.threats.cyber.threatScore}/100
                </div>
                <div className="text-xs text-tech-text-muted mt-1">
                  {intel.layers.threats.cyber.activeThreats} active threats
                </div>
              </div>
              <div className="p-3 bg-tech-bg border border-tech-border">
                <div className="text-tech-text-muted mb-1">Physical Risk</div>
                <div className={`text-lg font-bold ${
                  intel.layers.threats.physical.riskLevel === 'critical' ? 'text-tech-error' :
                  intel.layers.threats.physical.riskLevel === 'high' ? 'text-tech-warning' :
                  'text-tech-primary'
                }`}>
                  {intel.layers.threats.physical.riskLevel.toUpperCase()}
                </div>
              </div>
              <div className="p-3 bg-tech-bg border border-tech-border">
                <div className="text-tech-text-muted mb-1">Network Activity</div>
                <div className="text-lg font-bold text-tech-warning">{intel.layers.threats.network.suspiciousIPs}</div>
                <div className="text-xs text-tech-text-muted mt-1">suspicious IPs</div>
              </div>
            </div>

            {intel.layers.threats.cyber.iocs.length > 0 && (
              <div>
                <div className="text-tech-text-muted mb-2">Indicators of Compromise</div>
                <div className="space-y-2">
                  {intel.layers.threats.cyber.iocs.map((ioc, i) => (
                    <div key={i} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-tech-text">{ioc.type}: {ioc.value}</span>
                        <span className={`px-2 py-0.5 ${
                          ioc.severity === 'high' ? 'bg-tech-error/20 text-tech-error' :
                          ioc.severity === 'medium' ? 'bg-tech-warning/20 text-tech-warning' :
                          'bg-tech-primary/20 text-tech-primary'
                        }`}>
                          {ioc.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Historical Context Layer */}
        {(activeLayer === null || activeLayer === 'history') && (
          <div className="space-y-4">
            <div className="text-xs font-mono uppercase text-tech-text-muted mb-3">📜 HISTORICAL CONTEXT</div>
            
            <div className="space-y-3">
              {intel.layers.history.events.map((event, i) => (
                <div key={i} className="p-3 bg-tech-bg border border-tech-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-tech-primary font-mono text-xs">{event.date}</span>
                    <span className="px-2 py-0.5 bg-tech-secondary/20 text-tech-secondary text-xs">
                      {event.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-tech-text text-sm">{event.description}</div>
                  <div className={`text-xs mt-1 ${
                    event.impact === 'high' ? 'text-tech-error' :
                    event.impact === 'medium' ? 'text-tech-warning' :
                    'text-tech-text-muted'
                  }`}>
                    Impact: {event.impact.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

