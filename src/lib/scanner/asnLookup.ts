/**
 * REAL ASN LOOKUP
 * Fetch accurate ASN data from public APIs
 */

export interface ASNLookupResult {
  asn: number
  org: string
  country: string
  lat?: number
  lng?: number
  type?: string
  tier?: 1 | 2 | 3
  peers?: number[]
  customers?: number[]
  providers?: number[]
  ipRanges?: Array<{ start: string; end: string; cidr: string }>
}

/**
 * Lookup ASN information from multiple sources
 * Priority: RIPE > IPinfo.io > bgp.tools > Fallback
 */
export async function lookupASN(asn: number): Promise<ASNLookupResult | null> {
  try {
    // Try RIPE WHOIS API first (most accurate for European ASNs)
    try {
      const response = await fetch(`https://stat.ripe.net/data/whois/data.json?resource=AS${asn}`, {
        signal: AbortSignal.timeout(8000),
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Parse RIPE response - check multiple record types
        if (data.data) {
          // Try IRR records first
          if (data.data.irr_records && data.data.irr_records.length > 0) {
            const records = data.data.irr_records[0] || []
            const orgRecord = records.find((r: any) => r.key === 'descr' || r.key === 'org-name' || r.key === 'org')
            const countryRecord = records.find((r: any) => r.key === 'country')
            
            if (orgRecord && orgRecord.value) {
              return {
                asn,
                org: orgRecord.value.trim(),
                country: countryRecord?.value || 'Unknown',
                type: inferASNType(orgRecord.value),
                tier: inferASNTier(orgRecord.value, asn),
              }
            }
          }
          
          // Try ASN records
          if (data.data.records && data.data.records.length > 0) {
            const records = data.data.records[0] || []
            const orgRecord = records.find((r: any) => r.key === 'descr' || r.key === 'org-name' || r.key === 'org')
            const countryRecord = records.find((r: any) => r.key === 'country')
            
            if (orgRecord && orgRecord.value) {
              return {
                asn,
                org: orgRecord.value.trim(),
                country: countryRecord?.value || 'Unknown',
                type: inferASNType(orgRecord.value),
                tier: inferASNTier(orgRecord.value, asn),
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn(`RIPE lookup failed for AS${asn}:`, error)
    }

    // Try IPinfo.io (good for global coverage)
    try {
      const response = await fetch(`https://ipinfo.io/AS${asn}/json`, {
        signal: AbortSignal.timeout(8000),
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Parse IPinfo.io response
        if (data.org || data.asn || data.name) {
          const asnNum = data.asn ? parseInt(data.asn.replace(/AS/i, '')) : asn
          const org = (data.org || data.name || `ASN ${asn}`).trim()
          
          // Parse location if available
          let lat: number | undefined
          let lng: number | undefined
          if (data.loc) {
            const [latStr, lngStr] = data.loc.split(',')
            lat = parseFloat(latStr.trim())
            lng = parseFloat(lngStr.trim())
          }
          
          return {
            asn: asnNum,
            org: org,
            country: data.country || 'Unknown',
            lat,
            lng,
            type: inferASNType(org),
            tier: inferASNTier(org, asnNum),
          }
        }
      }
    } catch (error) {
      console.warn(`IPinfo.io lookup failed for AS${asn}:`, error)
    }

    // Try bgp.tools API (community-maintained, very accurate)
    try {
      const response = await fetch(`https://bgp.tools/as/${asn}.json`, {
        signal: AbortSignal.timeout(8000),
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.name || data.org || data.description) {
          const org = (data.name || data.org || data.description || `ASN ${asn}`).trim()
          return {
            asn,
            org: org,
            country: data.country || data.country_code || 'Unknown',
            lat: data.lat,
            lng: data.lng,
            type: inferASNType(org),
            tier: inferASNTier(org, asn),
          }
        }
      }
    } catch (error) {
      console.warn(`bgp.tools lookup failed for AS${asn}:`, error)
    }

    // Try RIPE RIS API (alternative endpoint)
    try {
      const response = await fetch(`https://stat.ripe.net/data/as-overview/data.json?resource=AS${asn}`, {
        signal: AbortSignal.timeout(8000),
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.data && data.data.holder) {
          return {
            asn,
            org: data.data.holder.trim(),
            country: data.data.country || 'Unknown',
            type: inferASNType(data.data.holder),
            tier: inferASNTier(data.data.holder, asn),
          }
        }
      }
    } catch (error) {
      console.warn(`RIPE RIS lookup failed for AS${asn}:`, error)
    }

    return null
  } catch (error) {
    console.error(`ASN lookup failed for AS${asn}:`, error)
    return null
  }
}

/**
 * Infer ASN type from organization name
 */
function inferASNType(org: string): string {
  const orgLower = org.toLowerCase()
  
  if (orgLower.includes('cloud') || orgLower.includes('aws') || orgLower.includes('azure') || orgLower.includes('gcp')) {
    return 'Cloud'
  }
  if (orgLower.includes('cdn') || orgLower.includes('akamai') || orgLower.includes('cloudflare')) {
    return 'CDN'
  }
  if (orgLower.includes('isp') || orgLower.includes('telecom') || orgLower.includes('communications') || orgLower.includes('network')) {
    return 'ISP'
  }
  if (orgLower.includes('government') || orgLower.includes('gov')) {
    return 'Government'
  }
  if (orgLower.includes('enterprise') || orgLower.includes('corp') || orgLower.includes('inc') || orgLower.includes('ltd')) {
    return 'Enterprise'
  }
  
  return 'ISP' // Default
}

/**
 * Infer ASN tier from organization name and ASN number
 */
function inferASNTier(org: string, asn: number): 1 | 2 | 3 {
  // Known Tier 1 ASNs
  const tier1ASNs = [174, 3356, 2914, 1299, 701, 3257, 6453, 6762, 4837, 4134, 4766]
  if (tier1ASNs.includes(asn)) return 1
  
  const orgLower = org.toLowerCase()
  
  // Major cloud/CDN providers are usually Tier 1
  if (orgLower.includes('amazon') || orgLower.includes('google') || orgLower.includes('microsoft') || 
      orgLower.includes('cloudflare') || orgLower.includes('akamai')) {
    return 1
  }
  
  // Large ISPs are usually Tier 2
  if (orgLower.includes('telecom') || orgLower.includes('communications') || orgLower.includes('carrier')) {
    return 2
  }
  
  // Lower ASN numbers are often Tier 1 or 2
  if (asn < 10000) return 2
  
  // Default to Tier 3
  return 3
}

/**
 * Batch lookup multiple ASNs (with rate limiting)
 */
export async function lookupASNs(asns: number[]): Promise<Map<number, ASNLookupResult>> {
  const results = new Map<number, ASNLookupResult>()
  
  // Process in batches of 5 to avoid rate limiting
  const batchSize = 5
  for (let i = 0; i < asns.length; i += batchSize) {
    const batch = asns.slice(i, i + batchSize)
    
    await Promise.all(
      batch.map(async (asn) => {
        const result = await lookupASN(asn)
        if (result) {
          results.set(asn, result)
        }
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200))
      })
    )
    
    // Delay between batches
    if (i + batchSize < asns.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return results
}

