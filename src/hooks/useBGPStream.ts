import { useEffect, useRef } from 'react'
import { useNetworkStore } from '../store/networkStore'

export const useBGPStream = (enabled: boolean = true) => {
  const { addNode, addLink, updateNode } = useNetworkStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      return
    }

    const fetchBGPUpdates = async () => {
      try {
        // Mock BGP updates (in production, use real BGPStream API)
        // Real API: https://api.bgpstream.com/v2/updates
        const mockUpdates = generateMockBGPUpdates()
        
        mockUpdates.forEach((update) => {
          const path = update.path
          if (path.length < 2) return

          // Create nodes for each ASN in path
          path.forEach((asn, idx) => {
            const ip = `AS${asn}`
            const existing = useNetworkStore.getState().nodes.get(ip)
            
            if (!existing) {
              addNode({
                id: ip,
                ip,
                lat: (Math.random() - 0.5) * 180,
                lng: (Math.random() - 0.5) * 360,
                country: 'Unknown',
                asn: asn,
                org: `ASN ${asn}`,
                packets: 0,
                bytes: 0,
                topPorts: [],
                lastSeen: Date.now() / 1000,
              })
            }
          })

          // Create links between ASNs
          for (let i = 0; i < path.length - 1; i++) {
            const src = `AS${path[i]}`
            const dst = `AS${path[i + 1]}`
            const linkId = `${src}-${dst}-bgp`

            const existing = useNetworkStore.getState().links.get(linkId)
            if (!existing) {
              addLink({
                id: linkId,
                source: src,
                target: dst,
                protocol: 'bgp',
                bytes: 0,
                packets: 1,
                lastSeen: Date.now() / 1000,
              })
            }
          }
        })
      } catch (error) {
        console.error('BGP stream error:', error)
      }
    }

    // Fetch every 5 seconds
    fetchBGPUpdates()
    intervalRef.current = setInterval(fetchBGPUpdates, 5000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, addNode, addLink, updateNode])
}

function generateMockBGPUpdates() {
  // Mock BGP path updates
  const commonASNs = [15169, 13335, 36692, 16509, 32934, 20940]
  
  return Array.from({ length: 3 }, () => ({
    path: [
      commonASNs[Math.floor(Math.random() * commonASNs.length)],
      commonASNs[Math.floor(Math.random() * commonASNs.length)],
      commonASNs[Math.floor(Math.random() * commonASNs.length)],
    ].filter((v, i, a) => a.indexOf(v) === i), // Remove duplicates
    timestamp: Date.now() / 1000,
  }))
}

