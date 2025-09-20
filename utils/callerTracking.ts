import { Lead, CallerTracking, TimeBasedStatus } from '../types';

/**
 * Calculate caller tracking data for a lead based on phone number
 */
export function calculateCallerTracking(leads: Lead[], currentLead: Lead): CallerTracking {
  const phoneNumber = currentLead.phone;
  if (!phoneNumber) {
    return {
      totalCalls: 1,
      callsToday: 1,
      callsThisWeek: 1,
      isReturning: false,
      lastContactTime: currentLead.callDetails?.callStartTime || currentLead.createdAt
    };
  }

  // Find all leads with the same phone number
  const samePhoneLeads = leads.filter(lead => 
    lead.phone === phoneNumber && lead.id !== currentLead.id
  );

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let callsToday = 1; // Include current lead
  let callsThisWeek = 1;
  let lastContactTime = currentLead.callDetails?.callStartTime || currentLead.createdAt;

  samePhoneLeads.forEach(lead => {
    const leadDate = new Date(lead.callDetails?.callStartTime || lead.createdAt);
    
    // Count calls today
    if (leadDate >= today) {
      callsToday++;
    }
    
    // Count calls this week
    if (leadDate >= weekAgo) {
      callsThisWeek++;
    }

    // Find most recent contact
    const contactTime = lead.callDetails?.callStartTime || lead.createdAt;
    if (new Date(contactTime) > new Date(lastContactTime)) {
      lastContactTime = contactTime;
    }
  });

  return {
    totalCalls: samePhoneLeads.length + 1,
    callsToday,
    callsThisWeek,
    isReturning: samePhoneLeads.length > 0,
    lastContactTime
  };
}

/**
 * Get time-based status for color coding
 */
export function getTimeBasedStatus(lastContactTime?: string): TimeBasedStatus {
  if (!lastContactTime) {
    return TimeBasedStatus.NEVER_CONTACTED;
  }

  const now = new Date();
  const lastContact = new Date(lastContactTime);
  const hoursDiff = (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60);

  if (hoursDiff <= 1) {
    return TimeBasedStatus.JUST_CALLED;
  } else if (hoursDiff <= 5) {
    return TimeBasedStatus.HOURS_5;
  } else if (hoursDiff <= 10) {
    return TimeBasedStatus.HOURS_10;
  } else if (hoursDiff <= 24) {
    return TimeBasedStatus.HOURS_24;
  } else if (hoursDiff <= 48) {
    return TimeBasedStatus.HOURS_48;
  } else {
    return TimeBasedStatus.NEVER_CONTACTED;
  }
}

/**
 * Get background color class based on time-based status
 */
export function getTimeBasedColorClass(timeBasedStatus: TimeBasedStatus, leadStatus: string): string {
  // Special status colors override time-based colors
  if (leadStatus === 'Client') {
    return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
  }
  if (leadStatus === 'Lost') {
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
  }
  if (leadStatus === 'Archive') {
    return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700';
  }

  // Time-based colors
  switch (timeBasedStatus) {
    case TimeBasedStatus.JUST_CALLED:
      return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
    case TimeBasedStatus.HOURS_5:
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700';
    case TimeBasedStatus.HOURS_10:
      return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700';
    case TimeBasedStatus.HOURS_24:
      return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700';
    case TimeBasedStatus.HOURS_48:
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
    case TimeBasedStatus.NEVER_CONTACTED:
    default:
      return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700';
  }
}

/**
 * Get text color class for time-based status indicators
 */
export function getTimeBasedTextColor(timeBasedStatus: TimeBasedStatus): string {
  switch (timeBasedStatus) {
    case TimeBasedStatus.JUST_CALLED:
      return 'text-green-600 dark:text-green-400';
    case TimeBasedStatus.HOURS_5:
      return 'text-blue-600 dark:text-blue-400';
    case TimeBasedStatus.HOURS_10:
      return 'text-orange-600 dark:text-orange-400';
    case TimeBasedStatus.HOURS_24:
      return 'text-purple-600 dark:text-purple-400';
    case TimeBasedStatus.HOURS_48:
      return 'text-red-600 dark:text-red-400';
    case TimeBasedStatus.NEVER_CONTACTED:
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

/**
 * Group returning callers together
 */
export function groupReturningCallers(leads: Lead[]): { returningGroups: Lead[][], singleCallers: Lead[] } {
  const phoneGroups = new Map<string, Lead[]>();
  const singleCallers: Lead[] = [];

  // Group leads by phone number
  leads.forEach(lead => {
    if (!lead.phone) {
      singleCallers.push(lead);
      return;
    }

    if (!phoneGroups.has(lead.phone)) {
      phoneGroups.set(lead.phone, []);
    }
    phoneGroups.get(lead.phone)!.push(lead);
  });

  // Separate returning callers from single callers
  const returningGroups: Lead[][] = [];
  
  phoneGroups.forEach((group, phone) => {
    if (group.length > 1) {
      // Sort by most recent call first
      group.sort((a, b) => {
        const aTime = a.callDetails?.callStartTime || a.createdAt;
        const bTime = b.callDetails?.callStartTime || b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      returningGroups.push(group);
    } else {
      singleCallers.push(group[0]);
    }
  });

  return { returningGroups, singleCallers };
}

/**
 * Format time difference for display
 */
export function formatTimeDifference(lastContactTime?: string): string {
  if (!lastContactTime) {
    return 'Never contacted';
  }

  const now = new Date();
  const lastContact = new Date(lastContactTime);
  const diffMs = now.getTime() - lastContact.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return 'Just called';
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}