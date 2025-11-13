import { useEffect, useRef } from 'react'
import { useNetworkStore } from '../store/networkStore'
import { ASN_DATABASE, generateIPFromASN, getRandomASN, TOTAL_ASNS } from '../lib/geo/asnDatabase'

/**
 * MILITARY-GRADE NETWORK SEED
 * Progressive loading to prevent UI freeze
 * - Start with 500 nodes, gradually add more
 * - Use requestAnimationFrame for smooth loading
 */

const INITIAL_NODES = 500 // Start with 500 nodes
const BATCH_SIZE = 50 // Add 50 nodes per batch
const BATCH_DELAY_MS = 16 // ~60 FPS (one frame)

export const useNetworkSeed = () => {
  const { addNode } = useNetworkStore()
  const seededRef = useRef(false)
  const batchIndexRef = useRef(0)

  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true

    console.log(`[NETWORK ABYSS] Seeding network progressively...`)

    // Phase 1: Seed major infrastructure (Tier 1, Cloud, CDN) - Top 20 only
    const majorASNs = Array.from(ASN_DATABASE.values())
      .filter(asn => asn.tier === 1 || asn.type === 'Cloud' || asn.type === 'CDN')
      .slice(0, 20) // Reduced from 100 to 20

    // Phase 2: Seed regional ISPs - Top 50 only
    const regionalASNs = Array.from(ASN_DATABASE.values())
      .filter(asn => asn.tier === 2)
      .slice(0, 50) // Reduced from 500 to 50

    // Phase 3: Seed random ASNs - Top 100 only
    const randomASNs = Array.from(ASN_DATABASE.values())
      .filter(asn => asn.tier === 3 || Math.random() > 0.7)
      .slice(0, 100) // Reduced from 2000 to 100

    // Phase 4: High-threat ASNs - Top 20 only
    const threatASNs = Array.from(ASN_DATABASE.values())
      .filter(asn => asn.threats >= 10)
      .slice(0, 20) // Reduced from 200 to 20

    // Collect all ASNs to seed
    const allASNs = [
      ...majorASNs.map(asn => ({ asn, ipCount: asn.tier === 1 ? 10 : 5 })), // Reduced IPs per ASN
      ...regionalASNs.map(asn => ({ asn, ipCount: Math.floor(Math.random() * 3) + 2 })),
      ...randomASNs.map(asn => ({ asn, ipCount: Math.floor(Math.random() * 2) + 1 })),
      ...threatASNs.map(asn => ({ asn, ipCount: 1 })),
    ]

    // Progressive loading function
    const loadBatch = () => {
      const startIdx = batchIndexRef.current * BATCH_SIZE
      const endIdx = Math.min(startIdx + BATCH_SIZE, allASNs.length)

      if (startIdx >= allASNs.length) {
        const totalNodes = useNetworkStore.getState().getAllNodes().length
        console.log(`[NETWORK ABYSS] Seeded ${totalNodes} nodes`)
        return
      }

      // Process batch
      for (let i = startIdx; i < endIdx; i++) {
        const { asn: asnData, ipCount } = allASNs[i]

        for (let j = 0; j < ipCount; j++) {
          const ip = generateIPFromASN(asnData.asn)
          if (!ip) continue

          addNode({
            id: ip,
            ip,
            lat: asnData.lat + (Math.random() - 0.5) * 2,
            lng: asnData.lng + (Math.random() - 0.5) * 2,
            country: asnData.country,
            asn: asnData.asn,
            org: asnData.org,
            packets: Math.floor(Math.random() * 10000) + 100,
            bytes: Math.floor(Math.random() * 1000000) + 10000,
            topPorts: asnData.type === 'CDN' ? [443, 80, 8080] : [443, 80, 22, 53, 3389],
            lastSeen: Date.now() / 1000,
            packetHistory: [],
            threatInfo: asnData.threats >= 10 ? {
              score: asnData.threats,
              type: asnData.threats > 20 ? 'botnet' : asnData.threats > 15 ? 'malware' : 'scanning',
              firstSeen: Date.now() / 1000 - 86400 * 7,
              lastSeen: Date.now() / 1000,
              reports: Math.floor(asnData.threats * 10),
              description: `High-threat ASN: ${asnData.org} (${asnData.country})`,
            } : undefined,
          })
        }
      }

      batchIndexRef.current++
      requestAnimationFrame(loadBatch)
    }

    // Start progressive loading
    requestAnimationFrame(loadBatch)
  }, [addNode])
}
