/**
 * Geolocation utilities for distance-based lead sorting
 * Handles user location detection, address geocoding, and distance calculations
 */

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get user's current location using browser geolocation API
 */
export function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 0,
        message: 'Geolocation is not supported by this browser'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        reject({
          code: error.code,
          message: error.message
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
}

/**
 * Geocode an address to get coordinates
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */
export async function geocodeAddress(address: string): Promise<Location | null> {
  if (!address || address.trim() === '') return null;
  
  try {
    const encodedAddress = encodeURIComponent(address.trim());
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          'User-Agent': 'LeadMachine/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        address: result.display_name
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Geocoding error:', error);
    return null;
  }
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number): string {
  if (distance < 0.1) {
    return '< 0.1 mi';
  } else if (distance < 1) {
    return `${(distance * 5280).toFixed(0)} ft`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)} mi`;
  } else {
    return `${Math.round(distance)} mi`;
  }
}

/**
 * Parse address from lead data to create searchable address string
 */
export function parseLeadAddress(lead: {
  company?: string;
  issueDescription?: string;
  phone?: string;
}): string {
  // Try to extract address from issue description
  const description = lead.issueDescription || '';
  
  // Look for common address patterns
  const addressPatterns = [
    /(?:address|location|at|visit|come to|located at)[:\s]+([^.!?]*)/i,
    /(\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|blvd|boulevard|way|ct|court|place|pl)[\w\s]*)/i,
    /([\w\s]+,\s*[A-Z]{2}\s*\d{5})/i // City, State ZIP
  ];
  
  for (const pattern of addressPatterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Fallback to company name if available
  if (lead.company && lead.company !== 'Unknown') {
    return lead.company;
  }
  
  return '';
}

/**
 * Cache interface for storing geocoded locations
 */
export interface GeocodingCache {
  [address: string]: {
    location: Location;
    timestamp: number;
  };
}

/**
 * Local storage key for geocoding cache
 */
const GEOCODING_CACHE_KEY = 'lead-machine-geocoding-cache';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Get geocoding result from cache
 */
export function getCachedGeocode(address: string): Location | null {
  try {
    const cache: GeocodingCache = JSON.parse(localStorage.getItem(GEOCODING_CACHE_KEY) || '{}');
    const entry = cache[address.toLowerCase().trim()];
    
    if (entry && (Date.now() - entry.timestamp) < CACHE_EXPIRY) {
      return entry.location;
    }
  } catch (error) {
    console.warn('Geocoding cache read error:', error);
  }
  
  return null;
}

/**
 * Store geocoding result in cache
 */
export function setCachedGeocode(address: string, location: Location): void {
  try {
    const cache: GeocodingCache = JSON.parse(localStorage.getItem(GEOCODING_CACHE_KEY) || '{}');
    cache[address.toLowerCase().trim()] = {
      location,
      timestamp: Date.now()
    };
    
    // Clean up old entries
    const now = Date.now();
    Object.keys(cache).forEach(key => {
      if ((now - cache[key].timestamp) > CACHE_EXPIRY) {
        delete cache[key];
      }
    });
    
    localStorage.setItem(GEOCODING_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Geocoding cache write error:', error);
  }
}

/**
 * Geocode address with caching
 */
export async function geocodeAddressWithCache(address: string): Promise<Location | null> {
  const cached = getCachedGeocode(address);
  if (cached) {
    return cached;
  }
  
  const location = await geocodeAddress(address);
  if (location) {
    setCachedGeocode(address, location);
  }
  
  return location;
}