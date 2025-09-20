import React from 'react';
import { Lead } from '../types';
import { getAreaCodeStats, getLocationFromAreaCode } from '../utils/areaCodeMapping';
import { extractAreaCode } from '../utils/phoneUtils';
import CallLocationMap from './CallLocationMap';

interface GeographicAnalyticsProps {
  leads: Lead[];
  className?: string;
}

const GeographicAnalytics: React.FC<GeographicAnalyticsProps> = ({ leads, className = '' }) => {
  const locationStats = getAreaCodeStats(leads);
  const totalLeads = leads.length;
  const leadsWithLocation = leads.filter(lead => {
    if (!lead.phone) return false;
    return getLocationFromAreaCode(lead.phone) !== null;
  });

  const coveragePercentage = totalLeads > 0 ? (leadsWithLocation.length / totalLeads) * 100 : 0;
  
  // Group by state/province for regional analysis
  const regionStats = locationStats.reduce((acc, stat) => {
    const region = stat.location.state;
    if (!acc[region]) {
      acc[region] = {
        region,
        count: 0,
        percentage: 0,
        cities: []
      };
    }
    acc[region].count += stat.count;
    acc[region].cities.push(stat.location.city);
    return acc;
  }, {} as Record<string, {region: string, count: number, percentage: number, cities: string[]}>);

  // Calculate regional percentages
  Object.values(regionStats).forEach(region => {
    region.percentage = totalLeads > 0 ? (region.count / totalLeads) * 100 : 0;
  });

  const sortedRegions = Object.values(regionStats)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 regions

  const getRegionIcon = (region: string) => {
    // Add some regional indicators
    if (['CA', 'OR', 'WA'].includes(region)) return '🌲'; // West Coast
    if (['FL', 'GA', 'SC', 'NC'].includes(region)) return '🌴'; // Southeast
    if (['TX', 'OK', 'AR'].includes(region)) return '🤠'; // Southwest
    if (['NY', 'NJ', 'CT', 'MA'].includes(region)) return '🏙️'; // Northeast
    if (['IL', 'OH', 'MI', 'IN'].includes(region)) return '🏭'; // Midwest
    return '📍'; // Default
  };

  if (totalLeads === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-slate-500 dark:text-slate-400">No leads available for geographic analysis</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Geographic Coverage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Geographic Coverage</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {coveragePercentage.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            {leadsWithLocation.length} of {totalLeads} leads
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Unique Locations</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {locationStats.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            cities/regions
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400">States/Provinces</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {sortedRegions.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            represented
          </div>
        </div>
      </div>

      {/* Interactive Map */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Call Location Map</h3>
        <CallLocationMap leads={leads} />
      </div>

      {/* Regional Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Top Regions</h3>
          <div className="space-y-3">
            {sortedRegions.map((region, index) => (
              <div key={region.region} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm">
                    {getRegionIcon(region.region)}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {region.region}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500">
                      {region.cities.length} {region.cities.length === 1 ? 'city' : 'cities'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {region.count}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-500">
                    {region.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Top Cities</h3>
          <div className="space-y-3">
            {locationStats.slice(0, 8).map((stat, index) => (
              <div key={`${stat.location.city}-${stat.location.state}`} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {stat.location.city}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500">
                      {stat.location.state} • {stat.location.areaCode}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {stat.count}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-500">
                    {stat.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Geographic Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          📊 Geographic Insights
        </h3>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          {locationStats.length > 0 && (
            <div>
              <strong>Market Concentration:</strong> Your top location ({locationStats[0].location.city}, {locationStats[0].location.state}) 
              represents {locationStats[0].percentage.toFixed(1)}% of all calls.
            </div>
          )}
          {sortedRegions.length > 0 && (
            <div>
              <strong>Regional Leader:</strong> {sortedRegions[0].region} is your strongest market with {sortedRegions[0].count} calls 
              across {sortedRegions[0].cities.length} {sortedRegions[0].cities.length === 1 ? 'city' : 'cities'}.
            </div>
          )}
          <div>
            <strong>Coverage Quality:</strong> {coveragePercentage >= 90 ? 'Excellent' : coveragePercentage >= 70 ? 'Good' : coveragePercentage >= 50 ? 'Fair' : 'Limited'} geographic 
            data coverage ({coveragePercentage.toFixed(1)}% of leads have location data).
          </div>
          {locationStats.length >= 10 && (
            <div>
              <strong>Market Diversity:</strong> Strong geographic diversity with {locationStats.length} unique locations 
              across {sortedRegions.length} states/provinces.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeographicAnalytics;