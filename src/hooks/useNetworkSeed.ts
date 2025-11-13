import { useEffect } from 'react'
import { useNetworkStore } from '../store/networkStore'
import { enrichNode } from '../lib/geo/ip2location'

export const useNetworkSeed = () => {
  const { addNode } = useNetworkStore()

  useEffect(() => {
    // Seed with known major network nodes
    const seedIPs = [
      '8.8.8.8', // Google DNS
      '1.1.1.1', // Cloudflare DNS
      '208.67.222.222', // OpenDNS
      '9.9.9.9', // Quad9
      '8.8.4.4', // Google DNS alt
      '1.0.0.1', // Cloudflare alt
    ]

    // Add seed nodes
    seedIPs.forEach((ip) => {
      const enriched = enrichNode(ip)
      addNode({
        id: ip,
        ip,
        lat: enriched.lat,
        lng: enriched.lng,
        country: enriched.country,
        asn: enriched.asn,
        org: enriched.org,
        packets: 0,
        bytes: 0,
        topPorts: [53, 443],
        lastSeen: Date.now() / 1000,
        packetHistory: [],
      })
    })

    // Add some random nodes for visualization
    for (let i = 0; i < 50; i++) {
      const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
      const enriched = enrichNode(ip)
      
      addNode({
        id: ip,
        ip,
        lat: enriched.lat,
        lng: enriched.lng,
        country: enriched.country,
        asn: enriched.asn,
        org: enriched.org,
        packets: Math.floor(Math.random() * 1000),
        bytes: Math.floor(Math.random() * 1000000),
        topPorts: [80, 443, 22, 3389, 53].slice(0, Math.floor(Math.random() * 3) + 1),
        lastSeen: Date.now() / 1000,
        packetHistory: [],
      })
    }
  }, [addNode])
}

