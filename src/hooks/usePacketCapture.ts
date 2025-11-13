import { useEffect, useRef } from 'react'
import { useNetworkStore } from '../store/networkStore'

interface PacketData {
  src: string
  dst: string
  srcPort?: number
  dstPort?: number
  protocol: string
  size: number
  time: number
}

export const usePacketCapture = (enabled: boolean = true) => {
  const { addNode, addLink, updateNode, updateLink, getAllNodes } = useNetworkStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

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

      // Ensure nodes exist
      ensureNode(srcIp)
      ensureNode(dstIp)

      // Create/update link
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

      // Update node stats
      const srcNode = useNetworkStore.getState().nodes.get(srcIp)
      const dstNode = useNetworkStore.getState().nodes.get(dstIp)
      const now = Math.floor(time / 3600) * 3600 // Round to hour
      
      if (srcNode) {
        const topPorts = [...(srcNode.topPorts || [])]
        if (srcPort && !topPorts.includes(srcPort)) {
          topPorts.push(srcPort)
          topPorts.sort((a, b) => b - a)
          topPorts.splice(5) // Keep top 5
        }
        
        const packetHistory = [...(srcNode.packetHistory || [])]
        const historyEntry = packetHistory.find((p) => p.time === now)
        if (historyEntry) {
          historyEntry.count += 1
        } else {
          packetHistory.push({ time: now, count: 1 })
          packetHistory.sort((a, b) => a.time - b.time)
          packetHistory.splice(-24) // Keep last 24 hours
        }
        
        updateNode(srcIp, {
          packets: srcNode.packets + 1,
          bytes: srcNode.bytes + size,
          lastSeen: time,
          topPorts,
          packetHistory,
        })
      }

      if (dstNode) {
        const topPorts = [...(dstNode.topPorts || [])]
        if (dstPort && !topPorts.includes(dstPort)) {
          topPorts.push(dstPort)
          topPorts.sort((a, b) => b - a)
          topPorts.splice(5) // Keep top 5
        }
        
        const packetHistory = [...(dstNode.packetHistory || [])]
        const historyEntry = packetHistory.find((p) => p.time === now)
        if (historyEntry) {
          historyEntry.count += 1
        } else {
          packetHistory.push({ time: now, count: 1 })
          packetHistory.sort((a, b) => a.time - b.time)
          packetHistory.splice(-24) // Keep last 24 hours
        }
        
        updateNode(dstIp, {
          packets: dstNode.packets + 1,
          bytes: dstNode.bytes + size,
          lastSeen: time,
          topPorts,
          packetHistory,
        })
      }
    }

    const ensureNode = (ip: string) => {
      const existing = useNetworkStore.getState().nodes.get(ip)
      if (!existing) {
        // Will be enriched by geolocation hook
        addNode({
          id: ip,
          ip,
          lat: 0,
          lng: 0,
          country: 'Unknown',
          packets: 0,
          bytes: 0,
          topPorts: [],
          lastSeen: Date.now() / 1000,
          packetHistory: [],
        })
      }
    }

    // Generate mock packets (browser-compatible)
    const generateMockPacket = (): PacketData => {
      const nodes = getAllNodes()
      if (nodes.length < 2) return null as any

      const src = nodes[Math.floor(Math.random() * nodes.length)]
      const dst = nodes[Math.floor(Math.random() * nodes.length)]
      
      if (src.id === dst.id) return null as any

      const protocols = ['tcp', 'udp', 'icmp']
      const protocol = protocols[Math.floor(Math.random() * protocols.length)]
      const commonPorts = [80, 443, 53, 22, 3389, 8080, 3306, 5432]

      return {
        src: src.ip,
        dst: dst.ip,
        srcPort: protocol !== 'icmp' ? commonPorts[Math.floor(Math.random() * commonPorts.length)] : undefined,
        dstPort: protocol !== 'icmp' ? commonPorts[Math.floor(Math.random() * commonPorts.length)] : undefined,
        protocol,
        size: Math.floor(Math.random() * 1500) + 64,
        time: Date.now() / 1000,
      }
    }

    // Generate packets at a realistic rate
    intervalRef.current = setInterval(() => {
      // Generate 5-10 packets per interval
      const packetCount = Math.floor(Math.random() * 6) + 5
      for (let i = 0; i < packetCount; i++) {
        const packet = generateMockPacket()
        if (packet) {
          processPacket(packet)
        }
      }
    }, 200) // Every 200ms = ~25-50 packets/sec

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, addNode, addLink, updateNode, updateLink, getAllNodes])
}
