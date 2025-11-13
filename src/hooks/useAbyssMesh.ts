/**
 * ABYSS MESH v2 - High-Performance Telemetry Hook
 * Web Worker + Batching for zero-lag processing
 */

import { useEffect, useRef, useCallback } from 'react'
import { useNetworkStore } from '../store/networkStore'
import { RingBuffer } from '../lib/perf/ringBuffer'

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
}

const BATCH_SIZE = 10000
const BATCH_INTERVAL = 50 // ms

export const useAbyssMesh = (enabled: boolean = true) => {
  const { addNode, updateNode, addLink, updateLink } = useNetworkStore()
  const workerRef = useRef<Worker | null>(null)
  const eventBufferRef = useRef<RingBuffer<TelemetryEvent>>(
    new RingBuffer<TelemetryEvent>(BATCH_SIZE * 2, () => ({
      type: 'flow',
      src: '',
      dst: '',
      packets: 0,
      bytes: 0,
      timestamp: 0,
    }))
  )
  const batchTimeoutRef = useRef<number | null>(null)
  const statsRef = useRef({
    packetsPerSec: 0n,
    bytesPerSec: 0n,
    lastUpdate: performance.now(),
  })

  // Batch update function
  const flushBatch = useCallback(() => {
    if (eventBufferRef.current.getSize() === 0) {
      batchTimeoutRef.current = window.setTimeout(flushBatch, BATCH_INTERVAL)
      return
    }

    const events = eventBufferRef.current.toArray()
    eventBufferRef.current.clear()

    if (workerRef.current && events.length > 0) {
      workerRef.current.postMessage({ events })
    }

    // Schedule next batch
    batchTimeoutRef.current = window.setTimeout(flushBatch, BATCH_INTERVAL)
  }, [])

  // Initialize worker
  useEffect(() => {
    if (!enabled) {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current)
        batchTimeoutRef.current = null
      }
      return
    }

    // Create worker
    try {
      const worker = new Worker(
        new URL('../workers/telemetryWorker.ts', import.meta.url),
        { type: 'module' }
      )

      worker.onmessage = (e) => {
        const { nodes, links, stats, error } = e.data

        if (error) {
          console.error('Worker error:', error)
          return
        }

        // Batch update store (single update per batch)
        if (nodes && Array.isArray(nodes)) {
          nodes.forEach((node: any) => {
            const existing = useNetworkStore.getState().nodes.get(node.id)
            if (existing) {
              updateNode(node.id, {
                packets: Number(node.packets),
                bytes: Number(node.bytes),
                lastSeen: node.lastSeen,
                lat: node.lat,
                lng: node.lng,
                country: node.country,
                asn: node.asn,
                org: node.org,
              })
            } else {
              addNode({
                id: node.id,
                ip: node.ip || node.id,
                lat: node.lat || 0,
                lng: node.lng || 0,
                country: node.country || 'Unknown',
                asn: node.asn,
                org: node.org,
                packets: Number(node.packets),
                bytes: Number(node.bytes),
                topPorts: node.topPorts || [],
                lastSeen: node.lastSeen || Date.now() / 1000,
                packetHistory: node.packetHistory || [],
              })
            }
          })
        }

        if (links && Array.isArray(links)) {
          links.forEach((link: any) => {
            const existing = useNetworkStore.getState().links.get(link.id)
            if (existing) {
              updateLink(link.id, {
                packets: Number(link.packets),
                bytes: Number(link.bytes),
                lastSeen: link.lastSeen,
              })
            } else {
              addLink({
                id: link.id,
                source: link.source,
                target: link.target,
                srcPort: link.srcPort,
                dstPort: link.dstPort,
                protocol: link.protocol,
                bytes: Number(link.bytes),
                packets: Number(link.packets),
                lastSeen: link.lastSeen || Date.now() / 1000,
              })
            }
          })
        }

        // Update stats
        if (stats) {
          const now = performance.now()
          const delta = (now - statsRef.current.lastUpdate) / 1000
          statsRef.current.lastUpdate = now
          
          if (delta > 0) {
            statsRef.current.packetsPerSec = stats.packets / BigInt(Math.floor(delta * 10))
            statsRef.current.bytesPerSec = stats.bytes / BigInt(Math.floor(delta * 10))
          }
        }
      }

      worker.onerror = (error) => {
        console.error('Worker error:', error)
      }

      workerRef.current = worker

      // Start batching
      flushBatch()
    } catch (error) {
      console.error('Failed to create worker:', error)
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current)
        batchTimeoutRef.current = null
      }
    }
  }, [enabled, addNode, updateNode, addLink, updateLink, flushBatch])

  // Function to add event (called by data sources)
  const addEvent = useCallback((event: TelemetryEvent) => {
    if (enabled && eventBufferRef.current) {
      eventBufferRef.current.push(event)
    }
  }, [enabled])

  return {
    addEvent,
    stats: statsRef.current,
  }
}

