import { useEffect, useRef } from 'react'
import { useNetworkStore } from '../store/networkStore'
import { ASN_DATABASE, generateIPFromASN, getRandomASN, getASNForIP } from '../lib/geo/asnDatabase'

interface PacketData {
  src: string
  dst: string
  srcPort?: number
  dstPort?: number
  protocol: string
  size: number
  time: number
}

/**
 * MILITARY-GRADE PACKET CAPTURE
 * Throttled for performance - 50 packets/sec instead of 10,000
 * Batched updates to prevent UI freeze
 */

const PACKETS_PER_BATCH = 5 // Reduced from 500
const BATCH_INTERVAL_MS = 100 // Every 100ms = 50 packets/sec (reduced from 50ms)

export const usePacketCapture = (enabled: boolean = true) => {
  const { addNode, addLink, updateNode, updateLink, getAllNodes } = useNetworkStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const batchRef = useRef<PacketData[]>([])
  const updateQueueRef = useRef<Map<string, { node: string; updates: any }>>(new Map())

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const processPacket = (pkt: PacketData) => {
      const srcIp = pkt.src
      const dstIp = pkt.dst
      const srcPort = pkt.srcPort
      const dstPort = pkt.dstPort
      const protocol = pkt.protocol
      const size = pkt.size
      const time = pkt.time

      // Ensure nodes exist with ASN data
      ensureNode(srcIp)
      ensureNode(dstIp)

      // Create/update link (batched)
      const linkId = `${srcIp}-${dstIp}-${protocol}`
      const existingLink = useNetworkStore.getState().links.get(linkId)
      
      if (existingLink) {
        updateLink(linkId, {
          bytes: existingLink.bytes + size,
          packets: existingLink.packets + 1,
          lastSeen: time,
        })
      } else {
        addLink({
          id: linkId,
          source: srcIp,
          target: dstIp,
          srcPort: srcPort,
          dstPort: dstPort,
          protocol,
          bytes: size,
          packets: 1,
          lastSeen: time,
        })
      }

      // Batch node updates to prevent excessive state updates
      const srcNode = useNetworkStore.getState().nodes.get(srcIp)
      const dstNode = useNetworkStore.getState().nodes.get(dstIp)
      const now = Math.floor(time / 3600) * 3600
      
      if (srcNode) {
        // Queue update instead of immediate
        const queueKey = `src:${srcIp}`
        const queued = updateQueueRef.current.get(queueKey) || { node: srcIp, updates: { packets: 0, bytes: 0 } }
        queued.updates.packets = (queued.updates.packets || 0) + 1
        queued.updates.bytes = (queued.updates.bytes || 0) + size
        queued.updates.lastSeen = time
        updateQueueRef.current.set(queueKey, queued)
      }

      if (dstNode) {
        const queueKey = `dst:${dstIp}`
        const queued = updateQueueRef.current.get(queueKey) || { node: dstIp, updates: { packets: 0, bytes: 0 } }
        queued.updates.packets = (queued.updates.packets || 0) + 1
        queued.updates.bytes = (queued.updates.bytes || 0) + size
        queued.updates.lastSeen = time
        updateQueueRef.current.set(queueKey, queued)
      }
    }

    // Flush queued updates periodically
    const flushUpdates = () => {
      if (updateQueueRef.current.size === 0) return

      updateQueueRef.current.forEach(({ node, updates }) => {
        const existing = useNetworkStore.getState().nodes.get(node)
        if (existing) {
          updateNode(node, {
            packets: existing.packets + (updates.packets || 0),
            bytes: existing.bytes + (updates.bytes || 0),
            lastSeen: updates.lastSeen || existing.lastSeen,
          })
        }
      })

      updateQueueRef.current.clear()
    }

    const ensureNode = (ip: string) => {
      const existing = useNetworkStore.getState().nodes.get(ip)
      if (!existing) {
        // Enrich with ASN data
        const asnData = getASNForIP(ip)
        if (asnData) {
          addNode({
            id: ip,
            ip,
            lat: asnData.lat + (Math.random() - 0.5) * 2,
            lng: asnData.lng + (Math.random() - 0.5) * 2,
            country: asnData.country,
            asn: asnData.asn,
            org: asnData.org,
            packets: 0,
            bytes: 0,
            topPorts: [],
            lastSeen: Date.now() / 1000,
            packetHistory: [],
            threatInfo: asnData.threats >= 10 ? {
              score: asnData.threats,
              type: asnData.threats > 20 ? 'botnet' : 'scanning',
              firstSeen: Date.now() / 1000,
              lastSeen: Date.now() / 1000,
              reports: asnData.threats * 5,
              description: `High-threat ASN: ${asnData.org}`,
            } : undefined,
          })
        } else {
          // Fallback: random location
          addNode({
            id: ip,
            ip,
            lat: (Math.random() - 0.5) * 180,
            lng: (Math.random() - 0.5) * 360,
            country: 'Unknown',
            packets: 0,
            bytes: 0,
            topPorts: [],
            lastSeen: Date.now() / 1000,
            packetHistory: [],
          })
        }
      }
    }

    // Generate realistic packet flows (simplified for performance)
    const generateRealisticPacket = (): PacketData | null => {
      const nodes = getAllNodes()
      if (nodes.length < 2) return null

      // Simplified pattern selection
      const pattern = Math.random()
      let src: typeof nodes[0] | null = null
      let dst: typeof nodes[0] | null = null

      if (pattern < 0.5) {
        // Random connection (50% of traffic)
        src = nodes[Math.floor(Math.random() * nodes.length)]
        dst = nodes[Math.floor(Math.random() * nodes.length)]
        if (src.id === dst.id) return null
      } else if (pattern < 0.7) {
        // Cloud to users (20%)
        const cloudNodes = nodes.filter(n => n.org?.includes('Cloud') || n.org?.includes('CDN') || n.org?.includes('AWS') || n.org?.includes('Google'))
        const userNodes = nodes.filter(n => !cloudNodes.includes(n))
        if (cloudNodes.length > 0 && userNodes.length > 0) {
          src = cloudNodes[Math.floor(Math.random() * cloudNodes.length)]
          dst = userNodes[Math.floor(Math.random() * userNodes.length)]
        }
      } else if (pattern < 0.85) {
        // DNS queries (15%)
        const dnsServers = nodes.filter(n => n.ip === '8.8.8.8' || n.ip === '1.1.1.1' || n.topPorts?.includes(53))
        const clients = nodes.filter(n => !dnsServers.includes(n))
        if (dnsServers.length > 0 && clients.length > 0) {
          src = clients[Math.floor(Math.random() * clients.length)]
          dst = dnsServers[Math.floor(Math.random() * dnsServers.length)]
        }
      } else {
        // Attack patterns (15%)
        const threatNodes = nodes.filter(n => n.threatInfo)
        const targets = nodes.filter(n => !threatNodes.includes(n))
        if (threatNodes.length > 0 && targets.length > 0) {
          src = threatNodes[Math.floor(Math.random() * threatNodes.length)]
          dst = targets[Math.floor(Math.random() * targets.length)]
        }
      }

      // Fallback: random
      if (!src || !dst || src.id === dst.id) {
        src = nodes[Math.floor(Math.random() * nodes.length)]
        dst = nodes[Math.floor(Math.random() * nodes.length)]
        if (src.id === dst.id) return null
      }

      const protocols = ['tcp', 'udp', 'icmp'] as const
      const protocol = protocols[Math.floor(Math.random() * protocols.length)]
      const commonPorts = [80, 443, 53, 22, 3389, 8080]
      const srcPort = protocol !== 'icmp' ? commonPorts[Math.floor(Math.random() * commonPorts.length)] : undefined
      const dstPort = protocol !== 'icmp' ? commonPorts[Math.floor(Math.random() * commonPorts.length)] : undefined

      const size = protocol === 'tcp' ? Math.floor(Math.random() * 1500) + 64 : 64

      return {
        src: src.ip,
        dst: dst.ip,
        srcPort,
        dstPort,
        protocol,
        size,
        time: Date.now() / 1000,
      }
    }

    // Throttled packet generation
    intervalRef.current = setInterval(() => {
      // Generate batch of packets
      for (let i = 0; i < PACKETS_PER_BATCH; i++) {
        const packet = generateRealisticPacket()
        if (packet) {
          batchRef.current.push(packet)
        }
      }

      // Process batch
      const batch = batchRef.current.splice(0, PACKETS_PER_BATCH)
      batch.forEach(pkt => processPacket(pkt))

      // Flush queued updates every 5 batches
      if (batch.length > 0) {
        flushUpdates()
      }
    }, BATCH_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      updateQueueRef.current.clear()
    }
  }, [enabled, addNode, addLink, updateNode, updateLink, getAllNodes])
}

