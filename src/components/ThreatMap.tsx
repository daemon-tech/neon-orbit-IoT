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
          markThreat(threat.ip, threat.threatInfo)
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

  const threatTypes: Array<'malware' | 'spam' | 'abuse' | 'phishing' | 'botnet' | 'scanning'> = [
    'malware',
    'spam',
    'abuse',
    'phishing',
    'botnet',
    'scanning',
  ]

  const descriptions: Record<string, string> = {
    malware: 'Malware distribution detected',
    spam: 'Spam activity reported',
    abuse: 'Abuse reports from multiple sources',
    phishing: 'Phishing attempt identified',
    botnet: 'Botnet command and control',
    scanning: 'Port scanning activity',
  }

  // Randomly mark 2-5% of nodes as threats
  const threatCount = Math.max(2, Math.floor(nodes.length * 0.03))
  const selected = nodes
    .sort(() => Math.random() - 0.5)
    .slice(0, threatCount)

  return selected.map((node) => {
    const type = threatTypes[Math.floor(Math.random() * threatTypes.length)]
    const score = Math.floor(Math.random() * 40) + 60 // 60-100 threat score
    const now = Date.now() / 1000

    return {
      ip: node.ip,
      threatInfo: {
        score,
        type,
        firstSeen: now - Math.random() * 86400, // Within last 24h
        lastSeen: now,
        reports: Math.floor(Math.random() * 50) + 10,
        description: descriptions[type],
      },
    }
  })
}

