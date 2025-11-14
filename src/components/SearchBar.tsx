/**
 * TOTAL OBSERVATION SEARCH
 * Search for IP, ASN, hostname, or domain - get complete analysis
 */

import { useState, KeyboardEvent } from 'react'
import { useTabStore } from '../store/tabStore'
import { TotalObservationTab } from './tabs/TotalObservationTab'

export const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const { addTab } = useTabStore()

  const detectSearchType = (query: string): 'ip' | 'asn' | 'hostname' | 'domain' | 'cidr' => {
    const trimmed = query.trim()
    
    // ASN format: AS12345 or ASN:12345
    if (/^ASN?:?\d+$/i.test(trimmed)) {
      return 'asn'
    }
    
    // CIDR format: 192.168.1.0/24
    if (/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(trimmed)) {
      return 'cidr'
    }
    
    // IP address format
    if (/^\d+\.\d+\.\d+\.\d+$/.test(trimmed)) {
      return 'ip'
    }
    
    // Domain format (contains dots, no spaces)
    if (/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/.test(trimmed)) {
      return 'domain'
    }
    
    // Hostname (contains dots or dashes, no spaces)
    if (/^[a-zA-Z0-9.-]+$/.test(trimmed)) {
      return 'hostname'
    }
    
    return 'ip' // Default to IP
  }

  const handleSearch = () => {
    const query = searchQuery.trim()
    if (!query) return

    setIsSearching(true)
    const searchType = detectSearchType(query)
    
    // Create total observation tab
    const tabId = `obs-${Date.now()}`
    addTab({
      id: tabId,
      title: `TOTAL OBSERVATION: ${query.toUpperCase()}`,
      type: 'scan',
      content: <TotalObservationTab target={query} searchType={searchType} />,
      data: { query, searchType },
    })

    setSearchQuery('')
    setIsSearching(false)
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="IP / ASN / Domain / Hostname"
          className="px-4 py-1.5 w-64 bg-tech-panel border border-tech-border text-tech-text text-xs font-mono focus:border-tech-primary focus:outline-none placeholder:text-tech-text-muted"
          disabled={isSearching}
        />
        {searchQuery && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-tech-text-muted font-mono">
            {detectSearchType(searchQuery).toUpperCase()}
          </div>
        )}
      </div>
      <button
        onClick={handleSearch}
        disabled={!searchQuery.trim() || isSearching}
        className="px-4 py-1.5 bg-tech-primary text-tech-bg text-xs font-mono uppercase tracking-wider hover:bg-tech-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSearching ? 'SCANNING...' : 'OBSERVE'}
      </button>
    </div>
  )
}
