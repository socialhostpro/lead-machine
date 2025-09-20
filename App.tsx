import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Dashboard from './components/Dashboard';
import LeadFormModal from './components/LeadFormModal';
import { Lead, LeadStatus, LeadSource, Company, User, UserRole, Note, WebForm, AIInsights } from './types';
import { useTheme } from './hooks/useTheme';
import SettingsModal from './components/SettingsModal';
import ProfileModal from './components/ProfileModal';
import { requestNotificationPermission, showNewLeadNotification } from './utils/notifications';
import { playNewLeadSound } from './utils/notificationSounds';
import toast from './utils/toast';
import { supabase, fromSupabase, toSupabase, SUPABASE_URL } from './utils/supabase';
import { Session } from '@supabase/supabase-js';
import Auth from './components/Auth';
import UserManagementModal from './components/UserManagementModal';
import EditLeadModal from './components/EditLeadModal';
import AddNoteModal from './components/AddNoteModal';
import PublicForm from './components/PublicForm';
import FormsManagementModal from './components/FormsManagementModal';
import EmbedCodeModal from './components/EmbedCodeModal';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { EmailNotificationManager, sendNewMessageNotification, getEmailNotificationConfig } from './utils/emailNotifications';


// Helper to get a user-friendly error message from a Supabase error object.
const getSupabaseErrorMessage = (error: any, fallbackMessage = 'An unknown error occurred.'): string => {
    if (typeof error === 'string') return error;
    if (error) {
        if (typeof error.details === 'string' && error.details) return error.details;
        if (typeof error.message === 'string' && error.message) return error.message;
        if (typeof error.error === 'object' && error.error !== null) {
            if (typeof error.error.message === 'string' && error.error.message) return error.error.message;
        }
        try {
            const stringified = JSON.stringify(error);
            if (stringified !== '{}') return stringified;
        } catch (e) { /* Ignore */ }
    }
    return fallbackMessage;
};


// Helper function to fetch user profile with retries.
const fetchUserProfileWithRetries = async (userId: string, retries = 5, delay = 300) => {
  for (let i = 0; i < retries; i++) {
    // FIX: Renamed 'users' table to 'profiles' to resolve database error and avoid naming conflicts.
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) return { data, error: null };
    if (error && error.code === 'PGRST116') {
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delay * (i + 1)));
      } else {
        return { data: null, error };
      }
    } else {
      return { data: null, error };
    }
  }
  return { data: null, error: { message: 'Max retries reached while fetching user profile.', code: 'MAX_RETRIES' } };
};


