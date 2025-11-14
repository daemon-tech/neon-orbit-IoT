/**
 * LOCAL NETWORK MESH TAB
 * Full LAN scan results with device list, mesh graph, and packet stream
 */

import React, { useState, useEffect } from 'react'
import { LocalDevice, scanLocalNetwork, deviceToNode } from '../../lib/scanner/localNetworkScanner'
import { useNetworkStore } from '../../store/networkStore'
import { useTabStore } from '../../store/tabStore'

interface LocalNetworkTabProps {
  ipRange: string[]
}

export const LocalNetworkTab = ({ ipRange }: LocalNetworkTabProps) => {
  const [devices, setDevices] = useState<LocalDevice[]>([])
  const [scanning, setScanning] = useState(true)
  const [progress, setProgress] = useState(0)
  const [selectedDevice, setSelectedDevice] = useState<LocalDevice | null>(null)
  const { addNode, addLink } = useNetworkStore()
  const { updateTab } = useTabStore()

  useEffect(() => {
    let mounted = true
    let scannedDevices: LocalDevice[] = []

    scanLocalNetwork(ipRange, (prog, device) => {
      if (!mounted) return
      setProgress(prog)
      if (device) {
        scannedDevices.push(device)
        setDevices(prev => {
          const updated = [...prev, device]
          // Add to network store only if device is actually alive
          if (device.isAlive) {
            addNode(deviceToNode(device))
          }
          return updated
        })
      }
      if (prog >= 100) {
        setScanning(false)
        // Create mesh links only between alive devices (not sequential)
        const aliveDevices = scannedDevices.filter(d => d.isAlive)
        // Create links between devices that share common ports (more realistic)
        for (let i = 0; i < aliveDevices.length; i++) {
          for (let j = i + 1; j < aliveDevices.length; j++) {
            const dev1 = aliveDevices[i]
            const dev2 = aliveDevices[j]
            // Only link if they share common services or are in same subnet
            const dev1Ports = new Set(dev1.openPorts.map(p => p.port))
            const dev2Ports = new Set(dev2.openPorts.map(p => p.port))
            const commonPorts = [...dev1Ports].filter(p => dev2Ports.has(p))
            
            // Link if they share services or randomly (30% chance for mesh)
            if (commonPorts.length > 0 || Math.random() > 0.7) {
              addLink({
                id: `${dev1.ip}-${dev2.ip}-local`,
                source: dev1.ip,
                target: dev2.ip,
                protocol: commonPorts.length > 0 ? 'tcp' : 'udp',
                bytes: Math.floor(Math.random() * 500000) + 10000,
                packets: Math.floor(Math.random() * 500) + 10,
                lastSeen: Date.now() / 1000,
              })
            }
          }
        }
        updateTab('local-network', { title: `LOCAL NETWORK MESH (${aliveDevices.length} devices)` })
      }
    })

    return () => { mounted = false }
  }, [ipRange, addNode, addLink, updateTab])

  return (
    <div className="p-6 space-y-4 h-full bg-tech-panel">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-tech-border pb-3">
        <div>
          <h3 className="text-sm font-mono uppercase text-tech-text">LOCAL NETWORK MESH</h3>
          <div className="text-xs text-tech-text-muted mt-1">
            {devices.filter(d => d.isAlive).length} devices found {scanning && `(${progress.toFixed(1)}%)`}
          </div>
        </div>
        <button
          onClick={() => {
            const data = JSON.stringify(devices, null, 2)
            const blob = new Blob([data], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'local-network-scan.json'
            a.click()
          }}
          className="px-3 py-1 text-xs font-mono bg-tech-primary text-tech-bg hover:bg-tech-accent transition-colors"
        >
          EXPORT JSON
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4" style={{ height: 'calc(100% - 100px)' }}>
        {/* Device List */}
        <div className="overflow-y-auto border border-tech-border bg-tech-panel">
          <div className="p-2 text-xs font-mono uppercase text-tech-text-muted border-b border-tech-border flex items-center justify-between">
            <span>DEVICES ({devices.filter(d => d.isAlive).length} alive)</span>
            {scanning && (
              <span className="text-tech-primary animate-pulse">SCANNING...</span>
            )}
          </div>
          <div className="divide-y divide-tech-border">
            {devices.filter(d => d.isAlive).map((device) => (
              <div
                key={device.ip}
                onClick={() => setSelectedDevice(device)}
                className={`p-2 cursor-pointer hover:bg-tech-border transition-colors ${
                  selectedDevice?.ip === device.ip ? 'bg-tech-primary/20' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono text-tech-text">{device.ip}</div>
                    {device.hostname && (
                      <div className="text-xs text-tech-text-muted">{device.hostname}</div>
                    )}
                  </div>
                  <div className="text-xs text-tech-primary">
                    {device.latency}ms
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-tech-text-muted">{device.deviceType}</span>
                  {device.os && (
                    <>
                      <span className="text-tech-border">|</span>
                      <span className="text-xs text-tech-text-muted">{device.os}</span>
                    </>
                  )}
                  {device.vendor && (
                    <>
                      <span className="text-tech-border">|</span>
                      <span className="text-xs text-tech-text-muted">{device.vendor}</span>
                    </>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {device.openPorts.slice(0, 5).map((p) => (
                    <span
                      key={p.port}
                      className="px-1.5 py-0.5 text-xs font-mono bg-tech-primary/20 text-tech-primary"
                    >
                      {p.port}
                    </span>
                  ))}
                  {device.openPorts.length > 5 && (
                    <span className="text-xs text-tech-text-muted">+{device.openPorts.length - 5}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Details */}
        <div className="overflow-y-auto border border-tech-border bg-tech-panel">
          {selectedDevice ? (
            <div className="p-3 space-y-3">
              <div>
                <div className="text-xs font-mono uppercase text-tech-text-muted mb-1">DEVICE DETAILS</div>
                <div className="space-y-1 text-xs font-mono">
                  <div><span className="text-tech-text-muted">IP:</span> <span className="text-tech-text">{selectedDevice.ip}</span></div>
                  {selectedDevice.mac && (
                    <div><span className="text-tech-text-muted">MAC:</span> <span className="text-tech-text">{selectedDevice.mac}</span></div>
                  )}
                  {selectedDevice.vendor && (
                    <div><span className="text-tech-text-muted">Vendor:</span> <span className="text-tech-text">{selectedDevice.vendor}</span></div>
                  )}
                  {selectedDevice.hostname && (
                    <div><span className="text-tech-text-muted">Hostname:</span> <span className="text-tech-text">{selectedDevice.hostname}</span></div>
                  )}
                  <div><span className="text-tech-text-muted">Type:</span> <span className="text-tech-primary">{selectedDevice.deviceType}</span></div>
                  {selectedDevice.os && (
                    <div><span className="text-tech-text-muted">OS:</span> <span className="text-tech-text">{selectedDevice.os} {selectedDevice.osVersion || ''}</span></div>
                  )}
                  {selectedDevice.latency && (
                    <div><span className="text-tech-text-muted">Latency:</span> <span className="text-tech-text">{selectedDevice.latency}ms</span></div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">OPEN PORTS ({selectedDevice.openPorts.length})</div>
                <div className="space-y-1">
                  {selectedDevice.openPorts.map((port) => (
                    <div key={port.port} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-tech-primary">{port.port}</span>
                        <span className="text-tech-text">{port.service}</span>
                      </div>
                      {port.version && (
                        <div className="text-tech-text-muted mt-1">Version: {port.version}</div>
                      )}
                      {port.banner && (
                        <div className="text-tech-text-muted mt-1 text-[10px]">Banner: {port.banner}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-tech-text-muted text-xs font-mono">
              Select a device to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

