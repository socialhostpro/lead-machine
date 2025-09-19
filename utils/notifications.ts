import { Lead, LeadSource } from '../types';

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log("This browser does not support desktop notification");
    return;
  }

  if (Notification.permission !== 'denied') {
    await Notification.requestPermission();
  }
};

export const showNewLeadNotification = (lead: Lead) => {
  if (Notification.permission === 'granted') {
    const title = lead.source === LeadSource.INCOMING_CALL ? 'New Incoming Call' : 'New Lead Added!';
    
    const body = (lead.source === LeadSource.INCOMING_CALL && lead.callDetails?.summaryTitle)
      ? lead.callDetails.summaryTitle
      : `${lead.firstName} ${lead.lastName} from ${lead.company || 'N/A'}`;

    new Notification(title, {
      body: body,
      icon: '/vite.svg', 
    });
  }
};

export const showTestNotification = () => {
  if (Notification.permission === 'granted') {
    const title = 'Test Notification';
    const body = 'If you can see this, web notifications are working correctly!';
    new Notification(title, {
      body: body,
      icon: '/vite.svg',
    });
  } else if (Notification.permission === 'denied') {
    alert('Notifications are blocked. Please enable them in your browser settings.');
  } else {
    alert('Please allow notifications when prompted to test this feature.');
    requestNotificationPermission();
  }
};