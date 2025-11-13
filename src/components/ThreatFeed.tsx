import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNetworkStore, ThreatInfo } from '../store/networkStore'

export const ThreatFeed = () => {
  const { getThreatNodes, setSelectedNode } = useNetworkStore()
  const [threats, setThreats] = useState<Array<{ nodeId: string; threat: ThreatInfo; ip: string }>>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateThreats = () => {
      const threatNodes = getThreatNodes()
      const threatList = threatNodes
        .filter((n) => n.threatInfo)
        .map((n) => ({
          nodeId: n.id,
          ip: n.ip,
          threat: n.threatInfo!,
        }))
        .sort((a, b) => b.threat.score - a.threat.score)
        .slice(0, 20)

      setThreats(threatList)
    }

    updateThreats()
    const interval = setInterval(updateThreats, 2000)
    return () => clearInterval(interval)
  }, [getThreatNodes])

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [threats])

  const getThreatTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      malware: 'text-red-400',
      spam: 'text-yellow-400',
      abuse: 'text-orange-400',
      phishing: 'text-pink-400',
      botnet: 'text-purple-400',
      scanning: 'text-cyan-400',
    }
    return colors[type] || 'text-tech-error'
  }

  const getThreatSeverity = (score: number) => {
    if (score >= 90) return 'Critical'
    if (score >= 70) return 'High'
    if (score >= 50) return 'Medium'
    return 'Low'
  }

  return (
    <div className="fixed top-16 right-10 z-50 w-96">
      <div className="data-panel rounded-lg overflow-hidden">
        <div
          className="px-4 py-3 border-b border-tech-border cursor-pointer flex items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-tech-error rounded-full animate-pulse" />
            <h3 className="text-sm font-semibold text-tech-text uppercase tracking-wide">
              Threat Intelligence
            </h3>
            <span className="text-xs text-tech-text-muted">
              ({threats.length})
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-tech-text-muted transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 400 }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                ref={feedRef}
                className="h-96 overflow-y-auto p-2 space-y-2"
                style={{ scrollbarWidth: 'thin' }}
              >
                {threats.length === 0 ? (
                  <div className="text-center text-tech-text-muted text-sm py-8">
                    No active threats detected
                  </div>
                ) : (
                  threats.map((item) => (
                    <motion.div
                      key={`${item.nodeId}-${item.threat.lastSeen}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="data-panel rounded p-3 cursor-pointer hover:border-tech-error transition-colors"
                      onClick={() => setSelectedNode(item.nodeId)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-mono font-semibold text-tech-primary text-sm">
                          {item.ip}
                        </span>
                        <span className={`text-xs font-semibold ${getThreatTypeColor(item.threat.type)}`}>
                          {item.threat.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-tech-text-muted">Severity:</span>
                          <span className="text-tech-error font-semibold">
                            {getThreatSeverity(item.threat.score)} ({item.threat.score}/100)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-tech-text-muted">Reports:</span>
                          <span className="text-tech-text">{item.threat.reports}</span>
                        </div>
                        {item.threat.description && (
                          <div className="text-tech-text-muted mt-1 text-xs">
                            {item.threat.description}
                          </div>
                        )}
                        <div className="text-tech-text-muted text-xs mt-1">
                          {new Date(item.threat.lastSeen * 1000).toLocaleTimeString()}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

