import { useEffect, useRef } from 'react'
import { useNetworkStore } from '../store/networkStore'
import { spawn, ChildProcess } from 'child_process'

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
  const processRef = useRef<ChildProcess | null>(null)
  const bufferRef = useRef<string>('')

  useEffect(() => {
    if (!enabled) {
      if (processRef.current) {
        processRef.current.kill()
        processRef.current = null
      }
      return
    }

    // Check if tshark is available
    const checkTshark = spawn('which', ['tshark'])
    checkTshark.on('close', (code) => {
      if (code !== 0) {
        console.warn('tshark not found. Using mock data mode.')
        startMockCapture()
        return
      }

      startRealCapture()
    })

    const startRealCapture = () => {
      try {
        // Real tshark capture
        const proc = spawn('tshark', [
          '-i', 'any',
          '-f', 'tcp or udp or icmp',
          '-T', 'json',
          '-e', 'frame.time_epoch',
          '-e', 'ip.src',
          '-e', 'ip.dst',
          '-e', 'tcp.srcport',
          '-e', 'tcp.dstport',
          '-e', 'udp.srcport',
          '-e', 'udp.dstport',
          '-e', 'ip.proto',
          '-e', 'frame.len',
          '-l' // Line buffered
        ], {
          stdio: ['ignore', 'pipe', 'pipe']
        })

        processRef.current = proc

        proc.stdout.on('data', (data: Buffer) => {
          bufferRef.current += data.toString()
          const lines = bufferRef.current.split('\n')
          bufferRef.current = lines.pop() || ''

          lines.forEach((line) => {
            if (!line.trim()) return
            try {
              const packet = JSON.parse(line)
              processPacket(packet)
            } catch (e) {
              // Skip invalid JSON
            }
          })
        })

        proc.stderr.on('data', (data: Buffer) => {
          console.error('tshark error:', data.toString())
        })

        proc.on('close', (code) => {
          console.log('tshark process closed:', code)
        })
      } catch (error) {
        console.error('Failed to start tshark:', error)
        startMockCapture()
      }
    }

    const startMockCapture = () => {
      // Mock packet generation for development
      const interval = setInterval(() => {
        const nodes = getAllNodes()
        if (nodes.length < 2) return

        const src = nodes[Math.floor(Math.random() * nodes.length)]
        const dst = nodes[Math.floor(Math.random() * nodes.length)]
        
        if (src.id === dst.id) return

        const packet: PacketData = {
          src: src.ip,
          dst: dst.ip,
          srcPort: Math.floor(Math.random() * 65535),
          dstPort: [80, 443, 53, 22, 3389][Math.floor(Math.random() * 5)],
          protocol: ['tcp', 'udp'][Math.floor(Math.random() * 2)],
          size: Math.floor(Math.random() * 1500) + 64,
          time: Date.now() / 1000,
        }

        processPacket({ layers: mockPacketToLayers(packet) })
      }, 100) // 10 packets/sec mock rate

      return () => clearInterval(interval)
    }

    const mockPacketToLayers = (pkt: PacketData) => ({
      'frame.time_epoch': [pkt.time.toString()],
      'ip.src': [pkt.src],
      'ip.dst': [pkt.dst],
      [`${pkt.protocol}.srcport`]: pkt.srcPort ? [pkt.srcPort.toString()] : undefined,
      [`${pkt.protocol}.dstport`]: pkt.dstPort ? [pkt.dstPort.toString()] : undefined,
      'ip.proto': [pkt.protocol === 'tcp' ? '6' : pkt.protocol === 'udp' ? '17' : '1'],
      'frame.len': [pkt.size.toString()],
    })

    const processPacket = (packet: any) => {
      const layers = packet.layers || packet
      if (!layers['ip.src'] || !layers['ip.dst']) return

      const srcIp = layers['ip.src'][0]
      const dstIp = layers['ip.dst'][0]
      const srcPort = layers['tcp.srcport']?.[0] || layers['udp.srcport']?.[0]
      const dstPort = layers['tcp.dstport']?.[0] || layers['udp.dstport']?.[0]
      const protoNum = layers['ip.proto']?.[0] || '6'
      const size = parseInt(layers['frame.len']?.[0] || '0')
      const time = parseFloat(layers['frame.time_epoch']?.[0] || Date.now().toString())

      const protocol = protoNum === '6' ? 'tcp' : protoNum === '17' ? 'udp' : 'icmp'

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
          srcPort: srcPort ? parseInt(srcPort) : undefined,
          dstPort: dstPort ? parseInt(dstPort) : undefined,
          protocol,
          bytes: size,
          packets: 1,
          lastSeen: time,
        })
      }

      // Update node stats
      updateNode(srcIp, {
        packets: (useNetworkStore.getState().nodes.get(srcIp)?.packets || 0) + 1,
        bytes: (useNetworkStore.getState().nodes.get(srcIp)?.bytes || 0) + size,
        lastSeen: time,
      })

      updateNode(dstIp, {
        packets: (useNetworkStore.getState().nodes.get(dstIp)?.packets || 0) + 1,
        bytes: (useNetworkStore.getState().nodes.get(dstIp)?.bytes || 0) + size,
        lastSeen: time,
      })
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
        })
      }
    }

    return () => {
      if (processRef.current) {
        processRef.current.kill()
        processRef.current = null
      }
    }
  }, [enabled, addNode, addLink, updateNode, updateLink, getAllNodes])
}

