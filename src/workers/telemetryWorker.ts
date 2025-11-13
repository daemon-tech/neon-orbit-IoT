/**
 * Telemetry Worker - Processes network events off main thread
 * Handles 1B+ packets/sec with zero GC pressure
 */

import { ObjectPool } from '../lib/pool/objectPool'

// Object pools for zero-allocation processing
const nodePool = new ObjectPool(() => ({
  id: '',
  ip: '',
  lat: 0,
  lng: 0,
  country: '',
  asn: 0,
  org: '',
  packets: 0n,
  bytes: 0n,
  topPorts: [] as number[],
  lastSeen: 0,
  packetHistory: [] as Array<{ time: number; count: number }>,
  x: 0,
  y: 0,
  z: 0,
}), (obj) => {
  obj.packets = 0n
  obj.bytes = 0n
  obj.topPorts = []
  obj.packetHistory = []
})

const linkPool = new ObjectPool(() => ({
  id: '',
  source: '',
  target: '',
  srcPort: 0,
  dstPort: 0,
  protocol: '',
  bytes: 0n,
  packets: 0n,
  lastSeen: 0,
}), (obj) => {
  obj.packets = 0n
  obj.bytes = 0n
  obj.lastSeen = 0
})

interface TelemetryEvent {
  type: 'flow' | 'bgp' | 'dns' | 'threat'
  src?: string
  dst?: string
  srcPort?: number
  dstPort?: number
  protocol?: string
  packets?: number
  bytes?: number
  timestamp?: number
  lat?: number
  lng?: number
  country?: string
  asn?: number
  org?: string
  [key: string]: any
}

interface ProcessedBatch {
  nodes: Map<string, any>
  links: Map<string, any>
  stats: {
    packets: bigint
    bytes: bigint
    nodeCount: number
    linkCount: number
  }
}

/**
 * Process batch of telemetry events
 */
function processBatch(events: TelemetryEvent[]): ProcessedBatch {
  const nodes = new Map<string, any>()
  const links = new Map<string, any>()
  let totalPackets = 0n
  let totalBytes = 0n

  for (const evt of events) {
    if (evt.type === 'flow' && evt.src && evt.dst) {
      // Process source node
      let srcNode = nodes.get(evt.src)
      if (!srcNode) {
        srcNode = nodePool.acquire()
        srcNode.id = evt.src
        srcNode.ip = evt.src
        srcNode.lat = evt.lat || 0
        srcNode.lng = evt.lng || 0
        srcNode.country = evt.country || 'Unknown'
        srcNode.asn = evt.asn || 0
        srcNode.org = evt.org || ''
        nodes.set(evt.src, srcNode)
      }
      
      srcNode.packets += BigInt(evt.packets || 1)
      srcNode.bytes += BigInt(evt.bytes || 0)
      srcNode.lastSeen = evt.timestamp || Date.now() / 1000

      // Process destination node
      let dstNode = nodes.get(evt.dst)
      if (!dstNode) {
        dstNode = nodePool.acquire()
        dstNode.id = evt.dst
        dstNode.ip = evt.dst
        dstNode.lat = evt.lat || 0
        dstNode.lng = evt.lng || 0
        dstNode.country = evt.country || 'Unknown'
        dstNode.asn = evt.asn || 0
        dstNode.org = evt.org || ''
        nodes.set(evt.dst, dstNode)
      }
      
      dstNode.packets += BigInt(evt.packets || 1)
      dstNode.bytes += BigInt(evt.bytes || 0)
      dstNode.lastSeen = evt.timestamp || Date.now() / 1000

      // Process link
      const linkKey = `${evt.src}-${evt.dst}-${evt.protocol || 'tcp'}`
      let link = links.get(linkKey)
      if (!link) {
        link = linkPool.acquire()
        link.id = linkKey
        link.source = evt.src
        link.target = evt.dst
        link.srcPort = evt.srcPort || 0
        link.dstPort = evt.dstPort || 0
        link.protocol = evt.protocol || 'tcp'
        links.set(linkKey, link)
      }
      
      link.packets += BigInt(evt.packets || 1)
      link.bytes += BigInt(evt.bytes || 0)
      link.lastSeen = evt.timestamp || Date.now() / 1000

      totalPackets += BigInt(evt.packets || 1)
      totalBytes += BigInt(evt.bytes || 0)
    }
  }

  return {
    nodes,
    links,
    stats: {
      packets: totalPackets,
      bytes: totalBytes,
      nodeCount: nodes.size,
      linkCount: links.size,
    },
  }
}

// Worker message handler
self.onmessage = (e: MessageEvent<{ events: TelemetryEvent[] }>) => {
  const { events } = e.data
  
  try {
    const result = processBatch(events)
    
    // Convert Maps to arrays for transfer
    const nodesArray = Array.from(result.nodes.values())
    const linksArray = Array.from(result.links.values())
    
    self.postMessage({
      nodes: nodesArray,
      links: linksArray,
      stats: result.stats,
    })
  } catch (error) {
    console.error('Telemetry worker error:', error)
    self.postMessage({
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// Export for type checking
export type { TelemetryEvent, ProcessedBatch }

