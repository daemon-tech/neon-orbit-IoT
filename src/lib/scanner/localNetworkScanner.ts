/**
 * LOCAL NETWORK SCANNER - Full LAN Domination
 * ARP scan + ICMP ping + Port scan + OS fingerprint + MAC lookup
 */

import { NetworkNode } from '../../store/networkStore'

export interface LocalDevice {
  ip: string
  mac?: string
  vendor?: string
  hostname?: string
  os?: string
  osVersion?: string
  openPorts: Array<{ port: number; service: string; version?: string; banner?: string }>
  isAlive: boolean
  lastSeen: number
  latency?: number
  deviceType: 'server' | 'router' | 'workstation' | 'iot' | 'printer' | 'unknown'
}

// MAC Vendor Database (simplified)
const MAC_VENDORS: Record<string, string> = {
  '00:50:56': 'VMware',
  '00:0C:29': 'VMware',
  '00:1B:21': 'Intel',
  '00:1E:68': 'Apple',
  '00:23:12': 'Cisco',
  '00:25:00': 'Apple',
  '08:00:27': 'VirtualBox',
  '52:54:00': 'QEMU',
  'B8:27:EB': 'Raspberry Pi',
  'DC:A6:32': 'Raspberry Pi',
}

// OS Fingerprinting (simplified)
const OS_FINGERPRINTS: Record<string, { os: string; version?: string }> = {
  'Windows': { os: 'Windows', version: '10/11' },
  'Linux': { os: 'Linux', version: 'Kernel 5.x' },
  'macOS': { os: 'macOS', version: 'Monterey/Ventura' },
  'iOS': { os: 'iOS', version: '16+' },
  'Android': { os: 'Android', version: '12+' },
}

// Service banners and versions
const SERVICE_BANNERS: Record<number, { service: string; versions: string[] }> = {
  22: { service: 'SSH', versions: ['OpenSSH_8.0', 'OpenSSH_7.9', 'Dropbear'] },
  80: { service: 'HTTP', versions: ['Apache/2.4', 'nginx/1.20', 'IIS/10.0'] },
  443: { service: 'HTTPS', versions: ['Apache/2.4', 'nginx/1.20', 'IIS/10.0'] },
  3389: { service: 'RDP', versions: ['Microsoft Terminal Services'] },
  3306: { service: 'MySQL', versions: ['8.0', '5.7', '5.6'] },
  5432: { service: 'PostgreSQL', versions: ['14', '13', '12'] },
  8080: { service: 'HTTP-Proxy', versions: ['Squid', 'Apache'] },
  21: { service: 'FTP', versions: ['vsftpd', 'FileZilla'] },
  25: { service: 'SMTP', versions: ['Postfix', 'Sendmail'] },
  53: { service: 'DNS', versions: ['BIND', 'dnsmasq'] },
}

// Generate MAC address from IP (deterministic for demo)
function generateMAC(ip: string): string {
  const parts = ip.split('.').map(Number)
  return [
    `00:${parts[0].toString(16).padStart(2, '0')}`,
    `${parts[1].toString(16).padStart(2, '0')}:${parts[2].toString(16).padStart(2, '0')}`,
    `${parts[3].toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 255).toString(16).padStart(2, '0')}`,
    Math.floor(Math.random() * 255).toString(16).padStart(2, '0'),
  ].join(':')
}

// Get vendor from MAC
function getVendorFromMAC(mac: string): string | undefined {
  const prefix = mac.substring(0, 8).toUpperCase()
  return MAC_VENDORS[prefix] || 'Unknown'
}

// Detect device type from open ports
function detectDeviceType(ports: number[]): LocalDevice['deviceType'] {
  if (ports.includes(3389)) return 'workstation'
  if (ports.includes(80) || ports.includes(443)) {
    if (ports.includes(22) || ports.includes(3306)) return 'server'
    return 'router'
  }
  if (ports.includes(9100) || ports.includes(515)) return 'printer'
  if (ports.includes(8080) || ports.includes(1883)) return 'iot'
  return 'unknown'
}

// Simulate ARP scan + ICMP ping
export async function scanLocalNetwork(
  ipRange: string[],
  onProgress?: (progress: number, device?: LocalDevice) => void
): Promise<LocalDevice[]> {
  const devices: LocalDevice[] = []
  const total = ipRange.length

  for (let i = 0; i < ipRange.length; i++) {
    const ip = ipRange[i]
    
    // Simulate ping (70% alive rate for demo)
    const isAlive = Math.random() > 0.3
    if (!isAlive) {
      onProgress?.(((i + 1) / total) * 100)
      continue
    }

    // Generate MAC
    const mac = generateMAC(ip)
    const vendor = getVendorFromMAC(mac)

    // Simulate port scan (1-65535, but only check common ports for performance)
    const commonPorts = [22, 23, 25, 53, 80, 135, 139, 443, 445, 3389, 3306, 5432, 8080, 8443, 9100, 1883]
    const openPorts: LocalDevice['openPorts'] = []

    for (const port of commonPorts) {
      // 30% chance port is open
      if (Math.random() > 0.7) {
        const serviceInfo = SERVICE_BANNERS[port]
        const version = serviceInfo?.versions[Math.floor(Math.random() * serviceInfo.versions.length)]
        const banner = serviceInfo ? `${serviceInfo.service} ${version || ''}`.trim() : undefined

        openPorts.push({
          port,
          service: serviceInfo?.service || 'Unknown',
          version,
          banner,
        })
      }
    }

    // Detect OS from open ports and services
    let os = 'Unknown'
    let osVersion: string | undefined
    if (openPorts.some(p => p.port === 3389)) {
      os = 'Windows'
      osVersion = '10/11'
    } else if (openPorts.some(p => p.port === 22)) {
      os = 'Linux'
      osVersion = 'Kernel 5.x'
    } else if (openPorts.some(p => p.service === 'HTTP' && p.version?.includes('IIS'))) {
      os = 'Windows Server'
    }

    // Detect device type
    const deviceType = detectDeviceType(openPorts.map(p => p.port))

    // Simulate latency
    const latency = Math.floor(Math.random() * 50) + 1

    const device: LocalDevice = {
      ip,
      mac,
      vendor,
      hostname: `device-${ip.replace(/\./g, '-')}`,
      os,
      osVersion,
      openPorts,
      isAlive: true,
      lastSeen: Date.now() / 1000,
      latency,
      deviceType,
    }

    devices.push(device)
    onProgress?.(((i + 1) / total) * 100, device)
    
    // Small delay to simulate real scanning
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  return devices
}

// Convert LocalDevice to NetworkNode
export function deviceToNode(device: LocalDevice): NetworkNode {
  return {
    id: device.ip,
    ip: device.ip,
    lat: 0, // Local network - no real geolocation
    lng: 0,
    country: 'LAN',
    city: 'Local Network',
    region: 'Private',
    hostname: device.hostname,
    org: device.vendor,
    packets: 0,
    bytes: 0,
    topPorts: device.openPorts.map(p => p.port),
    lastSeen: device.lastSeen,
    packetHistory: [],
    isPrivate: true,
    deviceType: device.deviceType,
    os: device.os,
    services: device.openPorts.map(p => p.service),
  }
}

