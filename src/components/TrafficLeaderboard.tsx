/**
 * TRAFFIC LEADERBOARD
 * Live leaderboard showing top traffic sources with real-time stats
 */

import { useMemo, useState, useEffect } from 'react'
import { useNetworkStore } from '../store/networkStore'

interface LeaderboardEntry {
  id: string
  name: string
  packets: number
  bytes: number
  type: 'ip' | 'asn' | 'org'
  country?: string
  threat?: boolean
}

export const TrafficLeaderboard = () => {
  const [isVisible, setIsVisible] = useState(false)
  const nodes = useNetworkStore((state) => state.getAllNodes())
  const links = useNetworkStore((state) => state.getAllLinks())

  // Listen for toggle events from command center
  useEffect(() => {
    const handleToggle = () => {
      setIsVisible(prev => !prev)
    }

    window.addEventListener('toggle-leaderboard', handleToggle)
    return () => {
      window.removeEventListener('toggle-leaderboard', handleToggle)
    }
  }, [])

  if (!isVisible) return null

  // Calculate leaderboard entries
  const leaderboard = useMemo(() => {
    // Aggregate by IP/ASN/Org
    const trafficMap = new Map<string, LeaderboardEntry>()

    nodes.forEach((node) => {
      const key = node.id
      const existing = trafficMap.get(key) || {
        id: key,
        name: node.hostname || node.ip || `AS${node.asn}`,
        packets: 0,
        bytes: 0,
        type: node.isASNode ? 'asn' : 'ip',
        country: node.country,
        threat: !!node.threatInfo,
      }

      existing.packets += node.packets || 0
      existing.bytes += node.bytes || 0

      trafficMap.set(key, existing)
    })

    // Add link traffic
    links.forEach((link) => {
      const sourceKey = link.source
      const targetKey = link.target

      // Update source
      const sourceEntry = trafficMap.get(sourceKey)
      if (sourceEntry) {
        sourceEntry.packets += Number(link.packets || 0)
        sourceEntry.bytes += Number(link.bytes || 0)
      }

      // Update target
      const targetEntry = trafficMap.get(targetKey)
      if (targetEntry) {
        targetEntry.packets += Number(link.packets || 0)
        targetEntry.bytes += Number(link.bytes || 0)
      }
    })

    // Convert to array and sort by bytes (total traffic)
    return Array.from(trafficMap.values())
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 10) // Top 10
  }, [nodes, links])

  // Calculate total stats
  const stats = useMemo(() => {
    const totalPackets = nodes.reduce((sum, node) => sum + (node.packets || 0), 0) +
      links.reduce((sum, link) => sum + Number(link.packets || 0), 0)
    
    const totalBytes = nodes.reduce((sum, node) => sum + (node.bytes || 0), 0) +
      links.reduce((sum, link) => sum + Number(link.bytes || 0), 0)
    
    const activeNodes = nodes.length
    const activeLinks = links.length
    const threatNodes = nodes.filter(n => n.threatInfo).length

    return {
      totalPackets,
      totalBytes,
      activeNodes,
      activeLinks,
      threatNodes,
    }
  }, [nodes, links])

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(2)} TB`
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`
    return `${bytes} B`
  }

  // Format packets
  const formatPackets = (packets: number): string => {
    if (packets >= 1e9) return `${(packets / 1e9).toFixed(2)}B`
    if (packets >= 1e6) return `${(packets / 1e6).toFixed(2)}M`
    if (packets >= 1e3) return `${(packets / 1e3).toFixed(2)}K`
    return packets.toLocaleString()
  }

  return (
    <div className="fixed top-16 right-4 w-80 z-40 glass-panel border border-tech-border">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-tech-border bg-tech-bg/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-tech-primary rounded-full animate-pulse" />
            <span className="text-xs font-mono uppercase text-tech-primary tracking-wider">
              TRAFFIC LEADERBOARD
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono text-tech-text-muted">
              LIVE
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-tech-text-muted hover:text-tech-error transition-colors text-sm font-bold"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="px-4 py-3 border-b border-tech-border bg-tech-bg/30">
        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          <div>
            <div className="text-tech-text-muted mb-1">TOTAL BYTES</div>
            <div className="text-tech-primary text-sm font-bold">
              {formatBytes(stats.totalBytes)}
            </div>
          </div>
          <div>
            <div className="text-tech-text-muted mb-1">TOTAL PACKETS</div>
            <div className="text-tech-primary text-sm font-bold">
              {formatPackets(stats.totalPackets)}
            </div>
          </div>
          <div>
            <div className="text-tech-text-muted mb-1">ACTIVE NODES</div>
            <div className="text-tech-text text-sm font-bold">
              {stats.activeNodes.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-tech-text-muted mb-1">ACTIVE LINKS</div>
            <div className="text-tech-text text-sm font-bold">
              {stats.activeLinks.toLocaleString()}
            </div>
          </div>
        </div>
        {stats.threatNodes > 0 && (
          <div className="mt-2 pt-2 border-t border-tech-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-tech-text-muted">THREAT NODES</span>
              <span className="text-xs font-mono text-tech-error font-bold">
                {stats.threatNodes}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="max-h-96 overflow-y-auto">
        {leaderboard.length === 0 ? (
          <div className="px-4 py-8 text-center text-tech-text-muted text-xs font-mono">
            NO TRAFFIC DATA
          </div>
        ) : (
          <div className="divide-y divide-tech-border">
            {leaderboard.map((entry, index) => {
              const percentage = stats.totalBytes > 0 
                ? (entry.bytes / stats.totalBytes) * 100 
                : 0

              return (
                <div
                  key={entry.id}
                  className="px-4 py-2.5 hover:bg-tech-bg/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`text-xs font-mono font-bold ${
                        index === 0 ? 'text-tech-primary' :
                        index === 1 ? 'text-tech-secondary' :
                        index === 2 ? 'text-tech-warning' :
                        'text-tech-text-muted'
                      }`}>
                        #{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-tech-text truncate">
                          {entry.name}
                        </div>
                        {entry.country && (
                          <div className="text-[10px] font-mono text-tech-text-muted">
                            {entry.country}
                          </div>
                        )}
                      </div>
                      {entry.threat && (
                        <div className="w-1.5 h-1.5 bg-tech-error rounded-full" />
                      )}
                    </div>
                  </div>
                  
                  {/* Traffic Bar */}
                  <div className="mb-1">
                    <div className="h-1 bg-tech-bg rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          entry.threat ? 'bg-tech-error' : 'bg-tech-primary'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Traffic Stats */}
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="text-tech-text-muted">
                      {formatBytes(entry.bytes)}
                    </div>
                    <div className="text-tech-text-muted">
                      {formatPackets(entry.packets)} pkts
                    </div>
                    <div className={`${
                      entry.threat ? 'text-tech-error' : 'text-tech-text-muted'
                    }`}>
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