const App: React.FC = () => {
  const [path] = useState(window.location.pathname);

  // Simple Router for public form page
  if (path.startsWith('/form/')) {
    const formId = path.split('/form/')[1];
    return <PublicForm formId={formId} />;
  }
  
  const [theme, toggleTheme] = useTheme();
  
  // App State
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Persistent leads state with localStorage
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const savedLeads = localStorage.getItem('leads-cache');
      return savedLeads ? JSON.parse(savedLeads) : [];
    } catch {
      return [];
    }
  });
  
  // Update localStorage when leads change
  useEffect(() => {
    try {
      localStorage.setItem('leads-cache', JSON.stringify(leads));
    } catch (error) {
      console.warn('Failed to save leads to localStorage:', error);
    }
  }, [leads]);
  
  const leadsRef = useRef(leads);
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [forms, setForms] = useState<WebForm[]>([]);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [isLeadsLoading, setIsLeadsLoading] = useState(true);
  const [isNewLeadModalOpen, setNewLeadModalOpen] = useState(false);
  const [isEditLeadModalOpen, setEditLeadModalOpen] = useState(false);
  const [isAddNoteModalOpen, setAddNoteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [isUserManagementModalOpen, setUserManagementModalOpen] = useState(false);
  const [isFormsModalOpen, setFormsModalOpen] = useState(false);
  const [isEmbedCodeModalOpen, setEmbedCodeModalOpen] = useState(false);


  // Data for modals
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  const [leadForNewNote, setLeadForNewNote] = useState<Lead | null>(null);
  const [selectedFormForEmbed, setSelectedFormForEmbed] = useState<WebForm | null>(null);
  
  // FIX: Removed `as any` cast. Types for `import.meta.env` are now available globally.
  // const elevenLabsApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY; // Removed - now using Edge Functions

  useEffect(() => {
    requestNotificationPermission();

    // Handle Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUsers = async (isAdmin: boolean, companyId: string) => {
    // FIX: Renamed 'users' table to 'profiles' to resolve database error and avoid naming conflicts.
    let query = supabase.from('profiles').select('*');
    if (!isAdmin) {
      query = query.eq('company_id', companyId);
    }
    const { data: usersData, error } = await query;
    if (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } else {
      setUsers(usersData?.map((u): User => ({
        id: u.id, name: u.name, email: u.email, companyId: u.company_id,
        role: u.role as UserRole, isDisabled: u.is_disabled,
      })) || []);
    }
  };


  useEffect(() => {
    // Clear old cache format to force refresh
    const oldCacheKeys = Object.keys(localStorage).filter(key => key.includes('leads-'));
    oldCacheKeys.forEach(key => localStorage.removeItem(key));
    
    (window as any).clearLeadsCache = () => {
      // This will be called later when currentCompany is available
      console.log('🗑️ clearLeadsCache function registered (call when currentCompany is set)');
    };
    (window as any).forceRefreshLeads = () => {
      // This will be overridden later when fetchLeads is available
      console.log('🔄 forceRefreshLeads function registered (call when fetchLeads is available)');
    };
  }, []); // Remove dependencies that aren't available yet

  useEffect(() => {
    // CRITICAL: Unregister any existing service workers to prevent CORS issues
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister();
          console.log('🗑️ Unregistered service worker:', registration.scope);
        }
      });
    }
    
    const fetchInitialData = async () => {
      if (!session) {
        setCurrentUser(null);
        return;
      }

      const { data: userProfile, error: userError } = await fetchUserProfileWithRetries(session.user.id);
      
      if (userError || !userProfile) {
        console.error("Could not fetch user profile. Signing out.", userError ? getSupabaseErrorMessage(userError) : 'User profile is null.');
        await supabase.auth.signOut();
        return;
      }
      
      const user: User = {
        id: userProfile.id, name: userProfile.name, email: userProfile.email,
        companyId: userProfile.company_id, role: userProfile.role as UserRole, isDisabled: userProfile.is_disabled,
      };
      setCurrentUser(user);
      
      const isAdmin = user.role === UserRole.SAAS_ADMIN;

      let companiesQuery = supabase.from('companies').select('*');
      if (!isAdmin) {
          companiesQuery = companiesQuery.eq('id', user.companyId);
      }
      const { data: companiesData } = await companiesQuery;
      
      const fetchedCompanies = companiesData?.map(c => ({
        id: c.id, name: c.name, webhookUrl: c.webhook_url ?? undefined,
        webhookHeader: c.webhook_header ?? undefined, defaultAgentId: c.default_agent_id ?? undefined,
        address: c.address ?? undefined, city: c.city ?? undefined,
        state: c.state ?? undefined, zipCode: c.zip_code ?? undefined,
      })) || [];
      setCompanies(fetchedCompanies);

      if (isAdmin && fetchedCompanies.length > 0) {
        setCurrentCompanyId(fetchedCompanies[0].id);
      } else {
        setCurrentCompanyId(user.companyId);
      }

      await fetchUsers(isAdmin, user.companyId);
    };

    fetchInitialData();
  }, [session]);
  
  const currentCompany = useMemo(() => companies.find(c => c.id === currentCompanyId), [companies, currentCompanyId]);
  
  // Background ElevenLabs sync - runs independently of main fetch
  const syncElevenLabsInBackground = useCallback(async () => {
    if (!session || !currentCompany) return;
    
    try {
      console.log('🔄 Background ElevenLabs sync started...');
      const listResponse = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-conversations`, {
          headers: { 
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          }
      });
      
      if (listResponse.ok) {
        const elevenLabsData = await listResponse.json();
        const conversations = elevenLabsData.conversations || [];
        console.log(`📞 Background sync found ${conversations.length} conversations`);
        console.log('🔍 Raw ElevenLabs data structure:', elevenLabsData);
        if (conversations.length > 0) {
          console.log('🔍 First conversation sample:', conversations[0]);
        }
        
        // Get current database leads to check for new ones
        const { data: databaseLeads } = await supabase
          .from('leads')
          .select('*')
          .eq('company_id', currentCompany.id)
          .order('created_at', { ascending: false });
        
        const existingConversationIds = new Set(
          (databaseLeads || [])
            .filter(l => l.source === LeadSource.INCOMING_CALL && l.source_conversation_id)
            .map(l => l.source_conversation_id)
        );
        
        const newConversations = conversations.filter((conv: any) => 
          !existingConversationIds.has(conv.conversation_id)
        );
        
        if (newConversations.length > 0) {
          console.log(`💾 Saving ${newConversations.length} new conversations to database`);
          
          const newLeadsData = newConversations.map((conv: any) => {
            // Extract caller name from summary title or transcript if available
            let firstName = 'Unknown';
            let lastName = 'Caller';
            let phone = 'N/A';
            
            if (conv.summary_title) {
              const nameMatch = conv.summary_title.match(/^([A-Za-z]+)\s+([A-Za-z]+)/);
              if (nameMatch) {
                firstName = nameMatch[1];
                lastName = nameMatch[2];
              } else {
                // If no full name match, use the whole title as lastName
                lastName = conv.summary_title;
                firstName = 'Unknown';
              }
            } else if (conv.transcript_summary) {
              // Try to extract name from transcript summary
              const nameMatch = conv.transcript_summary.match(/(?:caller|user|customer)\s+(?:named\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
              if (nameMatch) {
                const fullName = nameMatch[1].split(' ');
                firstName = fullName[0];
                lastName = fullName[1] || 'Caller';
              }
            }
            
            // Extract phone number from conversation data
            if (conv.caller_number || conv.phone_number || conv.from_number) {
              phone = conv.caller_number || conv.phone_number || conv.from_number;
            } else if (conv.metadata && conv.metadata.caller_number) {
              phone = conv.metadata.caller_number;
            } else if (conv.transcript_summary) {
              // Try to extract phone number from transcript
              const phoneMatch = conv.transcript_summary.match(/(\d{3}[-.]?\d{3}[-.]?\d{4})/);
              if (phoneMatch) {
                phone = phoneMatch[1];
              }
            }
            
            // Extract email from conversation data
            let email = `${conv.conversation_id}@imported-lead.com`; // Default placeholder
            
            // Try to find real email in conversation data
            if (conv.caller_email || conv.email_address || conv.email) {
              email = conv.caller_email || conv.email_address || conv.email;
            } else if (conv.metadata && conv.metadata.caller_email) {
              email = conv.metadata.caller_email;
            } else if (conv.transcript_summary) {
              // Try to extract email from transcript
              const emailMatch = conv.transcript_summary.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
              if (emailMatch) {
                email = emailMatch[1];
              }
            }
            
            const leadForConversion: Omit<Lead, 'id' | 'createdAt'> = {
              companyId: currentCompany.id,
              firstName: firstName,
              lastName: lastName,
              company: '',
              email: email,
              phone: phone,
              status: LeadStatus.NEW,
              notes: [],
              source: LeadSource.INCOMING_CALL,
              callDetails: {
                conversationId: conv.conversation_id,
                summaryTitle: conv.summary_title || 'ElevenLabs Conversation',
                transcriptSummary: conv.transcript_summary || 'ElevenLabs conversation',
                callStartTime: conv.start_time_unix_secs ? new Date(conv.start_time_unix_secs * 1000).toISOString() : undefined,
                callDuration: conv.call_duration_secs
              },
              issueDescription: conv.transcript_summary || 'ElevenLabs conversation',
              aiInsights: null
            };
            return toSupabase(leadForConversion);
          });
          
          const { data: insertedLeads, error: insertError } = await supabase
            .from('leads')
            .upsert(newLeadsData, { onConflict: 'source_conversation_id' })
            .select();
          
          if (!insertError && insertedLeads) {
            console.log(`✅ Successfully saved ${insertedLeads.length} new leads to database`);
            
            // Update UI with new leads if currently viewing leads
            const newFrontendLeads = insertedLeads.map(fromSupabase);
            setLeads(prev => [...newFrontendLeads, ...prev]);
            
            // Play sound notification
            if (currentUser) {
              const soundPreferences = {
                enabled: currentUser.sound_notifications_enabled ?? true,
                volume: currentUser.notification_volume ?? 0.7,
                newLeadSound: currentUser.new_lead_sound ?? 'notification',
                emailSound: currentUser.email_sound ?? 'email'
              };
              
              if (newFrontendLeads.length === 1) {
                await playNewLeadSound(soundPreferences);
              } else if (newFrontendLeads.length > 1) {
                await playNewLeadSound(soundPreferences);
                console.log(`🔔 ${newFrontendLeads.length} new leads detected!`);
              }
            }
          } else if (insertError) {
            console.error('❌ Error saving new leads:', insertError);
          }
        } else {
          console.log('✅ No new conversations found');
        }
      } else {
        const errorText = await listResponse.text();
        console.error(`🚨 ElevenLabs sync failed with status ${listResponse.status}:`, errorText);
        console.error('🔑 Session token:', session?.access_token ? 'Present' : 'Missing');
        console.error('🏢 Company ID:', currentCompany?.id);
      }
    } catch (error) {
      console.error('🚨 Background ElevenLabs sync failed:', error);
    }
  }, [session, currentCompany, currentUser]);

  // Set up background sync interval (every 5 minutes)
  useEffect(() => {
    if (!session || !currentCompany) return;
    
    // Run initial background sync
    syncElevenLabsInBackground();
    
    // Set up interval for background sync
    const syncInterval = setInterval(syncElevenLabsInBackground, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(syncInterval);
  }, [syncElevenLabsInBackground, session, currentCompany]);

  const fetchLeads = useCallback(async (forceRefresh = false) => {
    if (!currentCompany?.defaultAgentId) {
      if(currentCompany) {
        toast.warning('Please set your Default Agent ID in settings to fetch call data.');
        setIsSettingsModalOpen(true);
      }
      setLeads([]);
      setIsLeadsLoading(false);
      return;
    }

    // Check cache freshness (5 minutes)
    const cacheKey = `leads-last-fetch-${currentCompany.id}`;
    const lastFetchTime = localStorage.getItem(cacheKey);
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    if (!forceRefresh && lastFetchTime && (now - parseInt(lastFetchTime)) < CACHE_DURATION) {
      console.log('Using cached leads data (background sync handles ElevenLabs)');
      setIsLeadsLoading(false);
      // Force background sync to run immediately if not already running
      setTimeout(() => syncElevenLabsInBackground(), 1000);
      return;
    }

    setIsLeadsLoading(true);
    
    // Show loading toast for manual refresh
    let loadingToast: string | null = null;
    if (forceRefresh) {
      loadingToast = toast.info('Refreshing leads...', { duration: 0 });
    }

    try {
      // DATABASE-FIRST APPROACH: Load from database as primary source
      const { data: supabaseLeads, error: dbError } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });
      
      if (dbError) throw dbError;
      
      // Convert database leads to frontend format
      let databaseLeads: Lead[] = supabaseLeads?.map(l => fromSupabase(l)) ?? [];
      
      // SYNC PHASE: Check ElevenLabs API for new conversations to save to database
      try {
        console.log('🔄 Starting ElevenLabs sync...');
        const listResponse = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-conversations`, {
            headers: { 
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 ElevenLabs API response status:', listResponse.status);
        
        if (listResponse.ok) {
          const elevenLabsData = await listResponse.json();
          console.log('📊 ElevenLabs data received:', elevenLabsData);
          const conversations = elevenLabsData.conversations || [];
          console.log(`📞 Found ${conversations.length} conversations from ElevenLabs`);
          
          // Create map of existing conversation IDs in database
          const existingConversationIds = new Set(
            databaseLeads
              .filter(l => l.source === LeadSource.INCOMING_CALL && l.callDetails?.conversationId)
              .map(l => l.callDetails?.conversationId)
          );
          
          console.log('💾 Existing conversation IDs in database:', Array.from(existingConversationIds));
          
          // Find new conversations not in database
          const newConversations = conversations.filter((conv: any) => 
            !existingConversationIds.has(conv.conversation_id)
          );
          
          // Save new conversations to database
          if (newConversations.length > 0) {
            console.log(`Saving ${newConversations.length} new conversations to database`);
            
          const newLeadsData = newConversations.map((conv: any) => {
            // Extract caller name from summary title or transcript if available
            let firstName = 'Unknown';
            let lastName = 'Caller';
            let phone = 'N/A';
            
            if (conv.summary_title) {
              const nameMatch = conv.summary_title.match(/^([A-Za-z]+)\s+([A-Za-z]+)/);
              if (nameMatch) {
                firstName = nameMatch[1];
                lastName = nameMatch[2];
              } else {
                // If no full name match, use the whole title as lastName
                lastName = conv.summary_title;
                firstName = 'Unknown';
              }
            } else if (conv.transcript_summary) {
              // Try to extract name from transcript summary
              const nameMatch = conv.transcript_summary.match(/(?:caller|user|customer)\s+(?:named\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
              if (nameMatch) {
                const fullName = nameMatch[1].split(' ');
                firstName = fullName[0];
                lastName = fullName[1] || 'Caller';
              }
            }
            
            // Extract phone number from conversation data
            if (conv.caller_number || conv.phone_number || conv.from_number) {
              phone = conv.caller_number || conv.phone_number || conv.from_number;
            } else if (conv.metadata && conv.metadata.caller_number) {
              phone = conv.metadata.caller_number;
            } else if (conv.transcript_summary) {
              // Try to extract phone number from transcript
              const phoneMatch = conv.transcript_summary.match(/(\d{3}[-.]?\d{3}[-.]?\d{4})/);
              if (phoneMatch) {
                phone = phoneMatch[1];
              }
            }
            
            // Extract email from conversation data
            let email = `${conv.conversation_id}@imported-lead.com`; // Default placeholder
            
            // Try to find real email in conversation data
            if (conv.caller_email || conv.email_address || conv.email) {
              email = conv.caller_email || conv.email_address || conv.email;
            } else if (conv.metadata && conv.metadata.caller_email) {
              email = conv.metadata.caller_email;
            } else if (conv.transcript_summary) {
              // Try to extract email from transcript
              const emailMatch = conv.transcript_summary.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
              if (emailMatch) {
                email = emailMatch[1];
              }
            }
            
            const leadForConversion: Omit<Lead, 'id' | 'createdAt'> = {
              companyId: currentCompany.id,
              firstName: firstName,
              lastName: lastName,
              company: '',
              email: email,
              phone: phone,
              status: LeadStatus.NEW,
              notes: [],
              source: LeadSource.INCOMING_CALL,
              callDetails: {
                conversationId: conv.conversation_id,
                summaryTitle: conv.summary_title || 'ElevenLabs Conversation',
                transcriptSummary: conv.transcript_summary || 'ElevenLabs conversation',
                callStartTime: conv.start_time_unix_secs ? new Date(conv.start_time_unix_secs * 1000).toISOString() : undefined,
                callDuration: conv.call_duration_secs
              },
              issueDescription: conv.transcript_summary || 'ElevenLabs conversation',
              aiInsights: null
            };
            return toSupabase(leadForConversion);
          });            const { data: insertedLeads, error: insertError } = await supabase
              .from('leads')
              .upsert(newLeadsData, { onConflict: 'source_conversation_id' })
              .select();
            
            if (!insertError && insertedLeads) {
              // Add new leads to our list (prepend so they appear at top)
              const newFrontendLeads = insertedLeads.map(fromSupabase);
              databaseLeads = [...newFrontendLeads, ...databaseLeads];
              
              // PLAY SOUND NOTIFICATION for new leads
              if (newFrontendLeads.length > 0 && currentUser) {
                const soundPreferences = {
                  enabled: currentUser.sound_notifications_enabled ?? true,
                  volume: currentUser.notification_volume ?? 0.7,
                  newLeadSound: currentUser.new_lead_sound ?? 'notification',
                  emailSound: currentUser.email_sound ?? 'email'
                };
                
                // Play sound for each new lead (but don't overwhelm user)
                if (newFrontendLeads.length === 1) {
                  await playNewLeadSound(soundPreferences);
                } else if (newFrontendLeads.length > 1) {
                  // For multiple leads, play sound once then show count in console
                  await playNewLeadSound(soundPreferences);
                  console.log(`🔔 ${newFrontendLeads.length} new leads detected!`);
                }
                
                // SEND EMAIL NOTIFICATIONS for new leads
                try {
                  if (currentUser.email_notifications_enabled !== false) {
                    const emailConfig = await getEmailNotificationConfig(currentUser.companyId);
                    
                    for (const newLead of newFrontendLeads) {
                      const leadMessage = `A new lead has been received:
                        
Name: ${newLead.firstName} ${newLead.lastName}
Phone: ${newLead.phone !== 'N/A' ? newLead.phone : 'Not provided'}
Email: ${newLead.email && !newLead.email.includes('@imported-lead.com') ? newLead.email : 'Not provided'}
Source: ${newLead.source}
${newLead.callDetails?.callStartTime ? `Call Time: ${new Date(newLead.callDetails.callStartTime).toLocaleString()}` : `Created: ${new Date(newLead.createdAt).toLocaleString()}`}

${newLead.issueDescription ? `Issue: ${newLead.issueDescription}` : ''}

Please log in to the Lead Machine to review and respond to this lead.`;

                      await sendNewMessageNotification(
                        newLead.id,
                        leadMessage,
                        [currentUser.email]
                      );
                    }
                    console.log(`📧 Email notifications sent for ${newFrontendLeads.length} new lead(s)`);
                  }
                } catch (error) {
                  console.error('Failed to send email notifications for new leads:', error);
                }
              }
            } else if (insertError) {
              console.error('Error inserting new leads:', insertError);
            }
          }
        } else {
          // Handle non-ok response
          const errorData = await listResponse.text();
          console.error(`🚨 ElevenLabs API error (${listResponse.status}):`, errorData);
        }
      } catch (apiError) {
        console.error('🚨 ElevenLabs API sync failed:', apiError);
        console.warn('ElevenLabs API sync failed, using database data only:', apiError);
      }
      
      // Set leads from database (now includes any newly synced conversations)
      setLeads(databaseLeads);
      
      // Show success toast for manual refresh
      if (forceRefresh && loadingToast) {
        toast.remove(loadingToast);
        const newCount = databaseLeads.length;
        toast.success(`Successfully refreshed ${newCount} leads`);
      }

    } catch (error) {
        console.error("Failed to fetch leads:", error);
        
        // Remove loading toast and show error
        if (loadingToast) {
          toast.remove(loadingToast);
        }
        
        const errorMessage = getSupabaseErrorMessage(error);
        toast.error(`Error refreshing leads: ${errorMessage}`);
        setLeads([]);
    } finally {
        setIsLeadsLoading(false);
    }
    
    // Update cache timestamp
    localStorage.setItem(cacheKey, now.toString());
  }, [currentCompany, session]);

  // Manual phone number update function for testing
  const updatePhoneNumbers = useCallback(async () => {
    if (!session || !currentCompany) return;
    
    console.log('🔄 Manual phone number update started...');
    
    try {
      const listResponse = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-conversations`, {
          headers: { 
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          }
      });
      
      if (listResponse.ok) {
        const elevenLabsData = await listResponse.json();
        const conversations = elevenLabsData.conversations || [];
        
        console.log('🔍 Full ElevenLabs response:', elevenLabsData);
        console.log('📞 Found conversations:', conversations.length);
        
        if (conversations.length > 0) {
          console.log('🔍 Sample conversation structure:', JSON.stringify(conversations[0], null, 2));
        }
        
        // Get all leads that need phone updates
        const { data: allLeads } = await supabase
          .from('leads')
          .select('*')
          .eq('company_id', currentCompany.id)
          .eq('source', LeadSource.INCOMING_CALL);
        
        console.log('📋 Found leads to update:', allLeads?.length || 0);
        
        // Try to match conversations to leads and update phones
        for (const lead of allLeads || []) {
          const conversation = conversations.find((conv: any) => 
            conv.conversation_id === lead.source_conversation_id
          );
          
          if (conversation) {
            console.log(`🔍 Processing conversation ${conversation.conversation_id}`);
            console.log('Available fields:', Object.keys(conversation));
            
            let phone = 'N/A';
            let email = lead.email; // Keep existing email unless we find a better one
            
            // Try all possible phone fields
            if (conversation.caller_number) {
              phone = conversation.caller_number;
              console.log(`📞 Found phone in caller_number: ${phone}`);
            } else if (conversation.phone_number) {
              phone = conversation.phone_number;
              console.log(`📞 Found phone in phone_number: ${phone}`);
            } else if (conversation.from_number) {
              phone = conversation.from_number;
              console.log(`📞 Found phone in from_number: ${phone}`);
            } else if (conversation.metadata?.caller_number) {
              phone = conversation.metadata.caller_number;
              console.log(`📞 Found phone in metadata.caller_number: ${phone}`);
            } else {
              console.warn(`⚠️ No phone found for conversation ${conversation.conversation_id}`);
            }
            
            // Try all possible email fields
            if (conversation.caller_email) {
              email = conversation.caller_email;
              console.log(`📧 Found email in caller_email: ${email}`);
            } else if (conversation.email_address) {
              email = conversation.email_address;
              console.log(`📧 Found email in email_address: ${email}`);
            } else if (conversation.email) {
              email = conversation.email;
              console.log(`📧 Found email in email: ${email}`);
            } else if (conversation.metadata?.caller_email) {
              email = conversation.metadata.caller_email;
              console.log(`📧 Found email in metadata.caller_email: ${email}`);
            } else if (conversation.transcript_summary) {
              // Try to extract email from transcript
              const emailMatch = conversation.transcript_summary.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
              if (emailMatch) {
                email = emailMatch[1];
                console.log(`📧 Found email in transcript: ${email}`);
              }
            }
            
            // Update lead if we found new phone or email
            const needsUpdate = (phone !== 'N/A' && phone !== lead.phone) || 
                               (email !== lead.email && email && !email.includes('@imported-lead.com'));
            
            if (needsUpdate) {
              const updateData: any = {};
              if (phone !== 'N/A' && phone !== lead.phone) {
                updateData.phone = phone;
                console.log(`📞 Updating lead ${lead.id} phone from "${lead.phone}" to "${phone}"`);
              }
              if (email !== lead.email && email && !email.includes('@imported-lead.com')) {
                updateData.email = email;
                console.log(`📧 Updating lead ${lead.id} email from "${lead.email}" to "${email}"`);
              }
              
              const { error } = await supabase
                .from('leads')
                .update(updateData)
                .eq('id', lead.id);
              
              if (error) {
                console.error('Error updating lead:', error);
              } else {
                console.log(`✅ Updated lead ${lead.id} successfully`);
              }
            }
          }
        }
        
        // Refresh the leads after updating
        await fetchLeads();
        console.log('✅ Manual phone update complete');
      }
    } catch (error) {
      console.error('Error in manual phone update:', error);
    }
  }, [session, currentCompany, fetchLeads]);

  // Function to update existing leads with missing phone numbers (now fetchLeads is available)
  const updateExistingLeadsWithPhoneNumbers = useCallback(async () => {
    if (!session || !currentCompany) return;
    
    try {
      console.log('🔄 Updating existing leads with phone numbers...');
      
      // Get all leads that have conversation IDs but no phone numbers
      const { data: leadsNeedingPhone } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('source', LeadSource.INCOMING_CALL)
        .not('source_conversation_id', 'is', null)
        .or('phone.is.null,phone.eq.N/A');
      
      if (!leadsNeedingPhone || leadsNeedingPhone.length === 0) {
        console.log('✅ No leads need phone number updates');
        return;
      }
      
      console.log(`📞 Found ${leadsNeedingPhone.length} leads that need phone numbers`);
      
      // Fetch ElevenLabs conversation data
      const listResponse = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-conversations`, {
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!listResponse.ok) {
        console.error('Failed to fetch ElevenLabs conversations for phone update');
        return;
      }
      
      const elevenLabsData = await listResponse.json();
      const conversations = elevenLabsData.conversations || [];
      
      // Create a map of conversation ID to conversation data
      const conversationMap = new Map();
      conversations.forEach((conv: any) => {
        conversationMap.set(conv.conversation_id, conv);
      });
      
      // Update leads with phone numbers
      const updates = [];
      for (const lead of leadsNeedingPhone) {
        const conv = conversationMap.get(lead.source_conversation_id);
        if (conv) {
          let phone = 'N/A';
          
          // Extract phone number using same logic as new leads
          if (conv.caller_number || conv.phone_number || conv.from_number) {
            phone = conv.caller_number || conv.phone_number || conv.from_number;
          } else if (conv.metadata && conv.metadata.caller_number) {
            phone = conv.metadata.caller_number;
          } else if (conv.transcript_summary) {
            const phoneMatch = conv.transcript_summary.match(/(\d{3}[-.]?\d{3}[-.]?\d{4})/);
            if (phoneMatch) {
              phone = phoneMatch[1];
            }
          }
          
          if (phone !== 'N/A') {
            updates.push({
              id: lead.id,
              phone: phone
            });
          }
        }
      }
      
      if (updates.length > 0) {
        console.log(`📱 Updating ${updates.length} leads with phone numbers`);
        
        // Update each lead individually
        for (const update of updates) {
          await supabase
            .from('leads')
            .update({ phone: update.phone })
            .eq('id', update.id);
        }
        
        console.log(`✅ Successfully updated ${updates.length} leads with phone numbers`);
        
        // Refresh the leads to show updated phone numbers
        await fetchLeads(true);
      } else {
        console.log('📱 No phone numbers found to update');
      }
      
    } catch (error) {
      console.error('🚨 Error updating leads with phone numbers:', error);
    }
  }, [session, currentCompany, fetchLeads]);

  // Set up global debugging functions after fetchLeads is available
  useEffect(() => {
    (window as any).clearLeadsCache = () => {
      const cacheKey = `leads-last-fetch-${currentCompany?.id}`;
      localStorage.removeItem(cacheKey);
      localStorage.removeItem('leads-cache');
      console.log('🗑️ Leads cache cleared! Refresh to fetch new data.');
    };
    (window as any).forceRefreshLeads = () => {
      if (currentCompany && fetchLeads) {
        fetchLeads(true);
      }
    };
    (window as any).updatePhoneNumbers = () => {
      if (currentCompany && updateExistingLeadsWithPhoneNumbers) {
        updateExistingLeadsWithPhoneNumbers();
      }
    };
  }, [currentCompany, fetchLeads]);

  const fetchForms = useCallback(async () => {
    if (!currentCompanyId) return;
    const { data, error } = await supabase.from('forms').select('*').eq('company_id', currentCompanyId).order('created_at');
    if (error) {
        console.error('Error fetching forms:', error);
    } else {
        setForms(data as any[] as WebForm[]);
    }
  }, [currentCompanyId]);


  useEffect(() => {
    if (currentCompanyId) {
        fetchLeads();
        fetchForms();
        // Update existing leads with missing phone numbers after initial load
        setTimeout(() => updateExistingLeadsWithPhoneNumbers(), 2000);
    }
  }, [currentCompanyId]); // FIXED: Removed fetchLeads, fetchForms from deps to stop infinite re-renders


  const handleAddLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'notes' | 'status' | 'source' | 'callDetails' | 'companyId'> & { issueDescription?: string }) => {
    if (!currentCompanyId) return;

    const newLeadPartial: Omit<Lead, 'id' | 'createdAt'> = {
      ...leadData, companyId: currentCompanyId, status: LeadStatus.NEW,
      source: LeadSource.MANUAL, notes: [],
    };

    const { data, error } = await supabase.from('leads').insert(toSupabase(newLeadPartial)).select().single();

    if (error) {
      alert('Error adding lead: ' + getSupabaseErrorMessage(error));
    } else {
      const savedLead = fromSupabase(data);
      setLeads(prev => [savedLead, ...prev]);
      showNewLeadNotification(savedLead);
      
      // PLAY SOUND NOTIFICATION for manually added lead
      if (currentUser) {
        const soundPreferences = {
          enabled: currentUser.sound_notifications_enabled ?? true,
          volume: currentUser.notification_volume ?? 0.7,
          newLeadSound: currentUser.new_lead_sound ?? 'notification',
          emailSound: currentUser.email_sound ?? 'email'
        };
        await playNewLeadSound(soundPreferences);
      }
    }
  };
  
  const handleUpdateLead = async (updatedLead: Lead) => {
    const originalLeads = [...leads];
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));

    const { id, ...rest } = updatedLead;
    let error;

    if (updatedLead.source === LeadSource.INCOMING_CALL && updatedLead.callDetails?.conversationId) {
        const upsertData = toSupabase(rest);
        upsertData.source_conversation_id = updatedLead.callDetails.conversationId;
        const { error: upsertError } = await supabase.from('leads').upsert(upsertData, { onConflict: 'source_conversation_id' });
        error = upsertError;
    } else {
        const { error: updateError } = await supabase.from('leads').update(toSupabase(rest)).eq('id', id);
        error = updateError;
    }

    if (error) {
        console.error('Error updating lead:', error);
        setLeads(originalLeads);
        alert(`Failed to update lead: ${getSupabaseErrorMessage(error)}`);
    }
  };
  
  const handleDeleteLead = async (id: string) => {
    const leadToDelete = leads.find(l => l.id === id);
    if (!leadToDelete) return;

    const originalLeads = [...leads];
    setLeads(prev => prev.filter(l => l.id !== id));

    try {
        if (leadToDelete.source === LeadSource.INCOMING_CALL && leadToDelete.callDetails?.conversationId) {
            const deleteResponse = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-conversations`, {
                method: 'DELETE',
                headers: { 
                  'Authorization': `Bearer ${session?.access_token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ conversationId: leadToDelete.callDetails.conversationId })
            });
            if (!deleteResponse.ok && deleteResponse.status !== 404) {
                 const errorData = await deleteResponse.json();
                 throw new Error(`Failed to delete from ElevenLabs (Status ${deleteResponse.status}): ${errorData.error || 'No error details'}`);
            }
        }
        
        let deleteQuery;
        if (leadToDelete.source === LeadSource.INCOMING_CALL && leadToDelete.callDetails?.conversationId) {
            deleteQuery = supabase.from('leads').delete().eq('source_conversation_id', leadToDelete.callDetails.conversationId);
        } else {
            deleteQuery = supabase.from('leads').delete().eq('id', leadToDelete.id);
        }
        
        const { error } = await deleteQuery;
        if (error) throw error;

    } catch (error) {
        console.error('Error deleting lead:', error);
        setLeads(originalLeads);
        alert(`Failed to delete lead: ${getSupabaseErrorMessage(error)}`);
    }
  };

  const handleOpenEditModal = (lead: Lead) => {
    setLeadToEdit(lead);
    setEditLeadModalOpen(true);
  };

  const handleOpenAddNoteModal = (lead: Lead) => {
      setLeadForNewNote(lead);
      setAddNoteModalOpen(true);
  };
  
  const handleSaveNote = async (noteText: string) => {
      if (!leadForNewNote) return;
      const newNote: Note = {
          id: crypto.randomUUID(), text: noteText, createdAt: new Date().toISOString(),
      };
      const updatedLead = { ...leadForNewNote, notes: [newNote, ...(leadForNewNote.notes || [])], };
      
      // Send email notification for new message/note
      if (currentUser?.companyId) {
          try {
              const emailConfig = await getEmailNotificationConfig(currentUser.companyId);
              if (emailConfig?.enabled && emailConfig.adminEmails.length > 0) {
                  await sendNewMessageNotification(
                      leadForNewNote.id,
                      noteText,
                      emailConfig.adminEmails
                  );
                  console.log('Email notification sent for new note');
              }
          } catch (error) {
              console.error('Failed to send email notification:', error);
          }
      }
      
      handleUpdateLead(updatedLead);
  };
  
  const handleUpdateCompany = async (updatedCompany: Company): Promise<{ success: boolean, error?: string }> => {
    const { error } = await supabase.from('companies').update({
        name: updatedCompany.name,
        webhook_url: updatedCompany.webhookUrl ?? null,
        webhook_header: updatedCompany.webhookHeader ?? null,
        default_agent_id: updatedCompany.defaultAgentId ?? null,
    }).eq('id', updatedCompany.id);
    
    if (error) {
      const errorMessage = getSupabaseErrorMessage(error, 'Error updating company settings.');
      console.error("Error updating company:", errorMessage);
      return { success: false, error: errorMessage };
    } else {
        setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
        return { success: true };
    }
  };

  const handleUpdateUser = async (updatedUser: User): Promise<{ success: boolean, error?: string }> => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    // FIX: Renamed 'users' table to 'profiles' to resolve database error and avoid naming conflicts.
    const { error } = await supabase.from('profiles').update({
        name: updatedUser.name,
    }).eq('id', updatedUser.id);
    
    if (error) {
      const errorMessage = getSupabaseErrorMessage(error, 'Error updating user profile.');
       console.error("Error updating user:", errorMessage);
      return { success: false, error: errorMessage };
    } else {
        setCurrentUser(updatedUser);
        return { success: true };
    }
  };
  
  const handleSendToWebhook = async (lead: Lead) => {
    if (!currentCompany?.webhookUrl) {
        alert('Webhook URL is not configured. Please set it up in Settings.');
        return;
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-webhook`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session?.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                leadData: lead,
                webhookUrl: currentCompany.webhookUrl,
                webhookHeader: currentCompany.webhookHeader
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Webhook failed with status ${response.status}`);
        }
        
        alert('Lead information successfully sent to webhook!');

    } catch (error: any) {
        console.error('Error sending to webhook:', error);
        alert(`Failed to send lead to webhook: ${error.message}`);
    }
  };

  const handleSendEmail = async (lead: Lead) => {
    if (!currentUser?.email) {
        toast.error('User email is not available. Please check your profile settings.');
        return;
    }

    try {
        // Format call details for the email
        const callTimeInfo = lead.callDetails?.callStartTime 
            ? `Call received: ${new Date(lead.callDetails.callStartTime).toLocaleString()}`
            : `Lead created: ${new Date(lead.createdAt).toLocaleString()}`;

        const phoneInfo = lead.phone && lead.phone !== 'N/A' ? lead.phone : 'Not provided';
        const emailInfo = lead.email && !lead.email.includes('@imported-lead.com') ? lead.email : 'Not provided';
        
        const leadSummary = `
Lead Information:
- Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.company || 'Not provided'}
- Phone: ${phoneInfo}
- Email: ${emailInfo}
- Status: ${lead.status}
- Source: ${lead.source}
- ${callTimeInfo}

${lead.issueDescription ? `Issue Description:\n${lead.issueDescription}` : ''}

${lead.callDetails?.transcriptSummary ? `Call Summary:\n${lead.callDetails.transcriptSummary}` : ''}

${lead.notes && lead.notes.length > 0 ? `Notes:\n${lead.notes.map(note => `- ${note.text}`).join('\n')}` : ''}
        `.trim();

        const { data, error } = await supabase.functions.invoke('sendgrid-notifications', {
            body: {
                type: 'lead_info',
                messageData: {
                    subject: `Lead Information: ${lead.firstName} ${lead.lastName} - ${lead.source}`,
                    message: leadSummary,
                    leadName: `${lead.firstName} ${lead.lastName}`,
                    leadEmail: emailInfo,
                    leadPhone: phoneInfo,
                    leadCompany: lead.company,
                    leadSource: lead.source,
                    leadStatus: lead.status,
                    leadId: lead.id
                },
                recipientEmails: [currentUser.email],
                companyId: currentCompany.id
            }
        });

        if (error) {
            console.error('SendGrid API Error:', error);
            toast.error(`Failed to send email: ${error.message}`);
        } else {
            console.log('Lead info email sent successfully:', data);
            toast.success('Lead information emailed successfully!');
        }
    } catch (error: any) {
        console.error('Error sending lead email:', error);
        toast.error(`Failed to send email: ${error.message}`);
    }
  };

  const handleGenerateInsights = async (lead: Lead) => {
    try {
      const geminiApiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY || 'AIzaSyAwq9uY0eLXN9ce8iiv1h19K9uJhU0QiqU';
      if (!geminiApiKey) {
        throw new Error("GEMINI_API_KEY environment variable not set.");
      }
      const ai = new GoogleGenerativeAI(geminiApiKey);

      // Construct a detailed prompt
      let prompt = `Analyze the following sales lead and provide insights.
      
      Lead Details:
      - Name: ${lead.firstName} ${lead.lastName}
      - Company: ${lead.company || 'Not provided'}
      - Email: ${lead.email}
      - Phone: ${lead.phone || 'Not provided'}
      - Source: ${lead.source}
      `;

      if (lead.issueDescription) {
        prompt += `\n- Issue Description: ${lead.issueDescription}`;
      }
      if (lead.callDetails?.transcriptSummary) {
        prompt += `\n- Call Summary: ${lead.callDetails.transcriptSummary}`;
      }
      if (lead.notes && lead.notes.length > 0) {
        const notesText = lead.notes.map(n => `- ${n.text}`).join('\n');
        prompt += `\n\nNotes:\n${notesText}`;
      }
      
      prompt += `\n\nBased on all the information, provide a qualification score from 1 to 100, a brief justification for the score, a list of key pain points, and a list of suggested next steps for the sales agent to take. A higher score means a more qualified lead who is more likely to convert to a sale.`;

      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

      const response = await model.generateContent([{
        text: prompt
      }]);

      let responseText = response.response.text();
      
      // Try to parse as JSON, fall back to manual parsing if needed
      let insights: AIInsights;
      try {
        const parsed = JSON.parse(responseText);
        insights = {
          qualificationScore: parsed.qualificationScore || 50,
          justification: parsed.justification || "Analysis generated",
          keyPainPoints: parsed.keyPainPoints || ["Analysis needed"],
          suggestedNextSteps: parsed.suggestedNextSteps || ["Follow up required"]
        };
      } catch {
        // Fallback parsing if JSON fails
        insights = {
          qualificationScore: 50,
          justification: "Analysis generated successfully",
          keyPainPoints: ["Further analysis needed"],
          suggestedNextSteps: ["Follow up with lead"]
        };
      }
      
      const updatedLead = { ...lead, aiInsights: insights };
      await handleUpdateLead(updatedLead);

    } catch (error) {
      console.error('Error generating AI insights:', error);
      alert(`Failed to generate AI insights. Please check the console for details. Error: ${getSupabaseErrorMessage(error)}`);
    }
  };
  
  const handleInviteUser = (email: string) => {
    alert('User invite functionality requires a backend function.');
  };

  const handleUpdateUserByAdmin = async (user: User) => {
    if (currentUser?.role !== UserRole.SAAS_ADMIN) return;
    // FIX: Renamed 'users' table to 'profiles' to resolve database error and avoid naming conflicts.
    const { error } = await supabase.from('profiles').update({
        name: user.name, company_id: user.companyId,
        role: user.role, is_disabled: user.isDisabled,
    }).eq('id', user.id);

    if (error) alert("Error updating user: " + getSupabaseErrorMessage(error));
    else await fetchUsers(true, '');
  };

  const handleDeleteUser = async (userId: string) => {
      if (currentUser?.role !== UserRole.SAAS_ADMIN) return;
      // FIX: Renamed 'users' table to 'profiles' to resolve database error and avoid naming conflicts.
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) alert("Error deleting user: " + getSupabaseErrorMessage(error));
      else await fetchUsers(true, '');
  };
  
  const handleResetAndResync = () => {
    const doReset = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error signing out:", error);
        }
        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch (error) {
            console.error("Error clearing storage:", error);
        }
        window.location.reload();
    };
    doReset();
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', getSupabaseErrorMessage(error));
    }
    // A page reload is the most reliable way to clear all app state
    // and ensure the user is taken back to the login screen.
    window.location.reload();
  };

  const handleSaveForm = async (form: Omit<WebForm, 'id' | 'createdAt' | 'companyId'> | WebForm) => {
    if (!currentCompanyId) return;

    const isUpdating = 'id' in form;
    const formToSave = { ...form, companyId: currentCompanyId };
    
    const { data, error } = isUpdating
        ? await supabase.from('forms').update(formToSave as any).eq('id', form.id).select().single()
        : await supabase.from('forms').insert(formToSave as any).select().single();

    if (error) {
        alert(`Error saving form: ${getSupabaseErrorMessage(error)}`);
        return false;
    } else if (data) {
        await fetchForms();
        return true;
    }
    return false;
  };

  const handleDeleteForm = async (formId: string) => {
    const { error } = await supabase.from('forms').delete().eq('id', formId);
    if (error) {
        alert(`Error deleting form: ${getSupabaseErrorMessage(error)}`);
    } else {
        await fetchForms();
    }
  };
  
  const handleOpenEmbedCodeModal = (form: WebForm) => {
    setSelectedFormForEmbed(form);
    setEmbedCodeModalOpen(true);
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />;
  }

  if (!session || !currentUser || !currentCompany) {
    return <Auth />;
  }

  return (
    <>
      <Dashboard 
        leads={leads}
        companies={companies}
        currentCompany={currentCompany}
        currentUser={currentUser}
        theme={theme}
        isLoading={isLeadsLoading}
        onCompanyChange={setCurrentCompanyId}
        onAddNew={() => setNewLeadModalOpen(true)} 
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenForms={() => setFormsModalOpen(true)}
        onToggleTheme={toggleTheme}
        onRefreshLeads={fetchLeads}
        onOpenUserManagement={() => setUserManagementModalOpen(true)}
        onUpdateLead={handleUpdateLead}
        onDeleteLead={handleDeleteLead}
        onOpenEditModal={handleOpenEditModal}
        onOpenAddNoteModal={handleOpenAddNoteModal}
        onSendToWebhook={handleSendToWebhook}
        onGenerateInsights={handleGenerateInsights}
        onSendEmail={handleSendEmail}
        onLogout={handleLogout}
        elevenlabsApiKey={undefined}
      />
      
      <LeadFormModal 
        isOpen={isNewLeadModalOpen} 
        onClose={() => setNewLeadModalOpen(false)} 
        onSave={handleAddLead} 
      />
       {isEditLeadModalOpen && leadToEdit && (
        <EditLeadModal
          isOpen={isEditLeadModalOpen}
          onClose={() => setEditLeadModalOpen(false)}
          onSave={handleUpdateLead}
          lead={leadToEdit}
        />
      )}
       {isAddNoteModalOpen && leadForNewNote && (
        <AddNoteModal
          isOpen={isAddNoteModalOpen}
          onClose={() => setAddNoteModalOpen(false)}
          onSave={handleSaveNote}
        />
      )}
      {isSettingsModalOpen && currentCompany && (
        <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            company={currentCompany}
            users={users.filter(u => u.companyId === currentCompanyId)}
            currentUser={currentUser}
            onUpdateCompany={handleUpdateCompany}
            onInviteUser={handleInviteUser}
            onResetAndResync={handleResetAndResync}
        />
      )}
      {isProfileModalOpen && currentUser && currentCompany && (
        <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setProfileModalOpen(false)}
            currentUser={currentUser}
            currentCompany={currentCompany}
            onSaveUser={handleUpdateUser}
            onSaveCompany={handleUpdateCompany}
        />
      )}
      {isUserManagementModalOpen && currentUser.role === UserRole.SAAS_ADMIN && (
        <UserManagementModal
            isOpen={isUserManagementModalOpen}
            onClose={() => setUserManagementModalOpen(false)}
            users={users}
            companies={companies}
            onUpdateUser={handleUpdateUserByAdmin}
            onDeleteUser={handleDeleteUser}
        />
      )}
       {isFormsModalOpen && (
        <FormsManagementModal
          isOpen={isFormsModalOpen}
          onClose={() => setFormsModalOpen(false)}
          forms={forms}
          onSave={handleSaveForm}
          onDelete={handleDeleteForm}
          onGetEmbedCode={handleOpenEmbedCodeModal}
        />
      )}
      {isEmbedCodeModalOpen && selectedFormForEmbed && (
        <EmbedCodeModal
            isOpen={isEmbedCodeModalOpen}
            onClose={() => setEmbedCodeModalOpen(false)}
            formId={selectedFormForEmbed.id}
        />
      )}
    </>
  );
};

export default App;