// Simplified IP geolocation
// In production, use MaxMind GeoLite2 or ip2location-nodejs

const ASN_DB: Record<string, { asn: number; org: string }> = {
  // Common ASNs (simplified)
  '8.8.8': { asn: 15169, org: 'Google LLC' },
  '1.1.1': { asn: 13335, org: 'Cloudflare' },
  '208.67': { asn: 36692, org: 'OpenDNS' },
}

const COUNTRY_MAP: Record<string, { lat: number; lng: number; country: string }> = {
  '8.': { lat: 37.7749, lng: -122.4194, country: 'US' },
  '1.': { lat: 37.7749, lng: -122.4194, country: 'US' },
  '208.': { lat: 37.7749, lng: -122.4194, country: 'US' },
  '172.': { lat: 40.7128, lng: -74.0060, country: 'US' },
  '192.168': { lat: 0, lng: 0, country: 'Private' },
  '10.': { lat: 0, lng: 0, country: 'Private' },
}

export function enrichNode(ip: string) {
  const parts = ip.split('.')
  const prefix = parts.slice(0, 2).join('.')
  const prefix3 = parts.slice(0, 3).join('.')

  // Try to get ASN
  const asnData = ASN_DB[prefix3] || ASN_DB[prefix] || null

  // Get location (simplified - in production use real GeoIP)
  const location = COUNTRY_MAP[prefix] || {
    lat: (Math.random() - 0.5) * 180,
    lng: (Math.random() - 0.5) * 360,
    country: 'Unknown',
  }

  return {
    asn: asnData?.asn,
    org: asnData?.org,
    lat: location.lat,
    lng: location.lng,
    country: location.country,
  }
}

// Mock function for real IP lookup (replace with actual library)
export async function lookupIP(ip: string) {
  // In production: use MaxMind GeoLite2 or ip2location-nodejs
  return enrichNode(ip)
}

