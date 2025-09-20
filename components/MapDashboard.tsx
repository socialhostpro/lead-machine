// Geographic Map Dashboard Component
// Shows all leads and calls on an interactive map with business location

import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Lead, User } from '../types';
import { supabase } from '../utils/supabase';
import { getLocationFromAreaCode } from '../utils/areaCodeMapping';

// Fix Leaflet default markers
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapDashboardProps {
  leads: Lead[];
  user: User;
  onClose: () => void;
}

interface MapLead extends Lead {
  calculated_distance?: number;
}

export const MapDashboard: React.FC<MapDashboardProps> = ({ leads, user, onClose }) => {
  const [mapLeads, setMapLeads] = useState<MapLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<MapLead | null>(null);
  const [showRadius, setShowRadius] = useState(true);
  const [radiusDistance, setRadiusDistance] = useState(25); // miles
  const [filterByAgent, setFilterByAgent] = useState<string>('all');
  const [agents, setAgents] = useState<any[]>([]);

  // Default center (business location or US center)
  const defaultCenter: [number, number] = user.business_latitude && user.business_longitude 
    ? [user.business_latitude, user.business_longitude]
    : [39.8283, -98.5795]; // Center of US

  useEffect(() => {
    loadMapData();
  }, [leads, user]);

  const loadMapData = async () => {
    try {
      setLoading(true);

      // Load ElevenLabs agents
      const { data: agentsData } = await supabase
        .from('elevenlabs_agents')
        .select('*')
        .eq('company_id', user.companyId)
        .eq('active', true);

      setAgents(agentsData || []);

      // Process leads with geographic data
      const leadsWithGeo = await Promise.all(
        leads.map(async (lead) => {
          let geoLead = { ...lead } as MapLead;

          // If lead doesn't have coordinates, try to geocode the address/phone
          if (!lead.caller_latitude && !lead.caller_longitude) {
            const coords = await geocodeLocation(lead);
            if (coords) {
              geoLead.caller_latitude = coords.latitude;
              geoLead.caller_longitude = coords.longitude;
            }
          }

          // Calculate distance if we have both business and caller coordinates
          if (
            user.business_latitude && user.business_longitude &&
            geoLead.caller_latitude && geoLead.caller_longitude
          ) {
            geoLead.calculated_distance = calculateDistance(
              user.business_latitude,
              user.business_longitude,
              geoLead.caller_latitude,
              geoLead.caller_longitude
            );
          }

          return geoLead;
        })
      );

      setMapLeads(leadsWithGeo.filter(lead => lead.caller_latitude && lead.caller_longitude));
    } catch (error) {
      console.error('Error loading map data:', error);
    } finally {
      setLoading(false);
    }
  };

  const geocodeLocation = async (lead: Lead): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      // Try to extract location from phone number area code or other data
      // This is a simplified implementation - in production you'd use a proper geocoding service
      
      if (lead.phone) {
        const location = getLocationFromAreaCode(lead.phone);
        if (location) {
          return { latitude: location.latitude, longitude: location.longitude };
        }
      }

      // Try to geocode from issue description or notes
      if (lead.issueDescription) {
        const locationMatch = lead.issueDescription.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*([A-Z]{2})\b/);
        if (locationMatch) {
          const [, city, state] = locationMatch;
          const coords = await geocodeAddress(`${city}, ${state}`);
          if (coords) return coords;
        }
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const getAreaCodeCoordinates = (areaCode: string): { latitude: number; longitude: number } | null => {
    // Simplified area code to coordinates mapping (major US area codes)
    const areaCodeMap: { [key: string]: [number, number] } = {
      '212': [40.7128, -74.0060], // New York
      '213': [34.0522, -118.2437], // Los Angeles
      '312': [41.8781, -87.6298], // Chicago
      '415': [37.7749, -122.4194], // San Francisco
      '305': [25.7617, -80.1918], // Miami
      '713': [29.7604, -95.3698], // Houston
      '214': [32.7767, -96.7970], // Dallas
      '404': [33.7490, -84.3880], // Atlanta
      '617': [42.3601, -71.0589], // Boston
      '206': [47.6062, -122.3321], // Seattle
      // Add more area codes as needed
    };

    const coords = areaCodeMap[areaCode];
    return coords ? { latitude: coords[0], longitude: coords[1] } : null;
  };

  const geocodeAddress = async (address: string): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      // Using a free geocoding service (in production, use a proper API key)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (error) {
      console.error('Address geocoding error:', error);
      return null;
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getLeadIcon = (lead: MapLead) => {
    const colors = {
      'New': '#3B82F6', // Blue
      'Contacted': '#F59E0B', // Amber
      'Qualified': '#10B981', // Green
      'Client': '#059669', // Emerald
      'Lost': '#EF4444', // Red
      'Unqualified': '#6B7280', // Gray
    };

    const color = colors[lead.status as keyof typeof colors] || '#6B7280';
    
    return divIcon({
      html: `
        <div style="
          background-color: ${color};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
        ">
          ${lead.firstName.charAt(0)}
        </div>
      `,
      className: 'custom-div-icon',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  const getBusinessIcon = () => {
    return divIcon({
      html: `
        <div style="
          background-color: #7C3AED;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 3px 6px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
          font-weight: bold;
        ">
          🏢
        </div>
      `,
      className: 'business-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };

  const filteredLeads = mapLeads.filter(lead => {
    if (filterByAgent === 'all') return true;
    return lead.elevenlabs_agent_id === filterByAgent;
  });

  const getDirectionsUrl = (lead: MapLead) => {
    if (!user.business_latitude || !user.business_longitude || !lead.caller_latitude || !lead.caller_longitude) {
      return '#';
    }
    
    return `https://www.google.com/maps/dir/${user.business_latitude},${user.business_longitude}/${lead.caller_latitude},${lead.caller_longitude}`;
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return 'Unknown';
    return distance < 1 ? `${(distance * 5280).toFixed(0)} ft` : `${distance.toFixed(1)} mi`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading map data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Geographic Lead Map</h2>
          <p className="text-gray-600">
            Showing {filteredLeads.length} leads with location data
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Agent Filter */}
          <select
            value={filterByAgent}
            onChange={(e) => setFilterByAgent(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="all">All Agents</option>
            {agents.map(agent => (
              <option key={agent.agent_id} value={agent.agent_id}>
                {agent.agent_name}
              </option>
            ))}
          </select>

          {/* Show Radius Toggle */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showRadius}
              onChange={(e) => setShowRadius(e.target.checked)}
            />
            <span>Show radius</span>
          </label>

          {/* Radius Distance */}
          {showRadius && (
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="5"
                max="100"
                value={radiusDistance}
                onChange={(e) => setRadiusDistance(parseInt(e.target.value))}
                className="w-20"
              />
              <span className="text-sm">{radiusDistance} mi</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-[calc(100vh-80px)] relative">
        <MapContainer
          center={defaultCenter}
          zoom={8}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Business Location */}
          {user.business_latitude && user.business_longitude && (
            <>
              <Marker
                position={[user.business_latitude, user.business_longitude]}
                icon={getBusinessIcon()}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold">Your Business</h3>
                    <p className="text-sm text-gray-600">
                      {user.business_address}
                      {user.business_city && `, ${user.business_city}`}
                      {user.business_state && `, ${user.business_state}`}
                    </p>
                  </div>
                </Popup>
              </Marker>

              {/* Service Radius */}
              {showRadius && (
                <Circle
                  center={[user.business_latitude, user.business_longitude]}
                  radius={radiusDistance * 1609.34} // Convert miles to meters
                  pathOptions={{
                    color: '#7C3AED',
                    fillColor: '#7C3AED',
                    fillOpacity: 0.1,
                    weight: 2
                  }}
                />
              )}
            </>
          )}

          {/* Lead Markers */}
          {filteredLeads.map(lead => (
            lead.caller_latitude && lead.caller_longitude && (
              <Marker
                key={lead.id}
                position={[lead.caller_latitude, lead.caller_longitude]}
                icon={getLeadIcon(lead)}
                eventHandlers={{
                  click: () => setSelectedLead(lead)
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[250px]">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold">
                          {lead.firstName} {lead.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">{lead.company}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        lead.status === 'New' ? 'bg-blue-100 text-blue-800' :
                        lead.status === 'Contacted' ? 'bg-yellow-100 text-yellow-800' :
                        lead.status === 'Qualified' ? 'bg-green-100 text-green-800' :
                        lead.status === 'Client' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {lead.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p><strong>Phone:</strong> {lead.phone}</p>
                      <p><strong>Email:</strong> {lead.email}</p>
                      {lead.calculated_distance && (
                        <p><strong>Distance:</strong> {formatDistance(lead.calculated_distance)}</p>
                      )}
                      {lead.elevenlabs_agent_id && (
                        <p><strong>Agent:</strong> {
                          agents.find(a => a.agent_id === lead.elevenlabs_agent_id)?.agent_name || lead.elevenlabs_agent_id
                        }</p>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <a
                        href={getDirectionsUrl(lead)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Directions
                      </a>
                      <a
                        href={`tel:${lead.phone}`}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        Call
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          ))}

          {/* Lines from business to leads (optional) */}
          {selectedLead && user.business_latitude && user.business_longitude && 
           selectedLead.caller_latitude && selectedLead.caller_longitude && (
            <Polyline
              positions={[
                [user.business_latitude, user.business_longitude],
                [selectedLead.caller_latitude, selectedLead.caller_longitude]
              ]}
              pathOptions={{ color: '#7C3AED', weight: 3, opacity: 0.7 }}
            />
          )}
        </MapContainer>

        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
          <h4 className="font-semibold mb-2">Legend</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-600 rounded-full border-2 border-white"></div>
              <span>Your Business</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full border border-white"></div>
              <span>New Leads</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full border border-white"></div>
              <span>Contacted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full border border-white"></div>
              <span>Qualified/Client</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full border border-white"></div>
              <span>Lost</span>
            </div>
          </div>
          
          {showRadius && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-purple-600 opacity-30"></div>
                <span>Service Area ({radiusDistance} mi)</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats Panel */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
          <h4 className="font-semibold mb-2">Quick Stats</h4>
          <div className="space-y-1 text-sm">
            <p>Total Leads: {filteredLeads.length}</p>
            <p>With Location: {filteredLeads.filter(l => l.caller_latitude && l.caller_longitude).length}</p>
            <p>Avg Distance: {
              filteredLeads.length > 0 
                ? formatDistance(
                    filteredLeads
                      .filter(l => l.calculated_distance)
                      .reduce((sum, l) => sum + (l.calculated_distance || 0), 0) / 
                    filteredLeads.filter(l => l.calculated_distance).length
                  )
                : 'N/A'
            }</p>
            {showRadius && (
              <p>Within {radiusDistance} mi: {
                filteredLeads.filter(l => 
                  l.calculated_distance && l.calculated_distance <= radiusDistance
                ).length
              }</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};