import React from 'react';
import { Lead, LeadSource } from '../types';
import { UserIcon, PhoneIcon } from './icons';

interface ActivityFeedProps {
  leads: Lead[];
  onSelectLead: (id: string) => void;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ leads, onSelectLead }) => {
  const recentLeads = [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-md dark:shadow-lg border border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Recent Activity</h3>
      {recentLeads.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm">No recent activity for this company.</p>
      ) : (
        <ul className="space-y-2">
          {recentLeads.map(lead => {
            const isCall = lead.source === LeadSource.INCOMING_CALL;
            const Icon = isCall ? PhoneIcon : UserIcon;

            const isUnknownIncomingCall =
              isCall &&
              lead.firstName === 'Unknown' &&
              lead.callDetails?.summaryTitle;

            let title: React.ReactNode;
            if (isUnknownIncomingCall) {
              title = (
                <>
                  Incoming call: <span className="font-semibold text-slate-800 dark:text-white">{lead.callDetails!.summaryTitle}</span>
                </>
              );
            } else {
              const actionText = isCall ? 'Incoming call from:' : 'New lead added:';
              title = (
                <>
                  {actionText} <span className="font-semibold text-slate-800 dark:text-white">{lead.firstName} {lead.lastName}</span>
                </>
              );
            }

            return (
              <li
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                className="flex items-center space-x-3 p-2 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="bg-slate-200 dark:bg-slate-700 p-2 rounded-full">
                  <Icon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    {new Date(lead.createdAt).toLocaleString()}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ActivityFeed;