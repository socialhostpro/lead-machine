import React, { useState, useMemo, useEffect } from 'react';
import { Lead, LeadStatus, Company, User, UserRole } from '../types';
import ActivityFeed from './ActivityFeed';
import LeadCard from './LeadCard';
import ReturningCallerStack from './ReturningCallerStack';
import ReportsModal from './ReportsModal';
import { PlusIcon, MagnifyingGlassIcon, ChevronDownIcon, Cog6ToothIcon, UserCircleIcon, SunIcon, MoonIcon, ArrowPathIcon, UsersIcon, ClockIcon, ArrowDownTrayIcon, ArrowLeftOnRectangleIcon, ClipboardIcon, ChartBarIcon } from './icons';
import Pagination from './Pagination';
import { groupReturningCallers, calculateCallerTracking } from '../utils/callerTracking';

interface DashboardProps {
  leads: Lead[];
  companies: Company[];
  currentCompany: Company;
  currentUser: User;
  theme: 'light' | 'dark';
  isLoading: boolean;
  onCompanyChange: (id: string) => void;
  onAddNew: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onToggleTheme: () => void;
  onRefreshLeads: () => Promise<void>;
  onOpenUserManagement: () => void;
  onLogout: () => void;
  onUpdateLead: (updatedLead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onOpenEditModal: (lead: Lead) => void;
  onOpenAddNoteModal: (lead: Lead) => void;
  onSendToWebhook: (lead: Lead) => Promise<void>;
  onGenerateInsights: (lead: Lead) => Promise<void>;
  onSendEmail: (lead: Lead) => Promise<void>;
  onOpenForms: () => void;
  elevenlabsApiKey?: string;
  onOpenActivityModal: (leadId: string) => void;
  onOpenDetailedInsights: (lead: Lead) => void;
}

const StatCard: React.FC<{ title: string; value: number; color: string }> = ({ title, value, color }) => (
  <div className="bg-white dark:bg-slate-800/50 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-800">
    <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
    <p className={`text-3xl font-bold ${color}`}>{value}</p>
  </div>
);

const TABS: (LeadStatus | 'All')[] = ['All', LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.CLIENT, LeadStatus.LOST, LeadStatus.ARCHIVE, LeadStatus.UNQUALIFIED];

const SORT_OPTIONS = {
  'callDate_desc': 'Latest Caller First',
  'timeBasedStatus_asc': 'Hours Since Contact (Least)',
  'timeBasedStatus_desc': 'Hours Since Contact (Most)',
  'createdAt_desc': 'Newest First',
  'createdAt_asc': 'Oldest First',
  'firstName_asc': 'First Name (A-Z)',
  'firstName_desc': 'First Name (Z-A)',
  'lastName_asc': 'Last Name (A-Z)',
  'lastName_desc': 'Last Name (Z-A)',
  'company_asc': 'Company (A-Z)',
  'company_desc': 'Company (Z-A)',
  'status_asc': 'Status (A-Z)',
  'status_desc': 'Status (Z-A)',
  'email_asc': 'Email (A-Z)',
  'email_desc': 'Email (Z-A)',
  'source_asc': 'Source (A-Z)',
  'source_desc': 'Source (Z-A)',
}

const ITEMS_PER_PAGE = 8;
const REFRESH_INTERVAL_SECONDS = 300; // 5 minutes

const TIME_PERIODS = {
  'today': 'Today',
  'week': 'This Week', 
  'month': 'This Month',
  'year': 'This Year',
  'all': 'All Time'
};

const Dashboard: React.FC<DashboardProps> = ({ 
  leads, companies, currentCompany, currentUser, theme, isLoading,
  onCompanyChange, onAddNew, onOpenSettings, onOpenProfile, onToggleTheme, onRefreshLeads, onOpenUserManagement, onLogout,
  onUpdateLead, onDeleteLead, onOpenEditModal, onOpenAddNoteModal, onSendToWebhook, onGenerateInsights, onSendEmail, onOpenForms,
  elevenlabsApiKey, onOpenActivityModal, onOpenDetailedInsights
}) => {
  const [activeTab, setActiveTab] = useState<LeadStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('callDate_desc');
  const [timePeriod, setTimePeriod] = useState<keyof typeof TIME_PERIODS>('all');
  const [mobileStatsVisible, setMobileStatsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showOnlyWithPhone, setShowOnlyWithPhone] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SECONDS);
  const [highlightedLeadId, setHighlightedLeadId] = useState<string | null>(null);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onRefreshLeads(true); // Force refresh to get fresh data
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onRefreshLeads]);

  const handleManualRefresh = async () => {
    await onRefreshLeads();
    setCountdown(REFRESH_INTERVAL_SECONDS);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const filterLeadsByTimePeriod = (leads: Lead[], period: keyof typeof TIME_PERIODS): Lead[] => {
    if (period === 'all') return leads;
    
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return leads;
    }
    
    return leads.filter(lead => new Date(lead.createdAt) >= startDate);
  };

  const filteredLeadsByTime = useMemo(() => {
    return filterLeadsByTimePeriod(leads, timePeriod);
  }, [leads, timePeriod]);

  const stats = useMemo(() => ({
    total: filteredLeadsByTime.length,
    new: filteredLeadsByTime.filter(l => l.status === LeadStatus.NEW).length,
    qualified: filteredLeadsByTime.filter(l => l.status === LeadStatus.QUALIFIED).length,
    won: filteredLeadsByTime.filter(l => l.status === LeadStatus.CLOSED_WON).length,
  }), [filteredLeadsByTime]);

  const filteredAndSortedLeads = useMemo(() => {
    let filteredLeads = [...filteredLeadsByTime];

    if (activeTab !== 'All') {
      filteredLeads = filteredLeads.filter(lead => lead.status === activeTab);
    }

    if (showOnlyWithPhone) {
        filteredLeads = filteredLeads.filter(lead => lead.phone && lead.phone !== 'N/A');
    }

    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filteredLeads = filteredLeads.filter(lead =>
        lead.firstName.toLowerCase().includes(lowercasedQuery) ||
        lead.lastName.toLowerCase().includes(lowercasedQuery) ||
        (lead.company && lead.company.toLowerCase().includes(lowercasedQuery)) ||
        lead.email.toLowerCase().includes(lowercasedQuery)
      );
    }

    filteredLeads.sort((a, b) => {
        switch (sortOption) {
            case 'callDate_desc':
                // Sort by call date (callStartTime), fallback to createdAt
                const aCallTime = a.callDetails?.callStartTime ? new Date(a.callDetails.callStartTime).getTime() : new Date(a.createdAt).getTime();
                const bCallTime = b.callDetails?.callStartTime ? new Date(b.callDetails.callStartTime).getTime() : new Date(b.createdAt).getTime();
                return bCallTime - aCallTime;
            case 'timeBasedStatus_asc':
                // Sort by hours since last contact (least hours first)
                const aTracking = calculateCallerTracking(leads, a);
                const bTracking = calculateCallerTracking(leads, b);
                const aHours = aTracking.lastContactTime ? 
                    (Date.now() - new Date(aTracking.lastContactTime).getTime()) / (1000 * 60 * 60) : 
                    999999; // Never contacted gets highest number
                const bHours = bTracking.lastContactTime ? 
                    (Date.now() - new Date(bTracking.lastContactTime).getTime()) / (1000 * 60 * 60) : 
                    999999;
                return aHours - bHours;
            case 'timeBasedStatus_desc':
                // Sort by hours since last contact (most hours first)
                const aTrackingDesc = calculateCallerTracking(leads, a);
                const bTrackingDesc = calculateCallerTracking(leads, b);
                const aHoursDesc = aTrackingDesc.lastContactTime ? 
                    (Date.now() - new Date(aTrackingDesc.lastContactTime).getTime()) / (1000 * 60 * 60) : 
                    999999;
                const bHoursDesc = bTrackingDesc.lastContactTime ? 
                    (Date.now() - new Date(bTrackingDesc.lastContactTime).getTime()) / (1000 * 60 * 60) : 
                    999999;
                return bHoursDesc - aHoursDesc;
            case 'createdAt_asc':
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case 'firstName_asc':
                return a.firstName.localeCompare(b.firstName);
            case 'firstName_desc':
                return b.firstName.localeCompare(a.firstName);
            case 'lastName_asc':
                return a.lastName.localeCompare(b.lastName);
            case 'lastName_desc':
                return b.lastName.localeCompare(a.lastName);
            case 'company_asc':
                return (a.company || '').localeCompare(b.company || '');
            case 'company_desc':
                return (b.company || '').localeCompare(a.company || '');
             case 'status_asc':
                return a.status.localeCompare(b.status);
            case 'status_desc':
                return b.status.localeCompare(a.status);
            case 'email_asc':
                return a.email.localeCompare(b.email);
            case 'email_desc':
                return b.email.localeCompare(a.email);
            case 'source_asc':
                return a.source.localeCompare(b.source);
            case 'source_desc':
                return b.source.localeCompare(a.source);
            case 'createdAt_desc':
            default:
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
    });

    return filteredLeads;
  }, [filteredLeadsByTime, activeTab, searchQuery, sortOption, showOnlyWithPhone]);

  // Group returning callers and prepare display data
  const groupedLeads = useMemo(() => {
    // Calculate caller tracking for all leads
    const leadsWithTracking = filteredAndSortedLeads.map(lead => ({
      ...lead,
      callerTracking: calculateCallerTracking(leads, lead),
      lastContactTime: lead.lastContactTime || lead.callDetails?.callStartTime || lead.createdAt
    }));

    // Group returning callers
    const { returningGroups, singleCallers } = groupReturningCallers(leadsWithTracking);
    
    // Combine groups and single callers for display
    const displayItems: (Lead | Lead[])[] = [
      ...returningGroups,
      ...singleCallers
    ];
    
    return displayItems;
  }, [filteredAndSortedLeads, leads]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, sortOption, showOnlyWithPhone]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return groupedLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [groupedLeads, currentPage]);

  const getTabCount = (tab: LeadStatus | 'All') => {
    if (tab === 'All') return leads.length;
    return leads.filter(l => l.status === tab).length;
  };
  
  const handleSelectLead = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    setActiveTab(lead.status);
    setHighlightedLeadId(leadId);
  };

  useEffect(() => {
    if (!highlightedLeadId) return;

    const leadIndex = filteredAndSortedLeads.findIndex(l => l.id === highlightedLeadId);
    if (leadIndex === -1) {
      // Not in view, may be filtered out. The effect will re-run when filters change.
      return;
    }

    const targetPage = Math.floor(leadIndex / ITEMS_PER_PAGE) + 1;
    if (currentPage !== targetPage) {
      setCurrentPage(targetPage);
      // Let the effect re-run on page change before scrolling.
      return;
    }

    // Now on correct tab and page, proceed to scroll.
    const element = document.getElementById(`lead-card-${highlightedLeadId}`);
    if (element) {
      const timer = setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Remove highlight after animation
        setTimeout(() => setHighlightedLeadId(null), 2500);
      }, 50); // A brief delay to allow the DOM to settle after page change
      return () => clearTimeout(timer);
    }
  }, [highlightedLeadId, filteredAndSortedLeads, currentPage]);

  const convertToCSV = (leadsToConvert: Lead[]): string => {
    const headers = ['ID', 'First Name', 'Last Name', 'Company', 'Email', 'Phone', 'Status', 'Source', 'Created At', 'Issue Description', 'Notes Count', 'Summary Title'];
    const rows = leadsToConvert.map(lead => [
        `"${lead.id}"`, `"${lead.firstName}"`, `"${lead.lastName}"`, `"${lead.company || ''}"`,
        `"${lead.email}"`, `"${lead.phone || ''}"`, `"${lead.status}"`, `"${lead.source}"`,
        `"${lead.createdAt}"`, `"${(lead.issueDescription || '').replace(/"/g, '""')}"`,
        lead.notes?.length || 0, `"${(lead.callDetails?.summaryTitle || '').replace(/"/g, '""')}"`
    ]);
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  const handleDownloadList = () => {
    if (filteredAndSortedLeads.length === 0) {
        alert('No leads to download.');
        return;
    }
    const csvData = convertToCSV(filteredAndSortedLeads);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    const safeCompanyName = (currentCompany.name || 'company').replace(/\s+/g, '_');
    a.download = `leads_${safeCompanyName}_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const currentCompanyName = currentCompany?.name || 'Select Company';

  return (
    <div className="p-4 sm:p-6 md:p-8 text-slate-800 dark:text-white min-h-screen overflow-x-hidden">
      <div className="max-w-7xl mx-auto min-w-0">
        <header className="flex flex-wrap gap-4 justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className='flex items-center gap-4'>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Lead Machine</h1>
             <select
                value={currentCompany.id}
                onChange={(e) => onCompanyChange(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2 pl-3 pr-8 text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500 text-sm md:text-base"
                aria-label="Select Company"
            >
                {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                ))}
            </select>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={onOpenProfile} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">
                  <UserCircleIcon className="w-6 h-6" />
                  <span className="hidden sm:inline">{currentUser.name}</span>
              </button>
               <button onClick={onToggleTheme} title="Toggle Theme" className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">
                  {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
              </button>
               <button onClick={onOpenForms} title="Forms" className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">
                  <ClipboardIcon className="w-5 h-5" />
              </button>
              <button onClick={onOpenSettings} title="Settings" className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">
                  <Cog6ToothIcon className="w-5 h-5" />
              </button>
               {currentUser.role === UserRole.SAAS_ADMIN && (
                <button
                    onClick={onOpenUserManagement}
                    className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors"
                    title="Manage Users"
                >
                    <UsersIcon className="w-5 h-5" />
                </button>
              )}
               <button onClick={onLogout} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors" title="Logout">
                  <ArrowLeftOnRectangleIcon className="w-5 h-5" />
              </button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

               <div className="flex items-center gap-2" title={`Next refresh in ${formatTime(countdown)}`}>
                  <ClockIcon className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-mono text-slate-500 dark:text-slate-400">{formatTime(countdown)}</span>
              </div>
              <button
                onClick={handleManualRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isLoading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
              <button
                onClick={onAddNew}
                title="Add New Lead"
                className="bg-teal-500 hover:bg-teal-600 text-white p-3 rounded-full shadow-lg transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
          </div>
        </header>
        
        <div className="mb-6 md:hidden">
            <button 
                onClick={() => setMobileStatsVisible(!mobileStatsVisible)}
                className="w-full bg-white dark:bg-slate-800/50 p-2 rounded-lg text-slate-600 dark:text-slate-300 flex justify-between items-center border border-slate-200 dark:border-slate-800"
            >
                <span>{mobileStatsVisible ? 'Hide' : 'Show'} Stats</span>
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${mobileStatsVisible ? 'rotate-180' : ''}`} />
            </button>
        </div>

        {/* Time Period Selector */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 self-center mr-2">
              Time Period:
            </span>
            {Object.entries(TIME_PERIODS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTimePeriod(key as keyof typeof TIME_PERIODS)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  timePeriod === key
                    ? 'bg-blue-500 text-white dark:bg-blue-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setIsReportsModalOpen(true)}
              className="ml-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <ChartBarIcon className="w-4 h-4" />
              AI Reports
            </button>
          </div>
        </div>

        <div className={`grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 ${mobileStatsVisible ? 'grid' : 'hidden'} md:grid`}>
            <StatCard title="Total Leads" value={stats.total} color="text-blue-500 dark:text-blue-400" />
            <StatCard title="New" value={stats.new} color="text-yellow-500 dark:text-yellow-400" />
            <StatCard title="Qualified" value={stats.qualified} color="text-teal-500 dark:text-teal-400" />
            <StatCard title="Closed Won" value={stats.won} color="text-green-500 dark:text-green-400" />
        </div>
        
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-0">
            <div className="lg:col-span-2 min-w-0 overflow-hidden">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">Leads for {currentCompanyName}</h2>
                    <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center mb-4">
                        <div className="relative flex-grow">
                            <input
                                type="text"
                                placeholder="Search leads..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
                            />
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-400" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="phone-filter"
                                    checked={showOnlyWithPhone}
                                    onChange={(e) => setShowOnlyWithPhone(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-teal-600 focus:ring-teal-500"
                                />
                                <label htmlFor="phone-filter" className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                    Has Phone
                                </label>
                            </div>
                             <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2 pl-3 pr-8 text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500 w-full md:w-auto"
                                aria-label="Sort leads"
                                title="Sort leads"
                            >
                                {Object.entries(SORT_OPTIONS).map(([key, value]) => (
                                    <option key={key} value={key}>{value}</option>
                                ))}
                            </select>
                             <button onClick={handleDownloadList} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2 px-4 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm">
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                <span>Download CSV</span>
                            </button>
                        </div>
                    </div>

                    <div className="border-b border-slate-200 dark:border-slate-700">
                        <nav className="-mb-px flex flex-wrap gap-x-4 gap-y-2" aria-label="Tabs">
                            {TABS.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`${
                                        activeTab === tab
                                            ? 'border-teal-500 text-teal-600 dark:text-teal-300'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500'
                                    } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
                                >
                                    {tab}
                                    <span className={`${
                                        activeTab === tab ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/30 dark:text-teal-200' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                    } px-2 py-0.5 rounded-full text-xs font-semibold`}>
                                        {getTabCount(tab)}
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-16">
                        <ArrowPathIcon className="w-8 h-8 text-teal-500 animate-spin" />
                    </div>
                ) : paginatedItems.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                        {paginatedItems.map((item, index) => (
                            <div key={Array.isArray(item) ? `group-${item[0].phone}-${index}` : item.id} className="min-w-0">
                                {Array.isArray(item) ? (
                                  // Returning caller group
                                  <ReturningCallerStack
                                    callerGroup={item}
                                    elevenlabsApiKey={elevenlabsApiKey}
                                    onUpdateLead={onUpdateLead}
                                    onDeleteLead={onDeleteLead}
                                    onOpenEditModal={onOpenEditModal}
                                    onOpenAddNoteModal={onOpenAddNoteModal}
                                    onSendToWebhook={onSendToWebhook}
                                    onGenerateInsights={onGenerateInsights}
                                    onSendEmail={onSendEmail}
                                    userEmail={currentUser.email}
                                    companyId={currentCompany.id}
                                    onOpenDetailedInsights={onOpenDetailedInsights}
                                    onOpenActivityModal={onOpenActivityModal}
                                  />
                                ) : (
                                  // Single lead
                                  <LeadCard 
                                      lead={item}
                                      isHighlighted={item.id === highlightedLeadId}
                                      elevenlabsApiKey={elevenlabsApiKey}
                                      onUpdateLead={onUpdateLead}
                                      onDeleteLead={onDeleteLead}
                                      onOpenEditModal={onOpenEditModal}
                                      onOpenAddNoteModal={onOpenAddNoteModal}
                                      onSendToWebhook={onSendToWebhook}
                                      onGenerateInsights={onGenerateInsights}
                                      onSendEmail={onSendEmail}
                                      userEmail={currentUser.email}
                                      companyId={currentCompany.id}
                                      onOpenDetailedInsights={onOpenDetailedInsights}
                                      onOpenActivityModal={onOpenActivityModal}
                                  />
                                )}
                            </div>
                        ))}
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalItems={groupedLeads.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setCurrentPage}
                    />
                  </>
                ) : (
                  <div className="text-center py-16 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No leads found.</h3>
                    <p className="text-slate-500 dark:text-slate-500 mt-1">Try adjusting your filters, or check your API keys in Settings.</p>
                  </div>
                )}
            </div>
            <aside>
                <ActivityFeed leads={leads} onSelectLead={onOpenActivityModal} />
            </aside>
        </main>
        
        {/* AI Reports Modal */}
        <ReportsModal
          isOpen={isReportsModalOpen}
          onClose={() => setIsReportsModalOpen(false)}
          leads={leads}
          timePeriod={timePeriod}
        />
      </div>
    </div>
  );
};

export default Dashboard;
