import { useEffect } from 'react'
import { useNetworkStore } from '../store/networkStore'

export const ThreatMap = () => {
  const { markThreat, getAllNodes } = useNetworkStore()

  useEffect(() => {
    const fetchThreats = async () => {
      try {
        // Mock threat feed (in production, use AbuseIPDB, VirusTotal, etc.)
        // Real API: https://api.abuseipdb.com/v2/reports
        const mockThreats = generateMockThreats()
        
        mockThreats.forEach((threat) => {
          markThreat(threat.ip, threat.score)
        })
      } catch (error) {
        console.error('Threat feed error:', error)
      }
    }

    // Fetch threats every 10 seconds
    fetchThreats()
    const interval = setInterval(fetchThreats, 10000)

    return () => clearInterval(interval)
  }, [markThreat])

  return null // This component only updates the store
}

function generateMockThreats() {
  const nodes = useNetworkStore.getState().getAllNodes()
  if (nodes.length === 0) return []

  // Randomly mark 1-2% of nodes as threats
  const threatCount = Math.max(1, Math.floor(nodes.length * 0.01))
  const selected = nodes
    .sort(() => Math.random() - 0.5)
    .slice(0, threatCount)

  return selected.map((node) => ({
    ip: node.ip,
    score: Math.floor(Math.random() * 50) + 50, // 50-100 threat score
  }))
}

