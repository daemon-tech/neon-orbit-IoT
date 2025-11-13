import { useEffect, useRef } from 'react'
import { useNetworkStore } from '../store/networkStore'

export const useDNSFeed = (enabled: boolean = true) => {
  const { addNode, addLink, getAllNodes } = useNetworkStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      return
    }

    const processDNSQuery = (clientIP: string, domain: string) => {
      // Ensure client node exists
      const clientNode = useNetworkStore.getState().nodes.get(clientIP)
      if (!clientNode) {
        const nodes = getAllNodes()
        if (nodes.length > 0) {
          // Use existing node as client
          const existing = nodes[Math.floor(Math.random() * nodes.length)]
          addDNSLink(existing.ip, domain)
        }
        return
      }

      addDNSLink(clientIP, domain)
    }

    const addDNSLink = (clientIP: string, domain: string) => {
      // Create a node for the domain (simplified - in production resolve to IP)
      const domainNodeId = `DNS:${domain}`
      const existing = useNetworkStore.getState().nodes.get(domainNodeId)
      
      if (!existing) {
        addNode({
          id: domainNodeId,
          ip: domain,
          lat: (Math.random() - 0.5) * 180,
          lng: (Math.random() - 0.5) * 360,
          country: 'Unknown',
          packets: 0,
          bytes: 0,
          topPorts: [53],
          lastSeen: Date.now() / 1000,
        })
      }

      // Create DNS link
      const linkId = `${clientIP}-${domainNodeId}-dns`
      const existingLink = useNetworkStore.getState().links.get(linkId)
      
      if (!existingLink) {
        useNetworkStore.getState().addLink({
          id: linkId,
          source: clientIP,
          target: domainNodeId,
          srcPort: 53,
          dstPort: 53,
          protocol: 'dns',
          bytes: 64, // Typical DNS query size
          packets: 1,
          lastSeen: Date.now() / 1000,
        })
      }
    }

    // Mock DNS queries (in production, use Cloudflare DNS over HTTPS or WebSocket)
    const domains = [
      'google.com',
      'github.com',
      'stackoverflow.com',
      'reddit.com',
      'youtube.com',
      'amazon.com',
      'microsoft.com',
      'apple.com',
    ]

    intervalRef.current = setInterval(() => {
      const nodes = getAllNodes()
      if (nodes.length === 0) return

      const client = nodes[Math.floor(Math.random() * nodes.length)]
      const domain = domains[Math.floor(Math.random() * domains.length)]
      
      processDNSQuery(client.ip, domain)
    }, 2000) // Every 2 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, addNode, addLink, getAllNodes])
}

