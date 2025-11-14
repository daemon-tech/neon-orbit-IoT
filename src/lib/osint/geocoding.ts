/**
 * REVERSE GEOCODING
 * Convert coordinates to location names
 */

export interface LocationInfo {
  name: string
  country: string
  city?: string
  region?: string
  address?: string
  building?: string
  houseNumber?: string
  street?: string
  postalCode?: string
  displayName?: string
}

/**
 * Reverse geocode coordinates to precise location name
 * Uses Nominatim (OpenStreetMap) with high zoom for building-level accuracy
 * Zoom levels: 3=country, 5=state, 8=city, 10=street, 18=building
 */
export async function reverseGeocode(lat: number, lng: number): Promise<LocationInfo> {
  try {
    // First try high-zoom (building level) for precise location
    let response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'NetworkAbyss/1.0', // Required by Nominatim
        },
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!response.ok) {
      // Fallback to lower zoom if high zoom fails
      response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'NetworkAbyss/1.0',
          },
          signal: AbortSignal.timeout(5000),
        }
      )
    }

    if (response.ok) {
      const data = await response.json()
      
      if (data.address) {
        const addr = data.address
        
        // Extract detailed location information
        const building = addr.building || addr.amenity || addr.leisure || addr.tourism
        const houseNumber = addr.house_number
        const street = addr.road || addr.street || addr.pedestrian
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.county
        const region = addr.state || addr.region || addr.province
        const country = addr.country || 'Unknown'
        const postalCode = addr.postcode
        
        // Build precise location name
        let name = ''
        
        // Most specific: building + address
        if (building && houseNumber && street) {
          name = `${building}, ${houseNumber} ${street}`
        } else if (building && street) {
          name = `${building}, ${street}`
        } else if (houseNumber && street) {
          name = `${houseNumber} ${street}`
        } else if (street) {
          name = street
        } else if (building) {
          name = building
        }
        
        // Add city/region/country
        if (city) {
          name = name ? `${name}, ${city}` : city
        }
        if (region && region !== city) {
          name = name ? `${name}, ${region}` : region
        }
        if (country) {
          name = name ? `${name}, ${country}` : country
        }
        
        // Fallback to display_name if we don't have a good name
        if (!name || name === country) {
          name = data.display_name || `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`
        }
        
        return {
          name,
          country,
          city: city || undefined,
          region: region || undefined,
          address: street ? `${houseNumber ? houseNumber + ' ' : ''}${street}` : undefined,
          building: building || undefined,
          houseNumber: houseNumber || undefined,
          street: street || undefined,
          postalCode: postalCode || undefined,
          displayName: data.display_name,
        }
      }
    }
  } catch (error) {
    console.warn('Reverse geocoding failed:', error)
  }

  // Fallback: return coordinates
  return {
    name: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
    country: 'Unknown',
  }
}

