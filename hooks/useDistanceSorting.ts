import { useState, useEffect, useCallback } from 'react';
import { Lead } from '../types';
import { 
  Location, 
  getCurrentLocation, 
  calculateDistance, 
  parseLeadAddress, 
  geocodeAddressWithCache 
} from '../utils/geolocation';

export interface UseDistanceSortingReturn {
  userLocation: Location | null;
  locationError: string | null;
  isGeocodingLeads: boolean;
  sortedLeads: Lead[];
  requestLocation: () => void;
  sortByDistance: (leads: Lead[]) => Lead[];
  isLocationEnabled: boolean;
}

export function useDistanceSorting(leads: Lead[]): UseDistanceSortingReturn {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGeocodingLeads, setIsGeocodingLeads] = useState(false);
  const [geocodedLeads, setGeocodedLeads] = useState<Lead[]>([]);

  // Request user location
  const requestLocation = useCallback(async () => {
    setLocationError(null);
    
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      localStorage.setItem('lead-machine-user-location', JSON.stringify(location));
    } catch (error: any) {
      let errorMessage = 'Failed to get your location';
      
      switch (error.code) {
        case 1:
          errorMessage = 'Location access denied. Please enable location permissions.';
          break;
        case 2:
          errorMessage = 'Location unavailable. Please try again.';
          break;
        case 3:
          errorMessage = 'Location request timed out. Please try again.';
          break;
        default:
          errorMessage = error.message || 'Geolocation not supported';
      }
      
      setLocationError(errorMessage);
    }
  }, []);

  // Load saved location on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lead-machine-user-location');
      if (saved) {
        const location = JSON.parse(saved);
        // Check if location is recent (less than 1 hour old)
        if (location.timestamp && (Date.now() - location.timestamp) < 3600000) {
          setUserLocation(location);
        }
      }
    } catch (error) {
      console.warn('Failed to load saved location:', error);
    }
  }, []);

  // Geocode leads when they change
  useEffect(() => {
    if (!leads.length) {
      setGeocodedLeads([]);
      return;
    }

    const geocodeLeads = async () => {
      setIsGeocodingLeads(true);
      const updatedLeads: Lead[] = [];

      for (const lead of leads) {
        let updatedLead = { ...lead };

        // Skip if already geocoded
        if (lead.geocoded_latitude && lead.geocoded_longitude) {
          updatedLeads.push(updatedLead);
          continue;
        }

        // Try to parse address from lead data
        const address = parseLeadAddress(lead);
        if (address) {
          try {
            const location = await geocodeAddressWithCache(address);
            if (location) {
              updatedLead = {
                ...updatedLead,
                parsed_address: address,
                geocoded_latitude: location.latitude,
                geocoded_longitude: location.longitude
              };
            }
          } catch (error) {
            console.warn(`Failed to geocode address for lead ${lead.id}:`, error);
          }
        }

        updatedLeads.push(updatedLead);
      }

      setGeocodedLeads(updatedLeads);
      setIsGeocodingLeads(false);
    };

    geocodeLeads();
  }, [leads]);

  // Calculate distances and sort leads
  const sortByDistance = useCallback((leadsToSort: Lead[]): Lead[] => {
    if (!userLocation) return leadsToSort;

    return leadsToSort
      .map(lead => {
        let distance: number | undefined;

        // Try geocoded coordinates first
        if (lead.geocoded_latitude && lead.geocoded_longitude) {
          distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            lead.geocoded_latitude,
            lead.geocoded_longitude
          );
        }
        // Fallback to caller coordinates
        else if (lead.caller_latitude && lead.caller_longitude) {
          distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            lead.caller_latitude,
            lead.caller_longitude
          );
        }

        return {
          ...lead,
          distance_from_user: distance
        };
      })
      .sort((a, b) => {
        // Put leads with known distances first, sorted by distance
        if (a.distance_from_user !== undefined && b.distance_from_user !== undefined) {
          return a.distance_from_user - b.distance_from_user;
        }
        if (a.distance_from_user !== undefined) return -1;
        if (b.distance_from_user !== undefined) return 1;
        
        // Fallback to creation date for leads without location
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [userLocation]);

  // Get sorted leads with distances
  const sortedLeads = sortByDistance(geocodedLeads.length > 0 ? geocodedLeads : leads);

  const isLocationEnabled = !!userLocation && !locationError;

  return {
    userLocation,
    locationError,
    isGeocodingLeads,
    sortedLeads,
    requestLocation,
    sortByDistance,
    isLocationEnabled
  };
}