import React from 'react';
import { LeadStatus } from '../types';

interface StatusBadgeProps {
  status: LeadStatus;
}

const statusColors: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  [LeadStatus.CONTACTED]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
  [LeadStatus.QUALIFIED]: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
  [LeadStatus.UNQUALIFIED]: 'bg-slate-200 text-slate-600 dark:bg-gray-500/20 dark:text-gray-400',
  [LeadStatus.CLOSED_WON]: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  [LeadStatus.CLOSED_LOST]: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
