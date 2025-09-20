import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Lead } from '../types';
import { getAreaCodeStats, AreaCodeLocation } from '../utils/areaCodeMapping';
import 'leaflet/dist/leaflet.css';

// Fix default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface CallLocationMapProps {
  leads: Lead[];
  className?: string;
}

const FitBounds: React.FC<{ locations: any[] }> = ({ locations }) => {
  const map = useMap();
  
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map(loc => [loc.location.latitude, loc.location.longitude])
      );
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [locations, map]);
  
  return null;
};

const getMarkerColor = (percentage: number): string => {
  if (percentage >= 20) return '#ef4444'; // Red for high volume
  if (percentage >= 10) return '#f97316'; // Orange for medium-high
  if (percentage >= 5) return '#eab308';  // Yellow for medium
  if (percentage >= 2) return '#22c55e';  // Green for low-medium
  return '#3b82f6'; // Blue for low volume
};

const getMarkerSize = (count: number, maxCount: number): number => {
  const minSize = 8;
  const maxSize = 25;
  const ratio = count / maxCount;
  return minSize + (maxSize - minSize) * ratio;
};

const CallLocationMap: React.FC<CallLocationMapProps> = ({ leads, className = '' }) => {
  const mapRef = useRef<L.Map | null>(null);
  const locationStats = getAreaCodeStats(leads);
  const maxCount = Math.max(...locationStats.map(stat => stat.count), 1);

  if (locationStats.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 bg-slate-100 dark:bg-slate-800 rounded-lg ${className}`}>
        <div className="text-center">
          <div className="text-slate-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3v13" />
            </svg>
          </div>
          <p className="text-slate-600 dark:text-slate-400">No call location data available</p>
          <p className="text-sm text-slate-500 dark:text-slate-500">Phone numbers with valid area codes will appear on the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        ref={mapRef}
        center={[39.8283, -98.5795]} // Geographic center of USA
        zoom={4}
        style={{ height: '400px', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBounds locations={locationStats} />
        
        {locationStats.map((stat, index) => (
          <CircleMarker
            key={`${stat.location.city}-${stat.location.state}-${index}`}
            center={[stat.location.latitude, stat.location.longitude]}
            radius={getMarkerSize(stat.count, maxCount)}
            fillColor={getMarkerColor(stat.percentage)}
            color="white"
            weight={2}
            opacity={1}
            fillOpacity={0.7}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold text-slate-800">
                  {stat.location.city}, {stat.location.state}
                </div>
                <div className="text-slate-600 mt-1">
                  <div>Area Code: {stat.location.areaCode}</div>
                  <div>Calls: <span className="font-medium">{stat.count}</span></div>
                  <div>Percentage: <span className="font-medium">{stat.percentage.toFixed(1)}%</span></div>
                  <div>Timezone: {stat.location.timezone}</div>
                  {stat.location.country !== 'USA' && (
                    <div>Country: {stat.location.country}</div>
                  )}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-[1000]">
        <div className="text-sm font-medium text-slate-800 dark:text-white mb-2">Call Volume</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-slate-600 dark:text-slate-400">High (20%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-slate-600 dark:text-slate-400">Med-High (10-20%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-slate-600 dark:text-slate-400">Medium (5-10%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-slate-600 dark:text-slate-400">Low-Med (2-5%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-slate-600 dark:text-slate-400">Low (&lt;2%)</span>
          </div>
        </div>
      </div>
      
      {/* Statistics Panel */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-[1000] max-w-xs">
        <div className="text-sm font-medium text-slate-800 dark:text-white mb-2">Location Statistics</div>
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div>Total Locations: <span className="font-medium">{locationStats.length}</span></div>
          <div>Total Calls: <span className="font-medium">{locationStats.reduce((sum, stat) => sum + stat.count, 0)}</span></div>
          {locationStats.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
              <div className="font-medium">Top Location:</div>
              <div>{locationStats[0].location.city}, {locationStats[0].location.state}</div>
              <div>{locationStats[0].count} calls ({locationStats[0].percentage.toFixed(1)}%)</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallLocationMap;