import { useState, useEffect } from 'react';
import { Calendar, List, ChevronLeft, ChevronRight, Trash2, Clock, X, Link as LinkIcon, Plus, Users, Video, History, Search, Filter, FileText, Upload, Download, ExternalLink, IndianRupee, Phone, Pencil, Bell, MapPin, StickyNote, Sparkles } from 'lucide-react';
import { supabase } from './lib/supabase';
import { AuthUser } from './lib/auth';
import { UserMenu } from './components/AuthenticatedApp';
import { UserManagement } from './components/UserManagement';
import { ChangePassword } from './components/ChangePassword';
import { GoogleOAuth } from './components/GoogleOAuth';

interface Event {
  id: string;
  title: string;
  clientName: string;
  date: Date;
  time: string;
  location: string;
  agenda?: string;
  meetingLink?: string;
  isOnline: boolean;
  color: string;
  momFiles?: { name: string; path: string; size: number; uploadedAt?: string }[];
  attachments?: { name: string; path: string; size: number; uploadedAt?: string }[];
  alert_type?: string;
  reminder_minutes?: number;
  historyId?: string;
  created_by_name?: string;
  created_by_id?: string;
}

interface Payment {
  id: string;
  client_name: string;
  amount: number;
  amounts?: number[];
  due_dates: string[];
  frequency: string;
  payment_method: string;
  payment_status: { [key: string]: string };
  created_at: string;
  comments?: string;
  created_by_name?: string;
  created_by_id?: string;
}

interface Client {
  id: string;
  name: string;
  type: 'mutual_funds' | 'holistic';
  created_at: string;
}

interface ClientNote {
  id: string;
  client_id: string;
  note_content: string;
  created_at: string;
}

interface AppProps {
  user: AuthUser;
  onShowUserManagement: () => void;
  onCloseUserManagement: () => void;
  showUserManagement: boolean;
  onShowActivityLog: () => void;
  onShowChangePassword: () => void;
  showChangePassword: boolean;
  onCloseChangePassword: () => void;
  onShowGoogleOAuth: () => void;
  showGoogleOAuth: boolean;
  onCloseGoogleOAuth: () => void;
  onSignOut: () => void;
}

function App({ user, onShowUserManagement, onCloseUserManagement, showUserManagement, onShowActivityLog, onShowChangePassword, showChangePassword, onCloseChangePassword, onShowGoogleOAuth, showGoogleOAuth, onCloseGoogleOAuth, onSignOut }: AppProps) {
  // Role-based permissions
  const canEdit = user.role === 'manager' || user.role === 'associate-editor';
  const canDelete = user.role === 'manager';
  const isViewer = user.role === 'associate-viewer';

  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'history' | 'payments' | 'clients'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [meetingType, setMeetingType] = useState<'online' | 'facetoface' | 'on_call'>('online');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [eventToReschedule, setEventToReschedule] = useState<Event | null>(null);
  const [rescheduleMeetingType, setRescheduleMeetingType] = useState<'online' | 'facetoface' | 'on_call'>('online');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [momFiles, setMomFiles] = useState<File[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [historyEvents, setHistoryEvents] = useState<Event[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [dueDates, setDueDates] = useState<string[]>(['']);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [paymentFrequencyFilter, setPaymentFrequencyFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientPastMeetings, setClientPastMeetings] = useState<Event[]>([]);
  const [clientFutureMeetings, setClientFutureMeetings] = useState<Event[]>([]);
  const [clientPayments, setClientPayments] = useState<Payment[]>([]);
  const [clientMeetingsLoading, setClientMeetingsLoading] = useState(false);
  const [scheduledReminders, setScheduledReminders] = useState<Set<string>>(new Set());
  const [paymentFrequency, setPaymentFrequency] = useState('one-time');
  const [paymentAmounts, setPaymentAmounts] = useState<string[]>(['']);
  const [showReminderTime, setShowReminderTime] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState('30');
  const [activeReminder, setActiveReminder] = useState<Event | null>(null);
  const [generatingMeetLink, setGeneratingMeetLink] = useState(false);
  const [showOAuthForMeetLink, setShowOAuthForMeetLink] = useState(false);
  const [pendingMeetLinkGeneration, setPendingMeetLinkGeneration] = useState(false);
  const [showReminderAlert, setShowReminderAlert] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  

  useEffect(() => {
    loadEvents(true);
    loadPayments();
    loadClients();
    requestNotificationPermission();

    // Check for past events every 5 minutes
    const interval = setInterval(() => {
      movePastEventsToHistory().then(() => loadEvents(false));
    }, 5 * 60 * 1000);

    // Check for reminders every minute
    const reminderInterval = setInterval(() => {
      checkAndScheduleReminders();
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
      clearInterval(reminderInterval);
    };
  }, []);

  useEffect(() => {
    if (viewMode === 'history') {
      loadHistory();
    } else if (viewMode === 'payments') {
      loadPayments();
    } else if (viewMode === 'clients') {
      loadClients();
    }
  }, [viewMode]);

  useEffect(() => {
    checkAndScheduleReminders();
  }, [events]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get('oauth_success');
    const oauthError = params.get('oauth_error');

    if (pendingMeetLinkGeneration) {
      if (oauthSuccess === 'true') {
        window.history.replaceState({}, '', window.location.pathname);
        setShowOAuthForMeetLink(false);

        setTimeout(() => {
          generateMeetingLink();
        }, 1000);
      } else if (oauthError) {
        window.history.replaceState({}, '', window.location.pathname);
        setShowOAuthForMeetLink(false);
        setPendingMeetLinkGeneration(false);

        const details = params.get('details');
        let errorMessage = `Failed to connect Google account: ${oauthError}`;

        if (oauthError === 'token_exchange_failed') {
          errorMessage = 'Failed to exchange authorization code with Google.\n\n';
          errorMessage += 'This usually means:\n';
          errorMessage += '1. The Google Client Secret is not configured in Supabase\n';
          errorMessage += '2. The authorization code has expired (try again)\n';
          errorMessage += '3. The Client ID/Secret don\'t match\n\n';
          errorMessage += 'Please check the Supabase project settings and ensure the Google OAuth credentials are properly configured.';

          if (details) {
            errorMessage += '\n\nDetails: ' + decodeURIComponent(details);
          }
        }

        alert(errorMessage);
      }
    }
  }, [pendingMeetLinkGeneration]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      } else {
        console.log('Notification permission already:', Notification.permission);
      }
    } else {
      console.log('Notifications not supported in this browser');
    }
  };

  const playAlarmSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    setTimeout(() => {
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();

      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);

      oscillator2.frequency.value = 1000;
      oscillator2.type = 'sine';

      gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator2.start(audioContext.currentTime);
      oscillator2.stop(audioContext.currentTime + 0.5);
    }, 600);
  };

  const checkAndScheduleReminders = () => {
    console.log('Checking reminders. Notification permission:', Notification?.permission);
    console.log('Events with remind alert:', events.filter(e => e.alert_type === 'remind'));

    const now = new Date();

    events.forEach((event) => {
      if (event.alert_type === 'remind') {
        const eventDateTime = new Date(event.date);
        const [hours, minutes] = event.time.split(':');
        eventDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const reminderMinutesValue = event.reminder_minutes || 30;
        const reminderTime = new Date(eventDateTime.getTime() - reminderMinutesValue * 60 * 1000);
        const timeDiff = reminderTime.getTime() - now.getTime();

        const reminderKey = `${event.id}-${reminderTime.getTime()}`;

        console.log(`Event: ${event.title}, Reminder in: ${Math.round(timeDiff / 1000 / 60)} minutes`);

        if (timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000 && !scheduledReminders.has(reminderKey)) {
          console.log(`Scheduling reminder for: ${event.title} in ${Math.round(timeDiff / 1000 / 60)} minutes`);

          setScheduledReminders(prev => new Set(prev).add(reminderKey));

          setTimeout(() => {
            console.log(`Triggering reminder for: ${event.title}`);
            playAlarmSound();

            // Show in-app alarm
            setActiveReminder(event);
            setShowReminderAlert(true);

            // Show browser notification if permission granted
            if ('Notification' in window && Notification.permission === 'granted') {
              const notification = new Notification('Meeting Reminder', {
                body: `Meeting "${event.title}" starts in ${reminderMinutesValue} minutes at ${event.time}`,
                icon: '/icon.png',
                tag: event.id,
                requireInteraction: true,
              });

              notification.onclick = () => {
                window.focus();
                notification.close();
              };
            }

            const repeatSound = setInterval(() => {
              playAlarmSound();
            }, 3000);

            setTimeout(() => {
              clearInterval(repeatSound);
            }, 30000);

            setScheduledReminders(prev => {
              const newSet = new Set(prev);
              newSet.delete(reminderKey);
              return newSet;
            });
          }, timeDiff);
        }
      }
    });
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from('meeting_history')
      .select('*')
      .eq('organisation_id', user.organisationId)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error loading history:', error);
      setHistoryLoading(false);
      return;
    }

    if (data) {
      const loadedHistory: Event[] = data.map((record) => ({
        id: record.original_event_id?.toString() || record.id.toString(),
        historyId: record.id.toString(),
        title: record.name,
        clientName: record.name,
        date: new Date(record.start_date),
        time: record.start_time,
        location: record.location,
        agenda: record.agenda,
        meetingLink: record.meeting_link,
        isOnline: record.is_online,
        color: record.meeting_type === 'online' ? 'bg-slate-600 text-white' : record.meeting_type === 'on_call' ? 'bg-green-600 text-white' : 'bg-amber-200 text-amber-900',
        momFiles: record.mom_files || [],
        attachments: record.attachments || [],
        created_by_name: record.created_by_name,
        created_by_id: record.created_by_id,
      }));
      setHistoryEvents(loadedHistory);
    }
    setHistoryLoading(false);
  };

  const movePastEventsToHistory = async () => {
    const now = new Date();

    // Get all events from Meet Schedule Data
    const { data: allScheduledEvents, error: fetchError } = await supabase
      .from('Meet Schedule Data')
      .select('*')
      .eq('organisation_id', user.organisationId);

    if (fetchError || !allScheduledEvents) {
      console.error('Error fetching events for history check:', fetchError);
      return;
    }

    // Filter past events
    const pastEvents = allScheduledEvents.filter((event) => {
      const eventDateTime = new Date(event.start_date);
      const [hours, minutes] = (event.start_time || '00:00').split(':').map(Number);
      eventDateTime.setHours(hours, minutes, 0, 0);
      return eventDateTime < now;
    });

    if (pastEvents.length === 0) return;

    // Move each past event to history
    for (const event of pastEvents) {
      // Check if already in history
      const { data: existingHistory } = await supabase
        .from('meeting_history')
        .select('id')
        .eq('original_event_id', event.id)
        .maybeSingle();

      if (!existingHistory) {
        // Insert into history
        const { error: insertError } = await supabase
          .from('meeting_history')
          .insert([{
            original_event_id: event.id,
            name: event.name,
            client_name: event.client_name || event.name,
            meeting_type: event.meeting_type,
            is_online: event.is_online,
            start_date: event.start_date,
            start_time: event.start_time,
            location: event.location,
            meeting_link: event.meeting_link,
            participants: event.participants,
            agenda: event.agenda,
            repeat_event: event.repeat_event,
            alert_type: event.alert_type,
            meeting_mode: event.meeting_mode,
            attachments: event.attachments || [],
            organisation_id: user.organisationId,
            created_by_id: event.created_by_id,
            created_by_name: event.created_by_name,
          }]);

        if (insertError) {
          console.error('Error moving event to history:', insertError);
        } else {
          // Delete from Meet Schedule Data
          const { error: deleteError } = await supabase
            .from('Meet Schedule Data')
            .delete()
            .eq('id', event.id);

          if (deleteError) {
            console.error('Error deleting event from schedule:', deleteError);
          }
        }
      }
    }
  };

  const loadEvents = async (checkHistory = false) => {
    setLoading(true);

    // Optionally move past events to history
    if (checkHistory) {
      await movePastEventsToHistory();
    }

    // Then load current events
    const { data, error } = await supabase
      .from('Meet Schedule Data')
      .select('*')
      .eq('organisation_id', user.organisationId)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error loading events:', error);
      setLoading(false);
      return;
    }

    if (data) {
      const loadedEvents: Event[] = data.map((event) => ({
        id: event.id.toString(),
        title: event.name,
        clientName: event.name,
        date: new Date(event.start_date),
        time: event.start_time,
        location: event.location,
        agenda: event.agenda,
        meetingLink: event.meeting_link,
        isOnline: event.is_online,
        color: event.meeting_type === 'online' ? 'bg-slate-600 text-white' : event.meeting_type === 'on_call' ? 'bg-green-600 text-white' : 'bg-amber-200 text-amber-900',
        alert_type: event.alert_type,
        reminder_minutes: event.reminder_minutes,
        attachments: event.attachments || [],
        created_by_name: event.created_by_name,
        created_by_id: event.created_by_id,
      }));
      setEvents(loadedEvents);
    }
    setLoading(false);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  // Filter events: upcoming/today for calendar/list
  const allEvents = events;

  const getEventsForDate = (day: number) => {
    return allEvents.filter((event) => {
      return (
        event.date.getDate() === day &&
        event.date.getMonth() === currentDate.getMonth() &&
        event.date.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const calculateRecurringDates = (payment: Payment, targetMonth: number, targetYear: number): Date[] => {
    const recurringDates: Date[] = [];

    payment.due_dates.forEach((dateStr) => {
      const originalDate = new Date(dateStr);
      const originalDay = originalDate.getDate();
      const originalMonth = originalDate.getMonth();
      const originalYear = originalDate.getFullYear();

      if (payment.frequency === 'one-time') {
        if (originalMonth === targetMonth && originalYear === targetYear) {
          recurringDates.push(new Date(targetYear, targetMonth, originalDay));
        }
      } else if (payment.frequency === 'quarterly') {
        let currentDate = new Date(originalYear, originalMonth, originalDay);
        const targetDate = new Date(targetYear, targetMonth, 1);
        const futureLimit = new Date(targetYear + 10, 11, 31);

        while (currentDate <= futureLimit) {
          if (currentDate.getMonth() === targetMonth && currentDate.getFullYear() === targetYear) {
            recurringDates.push(new Date(currentDate));
            break;
          }
          currentDate.setMonth(currentDate.getMonth() + 3);
        }
      } else if (payment.frequency === 'half-yearly') {
        let currentDate = new Date(originalYear, originalMonth, originalDay);
        const targetDate = new Date(targetYear, targetMonth, 1);
        const futureLimit = new Date(targetYear + 10, 11, 31);

        while (currentDate <= futureLimit) {
          if (currentDate.getMonth() === targetMonth && currentDate.getFullYear() === targetYear) {
            recurringDates.push(new Date(currentDate));
            break;
          }
          currentDate.setMonth(currentDate.getMonth() + 6);
        }
      } else if (payment.frequency === 'annual') {
        if (originalMonth === targetMonth && targetYear >= originalYear) {
          recurringDates.push(new Date(targetYear, targetMonth, originalDay));
        }
      }
    });

    return recurringDates;
  };

  const getPaymentsForDate = (day: number) => {
    return payments.filter((payment) => {
      const recurringDates = calculateRecurringDates(payment, currentDate.getMonth(), currentDate.getFullYear());
      return recurringDates.some((date) => date.getDate() === day);
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const renderCalendarView = () => {
    const days = [];
    const totalCells = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - startingDayOfWeek + 1;
      const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
      const events = isCurrentMonth ? getEventsForDate(dayNumber) : [];
      const paymentsForDay = isCurrentMonth ? getPaymentsForDate(dayNumber) : [];

      days.push(
        <div
          key={i}
          className={`min-h-24 border border-gray-200 p-2 ${
            isCurrentMonth ? 'bg-white' : 'bg-gray-50'
          }`}
        >
          {isCurrentMonth && (
            <>
              <div className="text-sm font-medium text-gray-700 mb-1">
                {dayNumber}
              </div>
              <div className="space-y-1">
                {events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`text-xs px-2 py-1 rounded ${event.color} cursor-pointer hover:opacity-80 transition-opacity`}
                  >
                    {event.title}
                  </div>
                ))}
                {paymentsForDay.map((payment) => {
                  const recurringDates = calculateRecurringDates(payment, currentDate.getMonth(), currentDate.getFullYear());
                  const matchingDate = recurringDates.find((date) => date.getDate() === dayNumber);
                  const dateKey = matchingDate ? matchingDate.toISOString().split('T')[0] : '';
                  const status = payment.payment_status[dateKey] || 'unpaid';

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const paymentDate = matchingDate ? new Date(matchingDate) : null;
                  if (paymentDate) paymentDate.setHours(0, 0, 0, 0);
                  const isPaymentDateToday = paymentDate && paymentDate.getTime() === today.getTime();
                  const isPaymentDatePassed = paymentDate && paymentDate.getTime() < today.getTime();

                  if (isPaymentDatePassed) {
                    return null;
                  }

                  return (
                    <div
                      key={`${payment.id}-${dateKey}`}
                      className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                        status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                      title={`Payment: ${payment.client_name} - ₹${payment.amount} (${status})`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>₹{payment.amount} - {payment.client_name}</span>
                        {isPaymentDateToday && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePaymentStatus(payment, dateKey);
                            }}
                            disabled={status === 'paid'}
                            className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              status === 'paid'
                                ? 'bg-green-600 text-white cursor-not-allowed opacity-90'
                                : 'bg-orange-500 text-white hover:bg-orange-600 cursor-pointer'
                            }`}
                            title={status === 'paid' ? 'Payment already marked as paid' : 'Mark as paid'}
                          >
                            {status === 'paid' ? 'Paid' : 'Unpaid'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-gray-600 py-3 border-r border-gray-200 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">{days}</div>
      </div>
    );
  };

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase
      .from('Meet Schedule Data')
      .delete()
      .eq('id', parseInt(eventId));

    if (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
      return;
    }

    await loadEvents(false);
  };

  const handleRescheduleEvent = (event: Event) => {
    setEventToReschedule(event);
    setRescheduleMeetingType(event.isOnline ? 'online' : 'facetoface');
    setShowRescheduleModal(true);
  };

  const handleUpdateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!eventToReschedule) return;

    const formData = new FormData(e.currentTarget);

    const startDate = formData.get('startDate') as string;
    const startTime = formData.get('startTime') as string;
    const alertType = formData.get('alertType') as string;
    const repeatEvent = formData.get('repeatEvent') === 'on';
    const clientName = formData.get('name') as string;

    const supabaseData = {
      name: clientName,
      client_name: clientName,
      meeting_type: rescheduleMeetingType,
      is_online: rescheduleMeetingType === 'online',
      start_date: startDate,
      start_time: startTime,
      location: rescheduleMeetingType === 'online'
        ? 'Online'
        : (formData.get('location') as string),
      agenda: formData.get('agenda') as string,
      meeting_link: rescheduleMeetingType === 'online'
        ? (formData.get('meetingLink') as string)
        : null,
      repeat_event: repeatEvent,
      alert_type: alertType || 'none',
      reminder_minutes: alertType === 'remind' ? parseInt(reminderMinutes) : 30,
      meeting_mode: 'audio',
    };

    const { error } = await supabase
      .from('Meet Schedule Data')
      .update(supabaseData)
      .eq('id', parseInt(eventToReschedule.id));

    if (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event. Please try again.');
      return;
    }

    await loadEvents(false);
    setShowRescheduleModal(false);
    setEventToReschedule(null);
    setRescheduleMeetingType('online');
    setShowReminderTime(false);
    setReminderMinutes('30');
  };

  const renderListView = () => {
    const eventsInCurrentMonth = allEvents.filter((event) => {
      return (
        event.date.getMonth() === currentDate.getMonth() &&
        event.date.getFullYear() === currentDate.getFullYear()
      );
    });

    const sortedEvents = [...eventsInCurrentMonth].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    return (
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        {sortedEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No events
          </div>
        ) : (
          sortedEvents.map((event) => (
            <div
              key={event.id}
              className="p-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between gap-6">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    {event.clientName}
                  </h3>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-500 min-w-[60px]">Date:</span>
                      <span className="text-xs text-gray-700">
                        {event.date.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-500 min-w-[60px]">Time:</span>
                      <span className="text-xs text-gray-700">{event.time}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-500 min-w-[60px]">Location:</span>
                      <span className="text-xs text-gray-700">{event.location}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-500 min-w-[60px]">Created by:</span>
                      <span className="text-xs text-gray-700">{event.created_by_name || 'Not tracked'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button
                      onClick={() => handleRescheduleEvent(event)}
                      className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      aria-label="Reschedule event"
                      title="Reschedule"
                    >
                      <Clock className="w-5 h-5" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Delete event"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const generateMeetingLink = async () => {
    console.log('=== Generate Meeting Link Debug ===');
    console.log('User object:', user);
    console.log('Organisation ID:', user.organisationId);

    setGeneratingMeetLink(true);

    try {
      const meetingLinkInput = document.querySelector('input[name="meetingLink"]') as HTMLInputElement;
      const meetingNameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
      const startDateInput = document.querySelector('input[name="startDate"]') as HTMLInputElement;
      const startTimeInput = document.querySelector('input[name="startTime"]') as HTMLInputElement;

      const title = meetingNameInput?.value || 'Meeting';
      let startDateTime = '';

      if (startDateInput?.value && startTimeInput?.value) {
        startDateTime = new Date(`${startDateInput.value}T${startTimeInput.value}`).toISOString();
      }

      const requestBody = {
        organisation_id: user.organisationId,
        title,
        start_time: startDateTime || undefined,
      };

      console.log('Request body:', requestBody);
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-meet-link`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        if (data.needsAuth) {
          console.log('Google account not connected, showing OAuth modal');
          setPendingMeetLinkGeneration(true);
          setShowOAuthForMeetLink(true);
        } else {
          console.error('Edge function error:', data);
          throw new Error(data.error || 'Failed to generate meeting link');
        }
      } else {
        console.log('Meet link generated successfully:', data.meetLink);
        if (meetingLinkInput) {
          meetingLinkInput.value = data.meetLink;
        }

        if (pendingMeetLinkGeneration) {
          alert('Google Meet link generated successfully!');
        }
      }
    } catch (error) {
      console.error('Error generating meeting link:', error);
      if (!pendingMeetLinkGeneration) {
        alert('Failed to generate meeting link. Please try again or enter one manually.');
      }
    } finally {
      setGeneratingMeetLink(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const startDate = formData.get('startDate') as string;
    const startTime = formData.get('startTime') as string;
    const alertType = formData.get('alertType') as string;
    const repeatEvent = formData.get('repeatEvent') === 'on';

    const clientName = formData.get('name') as string;

    const supabaseData = {
      name: clientName,
      client_name: clientName,
      meeting_type: meetingType,
      is_online: meetingType === 'online' || meetingType === 'on_call',
      start_date: startDate,
      start_time: startTime,
      location: meetingType === 'online'
        ? 'Online'
        : meetingType === 'on_call'
        ? 'On Call'
        : (formData.get('location') as string),
      agenda: formData.get('agenda') as string,
      meeting_link: meetingType === 'online'
        ? (formData.get('meetingLink') as string)
        : null,
      repeat_event: repeatEvent,
      alert_type: alertType || 'none',
      reminder_minutes: alertType === 'remind' ? parseInt(reminderMinutes) : 30,
      meeting_mode: 'audio',
      organisation_id: user.organisationId,
      created_by_id: user.id,
      created_by_name: user.fullName,
    };

    const { data, error } = await supabase
      .from('Meet Schedule Data')
      .insert([supabaseData])
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event. Please try again.');
      return;
    }

    if (data) {
      // Upload attachments if any
      if (attachmentFiles.length > 0) {
        const uploadedAttachments = [];

        for (const file of attachmentFiles) {
          const fileExt = file.name.split('.').pop();
          const randomString = Math.random().toString(36).substring(2, 15);
          const fileName = `${user.organisationId}/${data.id}_${Date.now()}_${randomString}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('meeting-attachments')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Error uploading attachment:', uploadError);
            alert(`Failed to upload ${file.name}. Please try again.`);
            continue;
          }

          uploadedAttachments.push({
            name: file.name,
            path: fileName,
            size: file.size,
            uploadedAt: new Date().toISOString()
          });
        }

        // Update the event with attachment metadata
        if (uploadedAttachments.length > 0) {
          const { error: updateError } = await supabase
            .from('Meet Schedule Data')
            .update({ attachments: uploadedAttachments })
            .eq('id', data.id);

          if (updateError) {
            console.error('Error updating event with attachments:', updateError);
          }
        }
      }

      await loadEvents(false);
    }

    setShowAddEventModal(false);
    setMeetingType('online');
    setShowReminderTime(false);
    setReminderMinutes('30');
    setAttachmentFiles([]);
  };

  const loadPayments = async () => {
    setPaymentsLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('organisation_id', user.organisationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading payments:', error);
      setPaymentsLoading(false);
      return;
    }

    setPayments(data || []);
    setPaymentsLoading(false);
  };

  const loadClients = async () => {
    setClientsLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organisation_id', user.organisationId)
      .order('created_at', { ascending: false});

    if (error) {
      console.error('Error loading clients:', error);
      setClientsLoading(false);
      return;
    }

    setClients(data || []);
    setClientsLoading(false);
  };

  const loadClientNotes = async (clientId: string) => {
    setNotesLoading(true);
    const { data, error } = await supabase
      .from('client_notes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading client notes:', error);
      setNotesLoading(false);
      return;
    }

    setClientNotes(data || []);
    setNotesLoading(false);
  };

  const handleAddNote = async () => {
    if (!selectedClient || !newNoteContent.trim()) {
      alert('Please enter a note.');
      return;
    }

    const { error } = await supabase
      .from('client_notes')
      .insert({
        client_id: selectedClient.id,
        note_content: newNoteContent.trim(),
        organisation_id: user.organisationId
      });

    if (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note. Please try again.');
      return;
    }

    setNewNoteContent('');
    await loadClientNotes(selectedClient.id);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    const { error } = await supabase
      .from('client_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
      return;
    }

    if (selectedClient) {
      await loadClientNotes(selectedClient.id);
    }
  };

  const handleAddPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const clientName = (form.elements.namedItem('clientName') as HTMLInputElement).value;
    const frequency = (form.elements.namedItem('frequency') as HTMLSelectElement).value;
    const paymentMethod = (form.elements.namedItem('paymentMethod') as HTMLSelectElement).value;

    const validDueDates = dueDates.filter(date => date !== '');

    if (validDueDates.length === 0) {
      alert('Please add at least one due date.');
      return;
    }

    let amountsArray: number[];
    let singleAmount: number;

    if (frequency === 'quarterly' || frequency === 'half-yearly') {
      const validAmounts = paymentAmounts.filter(amt => amt !== '').map(amt => parseFloat(amt));
      if (validAmounts.length !== validDueDates.length) {
        alert('Please enter an amount for each due date.');
        return;
      }
      amountsArray = validAmounts;
      singleAmount = validAmounts[0];
    } else {
      const amountInput = form.elements.namedItem('amount') as HTMLInputElement;
      singleAmount = parseFloat(amountInput.value);
      amountsArray = [singleAmount];
    }

    const { error } = await supabase
      .from('payments')
      .insert({
        client_name: clientName,
        amount: singleAmount,
        amounts: amountsArray,
        due_dates: validDueDates,
        frequency: frequency,
        payment_method: paymentMethod,
        organisation_id: user.organisationId,
        created_by_id: user.id,
        created_by_name: user.fullName,
      });

    if (error) {
      console.error('Error adding payment:', error);
      alert('Failed to add payment. Please try again.');
      return;
    }

    await loadPayments();
    setShowPaymentModal(false);
    setDueDates(['']);
    setPaymentAmounts(['']);
    setPaymentFrequency('one-time');
    form.reset();
  };

  const renderPaymentModal = () => {
    if (!showPaymentModal) return null;

    const addDueDateField = () => {
      setDueDates([...dueDates, '']);
      if (paymentFrequency === 'quarterly' || paymentFrequency === 'half-yearly') {
        setPaymentAmounts([...paymentAmounts, '']);
      }
    };

    const removeDueDateField = (index: number) => {
      if (dueDates.length > 1) {
        setDueDates(dueDates.filter((_, i) => i !== index));
        if (paymentFrequency === 'quarterly' || paymentFrequency === 'half-yearly') {
          setPaymentAmounts(paymentAmounts.filter((_, i) => i !== index));
        }
      }
    };

    const updateDueDate = (index: number, value: string) => {
      const newDueDates = [...dueDates];
      newDueDates[index] = value;
      setDueDates(newDueDates);
    };

    const updatePaymentAmount = (index: number, value: string) => {
      const newAmounts = [...paymentAmounts];
      newAmounts[index] = value;
      setPaymentAmounts(newAmounts);
    };

    const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newFrequency = e.target.value;
      setPaymentFrequency(newFrequency);

      if (newFrequency === 'quarterly') {
        const count = 4;
        setDueDates(Array(count).fill(''));
        setPaymentAmounts(Array(count).fill(''));
      } else if (newFrequency === 'half-yearly') {
        const count = 2;
        setDueDates(Array(count).fill(''));
        setPaymentAmounts(Array(count).fill(''));
      } else {
        setDueDates(['']);
        setPaymentAmounts(['']);
      }
    };

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Schedule Payment</h2>
            <button
              onClick={() => {
                setShowPaymentModal(false);
                setDueDates(['']);
                setPaymentAmounts(['']);
                setPaymentFrequency('one-time');
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAddPayment} className="px-6 py-6 space-y-5">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
                Client's Name
              </label>
              <input
                type="text"
                id="clientName"
                list="clientsListPayment"
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Select or enter client name"
              />
              <datalist id="clientsListPayment">
                {clients.map((client) => (
                  <option key={client.id} value={client.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
                Frequency
              </label>
              <select
                id="frequency"
                value={paymentFrequency}
                onChange={handleFrequencyChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="one-time">One-time</option>
                <option value="quarterly">Quarterly</option>
                <option value="half-yearly">Half Yearly</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            {(paymentFrequency === 'one-time' || paymentFrequency === 'annual') && (
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (INR)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="amount"
                    required
                    step="0.01"
                    min="0"
                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {(paymentFrequency === 'quarterly' || paymentFrequency === 'half-yearly')
                  ? 'Due Dates & Amounts'
                  : 'Due Dates'}
              </label>
              <div className="space-y-2">
                {dueDates.map((date, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {(paymentFrequency === 'quarterly' || paymentFrequency === 'half-yearly') && (
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <IndianRupee className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          value={paymentAmounts[index] || ''}
                          onChange={(e) => updatePaymentAmount(index, e.target.value)}
                          required
                          step="0.01"
                          min="0"
                          placeholder="Amount"
                          className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    )}
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => updateDueDate(index, e.target.value)}
                      required
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    {dueDates.length > 1 && (paymentFrequency !== 'quarterly' && paymentFrequency !== 'half-yearly') && (
                      <button
                        type="button"
                        onClick={() => removeDueDateField(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Remove due date"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {(paymentFrequency !== 'quarterly' && paymentFrequency !== 'half-yearly') && (
                  <button
                    type="button"
                    onClick={addDueDateField}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Another Due Date
                  </button>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
                Paid Via
              </label>
              <select
                id="paymentMethod"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  setDueDates(['']);
                  setPaymentAmounts(['']);
                  setPaymentFrequency('one-time');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Schedule Payment
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const handleUpdatePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!editingPayment) return;

    const form = e.currentTarget;
    const clientName = (form.elements.namedItem('clientName') as HTMLInputElement).value;
    const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
    const frequency = (form.elements.namedItem('frequency') as HTMLSelectElement).value;
    const paymentMethod = (form.elements.namedItem('paymentMethod') as HTMLSelectElement).value;
    const comments = (form.elements.namedItem('comments') as HTMLTextAreaElement).value;

    const validDueDates = dueDates.filter(date => date !== '');

    if (validDueDates.length === 0) {
      alert('Please add at least one due date.');
      return;
    }

    const { error } = await supabase
      .from('payments')
      .update({
        client_name: clientName,
        amount: amount,
        due_dates: validDueDates,
        frequency: frequency,
        payment_method: paymentMethod,
        comments: comments,
      })
      .eq('id', editingPayment.id);

    if (error) {
      console.error('Error updating payment:', error);
      alert('Failed to update payment. Please try again.');
      return;
    }

    await loadPayments();
    setShowEditPaymentModal(false);
    setEditingPayment(null);
    setDueDates(['']);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client. Please try again.');
      return;
    }

    await loadClients();
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) {
      return;
    }

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (error) {
      console.error('Error deleting payment:', error);
      alert('Failed to delete payment. Please try again.');
      return;
    }

    await loadPayments();
  };

  const handleTogglePaymentStatus = async (payment: Payment, dueDate: string) => {
    const currentStatus = payment.payment_status[dueDate] || 'unpaid';

    // Prevent changing from paid back to unpaid
    if (currentStatus === 'paid') {
      return;
    }

    const updatedPaymentStatus = {
      ...payment.payment_status,
      [dueDate]: 'paid',
    };

    const { error } = await supabase
      .from('payments')
      .update({
        payment_status: updatedPaymentStatus,
      })
      .eq('id', payment.id);

    if (error) {
      console.error('Error updating payment status:', error);
      alert('Failed to update payment status. Please try again.');
      return;
    }

    await loadPayments();
  };

  const renderEditPaymentModal = () => {
    if (!showEditPaymentModal || !editingPayment) return null;

    const addDueDateField = () => {
      setDueDates([...dueDates, '']);
    };

    const removeDueDateField = (index: number) => {
      if (dueDates.length > 1) {
        setDueDates(dueDates.filter((_, i) => i !== index));
      }
    };

    const updateDueDate = (index: number, value: string) => {
      const newDueDates = [...dueDates];
      newDueDates[index] = value;
      setDueDates(newDueDates);
    };

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Modify Payment</h2>
            <button
              onClick={() => {
                setShowEditPaymentModal(false);
                setEditingPayment(null);
                setDueDates(['']);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleUpdatePayment} className="px-6 py-6 space-y-5">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
                Client's Name
              </label>
              <input
                type="text"
                id="clientName"
                list="clientsListPaymentEdit"
                defaultValue={editingPayment.client_name}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Select or enter client name"
              />
              <datalist id="clientsListPaymentEdit">
                {clients.map((client) => (
                  <option key={client.id} value={client.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (INR)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="number"
                  id="amount"
                  defaultValue={editingPayment.amount}
                  required
                  step="0.01"
                  min="0"
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
                Frequency
              </label>
              <select
                id="frequency"
                defaultValue={editingPayment.frequency}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="one-time">One-time</option>
                <option value="quarterly">Quarterly</option>
                <option value="half-yearly">Half Yearly</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Dates
              </label>
              <div className="space-y-2">
                {dueDates.map((date, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => updateDueDate(index, e.target.value)}
                      required
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    {dueDates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDueDateField(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Remove due date"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDueDateField}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Due Date
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
                Paid Via
              </label>
              <select
                id="paymentMethod"
                defaultValue={editingPayment.payment_method}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
              </select>
            </div>

            <div>
              <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
                Comments / Notes
              </label>
              <textarea
                id="comments"
                defaultValue={editingPayment.comments || ''}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                placeholder="Add any notes or comments about this payment..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowEditPaymentModal(false);
                  setEditingPayment(null);
                  setDueDates(['']);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Update Payment
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const handleSaveClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const clientName = (form.elements.namedItem('clientName') as HTMLInputElement).value;
    const clientType = (form.elements.namedItem('clientType') as HTMLSelectElement).value as 'mutual_funds' | 'holistic';

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([
          {
            name: clientName,
            type: clientType,
            organisation_id: user.organisationId
          }
        ])
        .select();

      if (error) throw error;

      if (data) {
        setClients([...clients, data[0]]);
      }

      setShowClientModal(false);
      form.reset();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Failed to save client. Please try again.');
    }
  };

  const renderClientModal = () => {
    if (!showClientModal) return null;

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Add New Client</h3>
            <button
              onClick={() => setShowClientModal(false)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveClient} className="px-6 py-6 space-y-5">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
                Client Name
              </label>
              <input
                type="text"
                id="clientName"
                name="clientName"
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Enter client name"
              />
            </div>

            <div>
              <label htmlFor="clientType" className="block text-sm font-medium text-gray-700 mb-2">
                Client Type
              </label>
              <select
                id="clientType"
                name="clientType"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="mutual_funds">Mutual Funds</option>
                <option value="holistic">Holistic</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowClientModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
              >
                Save Client
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };


  const renderAddEventModal = () => {
    if (!showAddEventModal) return null;

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Add Meeting</h2>
            <button
              onClick={() => {
                setShowAddEventModal(false);
                setMeetingType('online');
                setShowReminderTime(false);
                setReminderMinutes('30');
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAddEvent} className="px-6 py-6 space-y-5">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMeetingType('facetoface')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-lg transition-colors ${
                  meetingType === 'facetoface'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4" />
                In Person
              </button>
              <button
                type="button"
                onClick={() => setMeetingType('online')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-lg transition-colors ${
                  meetingType === 'online'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Video className="w-4 h-4" />
                Online
              </button>
              <button
                type="button"
                onClick={() => setMeetingType('on_call')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-lg transition-colors ${
                  meetingType === 'on_call'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Phone className="w-4 h-4" />
                On Call
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center -mt-2">
              {meetingType === 'online'
                ? 'Real-time interaction between remotely located users.'
                : meetingType === 'on_call'
                ? 'Voice communication via phone call.'
                : 'All users will be physically present in the exact location.'}
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                list="clientsList"
                required
                placeholder="Select or enter client name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <datalist id="clientsList">
                {clients.map((client) => (
                  <option key={client.id} value={client.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date & Time <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  name="startDate"
                  required
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="time"
                  name="startTime"
                  required
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="repeatEvent" name="repeatEvent" className="rounded" />
                <label htmlFor="repeatEvent" className="text-xs text-gray-600">
                  Repeat event
                </label>
              </div>
            </div>

            {meetingType === 'online' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meet Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      name="meetingLink"
                      placeholder="Conference room 10"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={generateMeetingLink}
                      disabled={generatingMeetLink}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Generate meeting link"
                    >
                      <Sparkles className={`w-4 h-4 ${generatingMeetLink ? 'animate-spin' : ''}`} />
                      {generatingMeetLink ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meet conducted by
                  </label>
                  <input
                    type="email"
                    placeholder="scott.fisher@zylker.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mail Client
                  </label>
                  <input
                    type="email"
                    placeholder="scott.fisher@zylker.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="alertType"
                        value="none"
                        defaultChecked
                        onChange={() => setShowReminderTime(false)}
                      />
                      <span className="text-sm text-gray-700">None</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="alertType"
                        value="remind"
                        onChange={() => setShowReminderTime(true)}
                      />
                      <span className="text-sm text-gray-700">Remind me</span>
                    </label>
                  </div>
                  {showReminderTime && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Remind me before
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          value={reminderMinutes}
                          onChange={(e) => setReminderMinutes(e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-600">minutes before the meeting</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Default is 30 minutes. You can set from 1 to 1440 minutes (24 hours).</p>
                    </div>
                  )}
                </div>
              </>
            ) : meetingType === 'on_call' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meet conducted by
                  </label>
                  <input
                    type="email"
                    placeholder="scott.fisher@zylker.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mail Client
                  </label>
                  <input
                    type="email"
                    placeholder="scott.fisher@zylker.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="alertType"
                        value="none"
                        defaultChecked
                        onChange={() => setShowReminderTime(false)}
                      />
                      <span className="text-sm text-gray-700">None</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="alertType"
                        value="remind"
                        onChange={() => setShowReminderTime(true)}
                      />
                      <span className="text-sm text-gray-700">Remind me</span>
                    </label>
                  </div>
                  {showReminderTime && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Remind me before
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          value={reminderMinutes}
                          onChange={(e) => setReminderMinutes(e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-600">minutes before the meeting</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Default is 30 minutes. You can set from 1 to 1440 minutes (24 hours).</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    placeholder="Conference room 10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meet conducted by
                  </label>
                  <input
                    type="email"
                    placeholder="scott.fisher@zylker.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mail Client
                  </label>
                  <input
                    type="email"
                    placeholder="scott.fisher@zylker.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="alertType"
                        value="none"
                        defaultChecked
                        onChange={() => setShowReminderTime(false)}
                      />
                      <span className="text-sm text-gray-700">None</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="alertType"
                        value="remind"
                        onChange={() => setShowReminderTime(true)}
                      />
                      <span className="text-sm text-gray-700">Remind me</span>
                    </label>
                  </div>
                  {showReminderTime && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Remind me before
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          value={reminderMinutes}
                          onChange={(e) => setReminderMinutes(e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-600">minutes before the meeting</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Default is 30 minutes. You can set from 1 to 1440 minutes (24 hours).</p>
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agenda
              </label>
              <textarea
                name="agenda"
                rows={3}
                placeholder="Let's discuss and review the marketing campaign stats."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  id="attachment-upload"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={handleAttachmentChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('attachment-upload')?.click()}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Upload className="w-4 h-4" />
                  + Add Attachment(s)
                </button>
                {attachmentFiles.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-xs text-gray-500">Ready to upload ({attachmentFiles.length} file{attachmentFiles.length > 1 ? 's' : ''})</p>
                    {attachmentFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {getFileTypeIcon(file.name)}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(index)}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white pt-4 flex items-center justify-end gap-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowAddEventModal(false);
                  setMeetingType('online');
                  setAttachmentFiles([]);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Event
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderRescheduleModal = () => {
    if (!showRescheduleModal || !eventToReschedule) return null;

    const formattedDate = eventToReschedule.date.toISOString().split('T')[0];

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Reschedule Event</h2>
            <button
              onClick={() => {
                setShowRescheduleModal(false);
                setEventToReschedule(null);
                setRescheduleMeetingType('online');
                setShowReminderTime(false);
                setReminderMinutes('30');
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleUpdateEvent} className="px-6 py-6 space-y-5">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRescheduleMeetingType('facetoface')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-lg transition-colors ${
                  rescheduleMeetingType === 'facetoface'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4" />
                Face to Face Meeting
              </button>
              <button
                type="button"
                onClick={() => setRescheduleMeetingType('online')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-lg transition-colors ${
                  rescheduleMeetingType === 'online'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Video className="w-4 h-4" />
                Online Meeting
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center -mt-2">
              {rescheduleMeetingType === 'online'
                ? 'Real-time interaction between remotely located users.'
                : 'All users will be physically present in the exact location.'}
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                list="clientsListReschedule"
                required
                defaultValue={eventToReschedule.clientName}
                placeholder="Select or enter client name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <datalist id="clientsListReschedule">
                {clients.map((client) => (
                  <option key={client.id} value={client.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date & Time <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  name="startDate"
                  required
                  defaultValue={formattedDate}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="time"
                  name="startTime"
                  required
                  defaultValue={eventToReschedule.time}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="rescheduleRepeatEvent" name="repeatEvent" className="rounded" />
                <label htmlFor="rescheduleRepeatEvent" className="text-xs text-gray-600">
                  Repeat event
                </label>
              </div>
            </div>

            {rescheduleMeetingType === 'online' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meet Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      name="meetingLink"
                      defaultValue={eventToReschedule.meetingLink || ''}
                      placeholder="Conference room 10"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={generateMeetingLink}
                      disabled={generatingMeetLink}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Generate meeting link"
                    >
                      <Sparkles className={`w-4 h-4 ${generatingMeetLink ? 'animate-spin' : ''}`} />
                      {generatingMeetLink ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meet conducted by
                  </label>
                  <input
                    type="email"
                    placeholder="scott.fisher@zylker.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mail Client
                  </label>
                  <input
                    type="email"
                    placeholder="scott.fisher@zylker.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="alertType"
                        value="none"
                        defaultChecked
                        onChange={() => setShowReminderTime(false)}
                      />
                      <span className="text-sm text-gray-700">None</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="alertType"
                        value="remind"
                        onChange={() => setShowReminderTime(true)}
                      />
                      <span className="text-sm text-gray-700">Remind me</span>
                    </label>
                  </div>
                  {showReminderTime && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Remind me before
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          value={reminderMinutes}
                          onChange={(e) => setReminderMinutes(e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-600">minutes before the meeting</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Default is 30 minutes. You can set from 1 to 1440 minutes (24 hours).</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    defaultValue={!eventToReschedule.isOnline ? eventToReschedule.location : ''}
                    placeholder="Conference room 10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meet conducted by
                  </label>
                  <input
                    type="email"
                    placeholder="scott.fisher@zylker.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="alertType"
                        value="none"
                        defaultChecked
                        onChange={() => setShowReminderTime(false)}
                      />
                      <span className="text-sm text-gray-700">None</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="alertType"
                        value="remind"
                        onChange={() => setShowReminderTime(true)}
                      />
                      <span className="text-sm text-gray-700">Remind me</span>
                    </label>
                  </div>
                  {showReminderTime && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Remind me before
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          value={reminderMinutes}
                          onChange={(e) => setReminderMinutes(e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-600">minutes before the meeting</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Default is 30 minutes. You can set from 1 to 1440 minutes (24 hours).</p>
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agenda
              </label>
              <textarea
                name="agenda"
                rows={3}
                defaultValue={eventToReschedule.agenda || ''}
                placeholder="Let's discuss and review the marketing campaign stats."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments
              </label>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Attachment(s)
              </button>
            </div>

            <div className="sticky bottom-0 bg-white pt-4 flex items-center justify-end gap-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowRescheduleModal(false);
                  setEventToReschedule(null);
                  setRescheduleMeetingType('online');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Update Event
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderHistoryView = () => {
    if (historyLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="text-gray-500">Loading history...</div>
        </div>
      );
    }

    // Apply search and filters
    let pastEvents = [...historyEvents];

    // Apply search filter
    if (historySearchQuery.trim()) {
      const query = historySearchQuery.toLowerCase();
      pastEvents = pastEvents.filter((event) =>
        event.title.toLowerCase().includes(query) ||
        event.clientName.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query) ||
        event.agenda?.toLowerCase().includes(query)
      );
    }

    // Apply dropdown filter
    if (historyFilter !== 'all') {
      const now = new Date();

      if (historyFilter === 'online') {
        pastEvents = pastEvents.filter((event) => event.isOnline);
      } else if (historyFilter === 'facetoface') {
        pastEvents = pastEvents.filter((event) => !event.isOnline);
      } else if (historyFilter === 'thisweek') {
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(now.getDate() - 7);
        pastEvents = pastEvents.filter((event) => event.date >= oneWeekAgo);
      } else if (historyFilter === 'thismonth') {
        pastEvents = pastEvents.filter(
          (event) =>
            event.date.getMonth() === now.getMonth() &&
            event.date.getFullYear() === now.getFullYear()
        );
      } else if (historyFilter === 'lastmonth') {
        const lastMonth = new Date(now);
        lastMonth.setMonth(now.getMonth() - 1);
        pastEvents = pastEvents.filter(
          (event) =>
            event.date.getMonth() === lastMonth.getMonth() &&
            event.date.getFullYear() === lastMonth.getFullYear()
        );
      }
    }

    // Sort by date descending (most recent first)
    pastEvents.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Group events by date
    const groupedEvents: { [key: string]: Event[] } = {};
    pastEvents.forEach((event) => {
      const dateKey = event.date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      if (!groupedEvents[dateKey]) {
        groupedEvents[dateKey] = [];
      }
      groupedEvents[dateKey].push(event);
    });

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Meeting History</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search meetings..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent w-64"
                />
              </div>
              <div className="relative">
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                  className="appearance-none pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white cursor-pointer"
                >
                  <option value="all">All Meetings</option>
                  <option value="online">Online Only</option>
                  <option value="facetoface">Face to Face Only</option>
                  <option value="thisweek">This Week</option>
                  <option value="thismonth">This Month</option>
                  <option value="lastmonth">Last Month</option>
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {pastEvents.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No past meetings found</p>
            </div>
          ) : (
            Object.entries(groupedEvents).map(([dateKey, eventsForDate]) => (
              <div key={dateKey} className="p-6">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-gray-900">{dateKey}</h3>
                  <span className="text-xs text-gray-500">
                    ({eventsForDate.length} meeting{eventsForDate.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <div className="space-y-3">
                  {eventsForDate.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer border border-gray-100"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${event.color}`}
                            >
                              {event.isOnline ? (
                                <Video className="w-3 h-3 mr-1" />
                              ) : (
                                <Users className="w-3 h-3 mr-1" />
                              )}
                              {event.isOnline ? 'Online' : 'Face to Face'}
                            </span>
                            <h4 className="text-base font-semibold text-gray-900">
                              {event.title}
                            </h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              <span>{event.time}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {event.isOnline ? (
                                <>
                                  <LinkIcon className="w-4 h-4" />
                                  <span className="text-blue-600 hover:underline truncate max-w-xs">
                                    {event.meetingLink || 'Online'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Users className="w-4 h-4" />
                                  <span>{event.location}</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <Users className="w-4 h-4" />
                              <span>By: {event.created_by_name || 'Not tracked'}</span>
                            </div>
                          </div>
                          {event.agenda && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-1">
                              {event.agenda}
                            </p>
                          )}

                          {/* Display MOM Files */}
                          {event.momFiles && event.momFiles.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-2 mb-3">
                                <FileText className="w-4 h-4 text-amber-600" />
                                <h5 className="text-xs font-semibold text-gray-700">
                                  Minutes of Meeting ({event.momFiles.length})
                                </h5>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {event.momFiles.map((file, fileIndex) => (
                                  <div
                                    key={fileIndex}
                                    onClick={(e) => e.stopPropagation()}
                                    className="group bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3 hover:border-amber-400 hover:shadow-sm transition-all"
                                  >
                                    <div className="flex items-start gap-2.5 mb-2">
                                      <div className="p-1.5 bg-white rounded-md shadow-sm">
                                        {getFileTypeIcon(file.name)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                          {file.name}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                                          <span>{formatFileSize(file.size)}</span>
                                          {file.uploadedAt && (
                                            <>
                                              <span className="text-gray-300">•</span>
                                              <span className="truncate">{formatUploadDate(file.uploadedAt)}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewMOMFile(file.path, file.name);
                                        }}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-white hover:bg-amber-100 rounded-md transition-colors shadow-sm"
                                        title="Open file"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Open
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadMOMFile(file.path, file.name);
                                        }}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 rounded-md transition-colors shadow-sm"
                                        title="Download file"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        Download
                                      </button>
                                      {canDelete && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteMOMFile(event.id, file.path, file.name, event.historyId);
                                          }}
                                          className="flex items-center justify-center p-1.5 text-red-600 bg-white hover:bg-red-50 rounded-md transition-colors shadow-sm"
                                          title="Delete file"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full whitespace-nowrap">
                            Completed
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {pastEvents.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600 text-center">
              Showing {pastEvents.length} past meeting{pastEvents.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderPaymentsView = () => {
    const groupedPayments: { [key: string]: { payment: Payment; dateKey: string; date: Date }[] } = {};
    const today = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(today.getFullYear() + 1);

    const filteredPayments = payments.filter((payment) => {
      const matchesSearch = payment.client_name.toLowerCase().includes(paymentSearchQuery.toLowerCase());
      const matchesFrequency = paymentFrequencyFilter === 'all' || payment.frequency === paymentFrequencyFilter;
      const matchesMethod = paymentMethodFilter === 'all' || payment.payment_method === paymentMethodFilter;

      let matchesStatus = true;
      if (paymentStatusFilter !== 'all') {
        const hasAnyPaidStatus = Object.values(payment.payment_status || {}).some(status => status === 'paid');
        const hasAnyUnpaidStatus = Object.values(payment.payment_status || {}).length === 0 ||
                                   Object.values(payment.payment_status || {}).some(status => status === 'unpaid');

        if (paymentStatusFilter === 'paid') {
          matchesStatus = hasAnyPaidStatus;
        } else if (paymentStatusFilter === 'unpaid') {
          matchesStatus = hasAnyUnpaidStatus || Object.values(payment.payment_status || {}).length === 0;
        }
      }

      return matchesSearch && matchesFrequency && matchesMethod && matchesStatus;
    });

    filteredPayments.forEach((payment) => {
      const allRecurringDates: Date[] = [];

      if (payment.frequency === 'one-time') {
        payment.due_dates.forEach((dateStr) => {
          allRecurringDates.push(new Date(dateStr));
        });
      } else {
        for (let year = today.getFullYear(); year <= oneYearFromNow.getFullYear(); year++) {
          for (let month = 0; month < 12; month++) {
            const recurringDatesForMonth = calculateRecurringDates(payment, month, year);
            allRecurringDates.push(...recurringDatesForMonth);
          }
        }
      }

      allRecurringDates.forEach((date) => {
        const dateKey = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        const isoDateKey = date.toISOString().split('T')[0];
        if (!groupedPayments[dateKey]) {
          groupedPayments[dateKey] = [];
        }
        groupedPayments[dateKey].push({ payment, dateKey: isoDateKey, date });
      });
    });

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Scheduled Payments</h3>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by client name..."
                value={paymentSearchQuery}
                onChange={(e) => setPaymentSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>

              <select
                value={paymentFrequencyFilter}
                onChange={(e) => setPaymentFrequencyFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="all">All Frequencies</option>
                <option value="one-time">One-time</option>
                <option value="quarterly">Quarterly</option>
                <option value="half-yearly">Half-yearly</option>
                <option value="annual">Annual</option>
              </select>

              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
              </select>

              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>

              {(paymentSearchQuery || paymentFrequencyFilter !== 'all' || paymentMethodFilter !== 'all' || paymentStatusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setPaymentSearchQuery('');
                    setPaymentFrequencyFilter('all');
                    setPaymentMethodFilter('all');
                    setPaymentStatusFilter('all');
                  }}
                  className="px-3 py-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {paymentsLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              <p className="text-gray-500 text-sm mt-3">Loading payments...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center">
              <IndianRupee className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {paymentSearchQuery || paymentFrequencyFilter !== 'all' || paymentMethodFilter !== 'all' || paymentStatusFilter !== 'all'
                  ? 'No payments match your search criteria'
                  : 'No scheduled payments found'}
              </p>
            </div>
          ) : (
            Object.entries(groupedPayments)
              .sort(([, a], [, b]) => a[0].date.getTime() - b[0].date.getTime())
              .map(([displayDateKey, paymentsForDate]) => (
              <div key={displayDateKey} className="p-6">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-gray-900">{displayDateKey}</h3>
                  <span className="text-xs text-gray-500">
                    ({paymentsForDate.length} payment{paymentsForDate.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <div className="space-y-3">
                  {paymentsForDate.map(({ payment, dateKey, date }) => {
                    const status = payment.payment_status[dateKey] || 'unpaid';
                    const todayDate = new Date();
                    todayDate.setHours(0, 0, 0, 0);
                    const paymentDate = new Date(date);
                    paymentDate.setHours(0, 0, 0, 0);
                    const isPaymentDatePassed = paymentDate.getTime() <= todayDate.getTime();

                    const dueDateIndex = payment.due_dates.findIndex(d => d === dateKey);
                    const displayAmount = payment.amounts && payment.amounts.length > dueDateIndex && dueDateIndex >= 0
                      ? payment.amounts[dueDateIndex]
                      : payment.amount;

                    return (
                      <div
                        key={`${payment.id}-${dateKey}`}
                        className="p-4 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-base font-semibold text-gray-900 mb-2">
                              {payment.client_name}
                            </h4>
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1.5">
                                  <IndianRupee className="w-4 h-4" />
                                  <span className="font-medium">₹{displayAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-500">
                                  <Users className="w-4 h-4" />
                                  <span>{payment.created_by_name || 'Not tracked'}</span>
                                </div>
                              </div>
                              {payment.comments && (
                                <div className="text-sm text-gray-600 italic bg-gray-50 px-3 py-2 rounded border-l-2 border-emerald-500">
                                  {payment.comments}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full whitespace-nowrap capitalize">
                              {payment.frequency.replace('-', ' ')}
                            </span>
                            {isPaymentDatePassed && canEdit && (
                              <button
                                onClick={() => handleTogglePaymentStatus(payment, dateKey)}
                                disabled={status === 'paid'}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  status === 'paid'
                                    ? 'bg-green-600 text-white cursor-not-allowed opacity-90'
                                    : 'bg-orange-500 text-white hover:bg-orange-600 cursor-pointer'
                                }`}
                                title={status === 'paid' ? 'Payment already marked as paid' : 'Mark as paid'}
                              >
                                {status === 'paid' ? 'Paid' : 'Unpaid'}
                              </button>
                            )}
                            {isPaymentDatePassed && isViewer && (
                              <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                                status === 'paid'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {status === 'paid' ? 'Paid' : 'Unpaid'}
                              </span>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setEditingPayment(payment);
                                  setDueDates(payment.due_dates);
                                  setShowEditPaymentModal(true);
                                }}
                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                aria-label="Modify payment"
                                title="Modify"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeletePayment(payment.id)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                aria-label="Delete payment"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {filteredPayments.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600 text-center">
              Showing {filteredPayments.length} of {payments.length} scheduled payment{payments.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    );
  };

  const handleClientClick = async (client: Client) => {
    setSelectedClient(client);
    setClientMeetingsLoading(true);

    const { data: pastMeetings, error: pastError } = await supabase
      .from('meeting_history')
      .select('*')
      .ilike('name', `%${client.name}%`)
      .order('start_date', { ascending: false });

    if (pastError) {
      console.error('Error loading past meetings:', pastError);
    }

    const { data: futureMeetings, error: futureError } = await supabase
      .from('Meet Schedule Data')
      .select('*')
      .ilike('name', `%${client.name}%`)
      .order('start_date', { ascending: true });

    if (futureError) {
      console.error('Error loading future meetings:', futureError);
    }

    const { data: clientPaymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .ilike('client_name', `%${client.name}%`)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Error loading payments:', paymentsError);
    }

    const pastEvents: Event[] = (pastMeetings || []).map((record) => ({
      id: record.original_event_id?.toString() || record.id.toString(),
      title: record.name,
      clientName: record.name,
      date: new Date(record.start_date),
      time: record.start_time,
      location: record.location,
      agenda: record.agenda,
      meetingLink: record.meeting_link,
      isOnline: record.is_online,
      color: record.meeting_type === 'online' ? 'bg-slate-600 text-white' : record.meeting_type === 'on_call' ? 'bg-green-600 text-white' : 'bg-amber-200 text-amber-900',
      momFiles: record.mom_files || [],
      attachments: record.attachments || [],
      created_by_name: record.created_by_name,
      created_by_id: record.created_by_id,
    }));

    const futureEvents: Event[] = (futureMeetings || []).map((event) => ({
      id: event.id.toString(),
      title: event.name,
      clientName: event.name,
      date: new Date(event.start_date),
      time: event.start_time,
      location: event.location,
      agenda: event.agenda,
      meetingLink: event.meeting_link,
      isOnline: event.is_online,
      color: event.meeting_type === 'online' ? 'bg-slate-600 text-white' : event.meeting_type === 'on_call' ? 'bg-green-600 text-white' : 'bg-amber-200 text-amber-900',
      attachments: event.attachments || [],
      created_by_name: event.created_by_name,
      created_by_id: event.created_by_id,
    }));

    const clientPaymentsFormatted: Payment[] = (clientPaymentsData || []).map((payment) => ({
      id: payment.id.toString(),
      client_name: payment.client_name,
      amount: payment.amount,
      due_dates: payment.due_dates,
      frequency: payment.frequency,
      payment_method: payment.payment_method,
      payment_status: payment.payment_status || {},
    }));

    setClientPastMeetings(pastEvents);
    setClientFutureMeetings(futureEvents);
    setClientPayments(clientPaymentsFormatted);
    setClientMeetingsLoading(false);
  };

  const renderClientDetailsView = () => {
    if (!selectedClient) return null;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedClient(null)}
              className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              aria-label="Back to clients"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">{selectedClient.name}</h3>
              <span className={`inline-block mt-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                selectedClient.type === 'mutual_funds'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {selectedClient.type === 'mutual_funds' ? 'Mutual Funds' : 'Holistic'}
              </span>
            </div>
            <button
              onClick={() => {
                setShowNotesModal(true);
                loadClientNotes(selectedClient.id);
              }}
              className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              aria-label="View notes"
              title="View notes"
            >
              <StickyNote className="w-5 h-5" />
            </button>
          </div>
        </div>

        {clientMeetingsLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            <p className="text-gray-500 text-sm mt-3">Loading meetings...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            <div className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Upcoming Meetings ({clientFutureMeetings.length})
              </h4>
              {clientFutureMeetings.length === 0 ? (
                <p className="text-gray-500 text-sm">No upcoming meetings scheduled</p>
              ) : (
                <div className="space-y-3">
                  {clientFutureMeetings.map((meeting) => (
                    <div key={meeting.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h5 className="text-base font-semibold text-gray-900">{meeting.title}</h5>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{meeting.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            <Clock className="w-4 h-4 ml-2" />
                            <span>{meeting.time}</span>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${meeting.color}`}>
                          {meeting.isOnline ? (meeting.location === 'On Call' ? 'On Call' : 'Online') : 'Face to Face'}
                        </span>
                      </div>
                      {meeting.agenda && (
                        <p className="text-sm text-gray-600 mt-2">{meeting.agenda}</p>
                      )}
                      {meeting.meetingLink && (
                        <div className="mt-2">
                          <a
                            href={meeting.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <LinkIcon className="w-4 h-4" />
                            Join Meeting
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-gray-600" />
                Past Meetings ({clientPastMeetings.length})
              </h4>
              {clientPastMeetings.length === 0 ? (
                <p className="text-gray-500 text-sm">No past meetings found</p>
              ) : (
                <div className="space-y-3">
                  {clientPastMeetings.map((meeting) => (
                    <div key={meeting.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h5 className="text-base font-semibold text-gray-900">{meeting.title}</h5>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{meeting.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            <Clock className="w-4 h-4 ml-2" />
                            <span>{meeting.time}</span>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${meeting.color}`}>
                          {meeting.isOnline ? (meeting.location === 'On Call' ? 'On Call' : 'Online') : 'Face to Face'}
                        </span>
                      </div>
                      {meeting.agenda && (
                        <p className="text-sm text-gray-600 mt-2">{meeting.agenda}</p>
                      )}
                      {meeting.momFiles && meeting.momFiles.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-700 mb-2">Minutes of Meeting:</p>
                          <div className="space-y-2">
                            {meeting.momFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {getFileTypeIcon(file.name)}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm text-gray-900 truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {formatFileSize(file.size)} • {formatUploadDate(file.uploadedAt)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                  <button
                                    onClick={() => handleViewMOMFile(file.path, file.name)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="View file"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDownloadMOMFile(file.path, file.name)}
                                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                    title="Download file"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-emerald-600" />
                Scheduled Payments ({clientPayments.length})
              </h4>
              {clientPayments.length === 0 ? (
                <p className="text-gray-500 text-sm">No scheduled payments found</p>
              ) : (
                <div className="space-y-4">
                  {clientPayments.map((payment) => {
                    const sortedDates = [...payment.due_dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

                    return (
                      <div key={payment.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1.5">
                                <IndianRupee className="w-4 h-4" />
                                <span className="font-medium">₹{payment.amount.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full whitespace-nowrap capitalize">
                              {payment.frequency.replace('-', ' ')}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 space-y-2">
                          {sortedDates.map((dateKey) => {
                            const dueDate = new Date(dateKey);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const isPaymentDatePassed = dueDate < today;
                            const status = payment.payment_status?.[dateKey] || 'unpaid';

                            return (
                              <div key={dateKey} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <Calendar className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm text-gray-900">
                                    {dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                                {isPaymentDatePassed && (
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                    status === 'paid'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-orange-100 text-orange-700'
                                  }`}>
                                    {status === 'paid' ? 'Paid' : 'Unpaid'}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderClientsView = () => {
    if (selectedClient) {
      return renderClientDetailsView();
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Clients</h3>
            {canEdit && (
              <button
                onClick={() => setShowClientModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Client
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {clientsLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
              <p className="text-gray-500 text-sm mt-3">Loading clients...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-4">No clients added yet</p>
              {canEdit && (
                <button
                  onClick={() => setShowClientModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Client
                </button>
              )}
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4
                        className="text-base font-semibold text-gray-900 hover:text-amber-600 transition-colors cursor-pointer"
                        onClick={() => handleClientClick(client)}
                      >
                        {client.name}
                      </h4>
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClient(client.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Delete client"
                          title="Delete client"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => handleClientClick(client)}
                    >
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        client.type === 'mutual_funds'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {client.type === 'mutual_funds' ? 'Mutual Funds' : 'Holistic'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {clients.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600 text-center">
              Showing {clients.length} client{clients.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setMomFiles([...momFiles, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setMomFiles(momFiles.filter((_, i) => i !== index));
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setAttachmentFiles([...attachmentFiles, ...filesArray]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachmentFiles(attachmentFiles.filter((_, i) => i !== index));
  };

  const handleViewAttachment = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('meeting-attachments')
        .createSignedUrl(filePath, 3600);

      if (error) {
        console.error('Error getting file URL:', error);
        alert('Failed to load file. Please try again.');
        return;
      }

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error in handleViewAttachment:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleDownloadAttachment = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('meeting-attachments')
        .download(filePath);

      if (error) {
        console.error('Error downloading file:', error);
        alert('Failed to download file. Please try again.');
        return;
      }

      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error in handleDownloadAttachment:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const getFileTypeIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return <FileText className="w-5 h-5 flex-shrink-0" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatUploadDate = (dateString?: string) => {
    if (!dateString) return 'Upload date unavailable';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewMOMFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('mom-files')
        .createSignedUrl(filePath, 3600); // URL valid for 1 hour

      if (error) {
        console.error('Error getting file URL:', error);
        alert('Failed to load file. Please try again.');
        return;
      }

      if (data?.signedUrl) {
        // Open in new tab
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error in handleViewMOMFile:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleDownloadMOMFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('mom-files')
        .download(filePath);

      if (error) {
        console.error('Error downloading file:', error);
        alert('Failed to download file. Please try again.');
        return;
      }

      if (data) {
        // Create a blob URL and trigger download
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error in handleDownloadMOMFile:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleDeleteMOMFile = async (eventId: string, filePath: string, fileName: string, historyId?: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Find the history record for this event using historyId if available
      let historyRecord;

      if (historyId) {
        const { data, error: findError } = await supabase
          .from('meeting_history')
          .select('id, mom_files')
          .eq('id', parseInt(historyId))
          .maybeSingle();

        if (findError) {
          console.error('Error finding history record:', findError);
          alert('Failed to find meeting history. Please try again.');
          return;
        }

        historyRecord = data;
      } else {
        const { data, error: findError } = await supabase
          .from('meeting_history')
          .select('id, mom_files')
          .eq('original_event_id', parseInt(eventId))
          .maybeSingle();

        if (findError) {
          console.error('Error finding history record:', findError);
          alert('Failed to find meeting history. Please try again.');
          return;
        }

        historyRecord = data;
      }

      if (!historyRecord) {
        alert('Meeting history not found.');
        return;
      }

      // Delete file from storage
      const { error: deleteError } = await supabase.storage
        .from('mom-files')
        .remove([filePath]);

      if (deleteError) {
        console.error('Error deleting file from storage:', deleteError);
        alert('Failed to delete file from storage. Please try again.');
        return;
      }

      // Remove file from database record
      const existingFiles = historyRecord.mom_files || [];
      const updatedFiles = existingFiles.filter((file: { path: string }) => file.path !== filePath);

      const { error: updateError } = await supabase
        .from('meeting_history')
        .update({ mom_files: updatedFiles })
        .eq('id', historyRecord.id);

      if (updateError) {
        console.error('Error updating history record:', updateError);
        alert('Failed to update meeting history. Please try again.');
        return;
      }

      alert('File deleted successfully!');

      // Reload history to show updated files
      if (viewMode === 'history') {
        await loadHistory();
      }

      // Close modal if open
      if (selectedEvent) {
        setSelectedEvent(null);
      }
    } catch (error) {
      console.error('Error in handleDeleteMOMFile:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleAddMOM = async () => {
    if (!selectedEvent || momFiles.length === 0) return;

    try {
      // Use historyId if available, otherwise try to find by original_event_id
      let historyRecord;

      if (selectedEvent.historyId) {
        const { data, error: findError } = await supabase
          .from('meeting_history')
          .select('id, mom_files')
          .eq('id', parseInt(selectedEvent.historyId))
          .maybeSingle();

        if (findError) {
          console.error('Error finding history record:', findError);
          alert('Failed to find meeting history. Please try again.');
          return;
        }

        historyRecord = data;
      } else {
        const { data, error: findError } = await supabase
          .from('meeting_history')
          .select('id, mom_files')
          .eq('original_event_id', parseInt(selectedEvent.id))
          .maybeSingle();

        if (findError) {
          console.error('Error finding history record:', findError);
          alert('Failed to find meeting history. Please try again.');
          return;
        }

        historyRecord = data;
      }

      if (!historyRecord) {
        alert('This meeting has not been moved to history yet.');
        return;
      }

      // Upload files to Supabase Storage
      const uploadedFiles: { name: string; path: string; size: number; uploadedAt: string }[] = [];

      for (const file of momFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${historyRecord.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('mom-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          alert(`Failed to upload ${file.name}. Please try again.`);
          return;
        }

        uploadedFiles.push({
          name: file.name,
          path: filePath,
          size: file.size,
          uploadedAt: new Date().toISOString()
        });
      }

      // Update history record with new MOM files
      const existingFiles = historyRecord.mom_files || [];
      const updatedFiles = [...existingFiles, ...uploadedFiles];

      const { error: updateError } = await supabase
        .from('meeting_history')
        .update({ mom_files: updatedFiles })
        .eq('id', historyRecord.id);

      if (updateError) {
        console.error('Error updating history record:', updateError);
        alert('Failed to update meeting history. Please try again.');
        return;
      }

      alert(`Successfully added ${momFiles.length} file(s) to Minutes of Meeting!`);
      setMomFiles([]);
      setSelectedEvent(null);

      // Reload history to show updated files
      if (viewMode === 'history') {
        await loadHistory();
      }
    } catch (error) {
      console.error('Error in handleAddMOM:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const renderEventModal = () => {
    if (!selectedEvent) return null;

    const now = new Date();
    const eventDateTime = new Date(selectedEvent.date);
    const [hours, minutes] = selectedEvent.time.split(':').map(Number);
    eventDateTime.setHours(hours, minutes, 0, 0);
    const isPastEvent = eventDateTime < now;

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Event Details</h2>
            <button
              onClick={() => {
                setSelectedEvent(null);
                setMomFiles([]);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-6 space-y-5">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {selectedEvent.clientName}
              </h3>
              <p className="text-sm text-gray-500">{selectedEvent.title}</p>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Date</span>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedEvent.date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-500">Time</span>
                <p className="text-sm text-gray-900 mt-1">{selectedEvent.time}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-500">Location</span>
                <p className="text-sm text-gray-900 mt-1">{selectedEvent.location}</p>
              </div>

              {selectedEvent.isOnline && selectedEvent.meetingLink && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Meeting Link</span>
                  <a
                    href={selectedEvent.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 mt-1 group"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span className="group-hover:underline">Join online meeting</span>
                  </a>
                </div>
              )}

              {selectedEvent.agenda && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Agenda</span>
                  <p className="text-sm text-gray-900 mt-1 leading-relaxed">
                    {selectedEvent.agenda}
                  </p>
                </div>
              )}

              <div>
                <span className="text-sm font-medium text-gray-500">Created by</span>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedEvent.created_by_name || 'Not tracked'}
                </p>
              </div>

              {selectedEvent.attachments && selectedEvent.attachments.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Attachments ({selectedEvent.attachments.length})
                  </label>
                  <div className="space-y-2">
                    {selectedEvent.attachments.map((file, index) => (
                      <div
                        key={index}
                        className="group bg-gray-50 border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            {getFileTypeIcon(file.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <span>{formatFileSize(file.size)}</span>
                              <span>•</span>
                              <span>{formatUploadDate(file.uploadedAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleViewAttachment(file.path, file.name)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View file"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadAttachment(file.path, file.name)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Download file"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isPastEvent && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minutes of Meeting (MOM)
                    </label>

                    {/* Show existing MOM files */}
                    {selectedEvent.momFiles && selectedEvent.momFiles.length > 0 && (
                      <div className="space-y-3 mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Uploaded Files ({selectedEvent.momFiles.length})
                        </h4>
                        <div className="grid gap-3">
                          {selectedEvent.momFiles.map((file, index) => (
                            <div
                              key={index}
                              className="group bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-md transition-all duration-200"
                            >
                              <div className="flex items-start gap-3">
                                <div className="p-2.5 bg-amber-100 rounded-lg">
                                  {getFileTypeIcon(file.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-sm font-semibold text-gray-900 truncate mb-1">
                                    {file.name}
                                  </h5>
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <span className="font-medium">{formatFileSize(file.size)}</span>
                                    </span>
                                    {file.uploadedAt && (
                                      <>
                                        <span className="text-gray-300">•</span>
                                        <span>{formatUploadDate(file.uploadedAt)}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                <button
                                  onClick={() => handleViewMOMFile(file.path, file.name)}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                                  title="Open file"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Open
                                </button>
                                <button
                                  onClick={() => handleDownloadMOMFile(file.path, file.name)}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Download file"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </button>
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteMOMFile(selectedEvent.id, file.path, file.name, selectedEvent.historyId)}
                                    className="flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Delete file"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upload new files section */}
                    {canEdit && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700">Add New Files</h4>
                        <label className="flex flex-col items-center justify-center gap-2 px-6 py-8 text-sm font-medium text-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl hover:border-amber-400 hover:bg-amber-50/50 transition-all cursor-pointer group">
                          <div className="p-3 bg-white rounded-full shadow-sm group-hover:shadow-md transition-shadow">
                            <Upload className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition-colors" />
                          </div>
                          <span className="text-gray-700 group-hover:text-amber-700 transition-colors">
                            Click to upload or drag files here
                          </span>
                          <span className="text-xs text-gray-500">
                            PDF, DOC, DOCX, TXT, JPG, PNG (Max 10MB)
                          </span>
                          <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                          />
                        </label>
                        {momFiles.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-600">Ready to upload ({momFiles.length})</p>
                            {momFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900 truncate font-medium">
                                      {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatFileSize(file.size)}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveFile(index)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                  title="Remove file"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
            {isPastEvent ? (
              canEdit && (
                <button
                  onClick={handleAddMOM}
                  disabled={momFiles.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    momFiles.length === 0
                      ? 'text-gray-400 bg-gray-200 cursor-not-allowed'
                      : 'text-white bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Add MOM ({momFiles.length})
                </button>
              )
            ) : (
              <>
                {canEdit && (
                  <button
                    onClick={() => {
                      handleRescheduleEvent(selectedEvent);
                      setSelectedEvent(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    Reschedule
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => {
                      handleDeleteEvent(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Event
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Event Modal */}
      {renderEventModal()}
      {renderAddEventModal()}
      {renderRescheduleModal()}
      {renderPaymentModal()}
      {renderEditPaymentModal()}
      {renderClientModal()}
      {showUserManagement && (
        <UserManagement user={user} onClose={onCloseUserManagement} />
      )}
      {showChangePassword && (
        <ChangePassword user={user} onClose={onCloseChangePassword} />
      )}
      {showGoogleOAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Google Integration</h2>
              <button
                onClick={onCloseGoogleOAuth}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <GoogleOAuth />
            </div>
          </div>
        </div>
      )}

      {showOAuthForMeetLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Connect Google Account</h2>
              <button
                onClick={() => {
                  setShowOAuthForMeetLink(false);
                  setPendingMeetLinkGeneration(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  To generate Google Meet links, you need to connect your Google account. After connecting, the meeting link will be generated automatically.
                </p>
              </div>
              <GoogleOAuth />
            </div>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex-shrink-0">
              <button
                onClick={() => setViewMode('calendar')}
                className="text-lg font-semibold text-gray-900 hover:text-amber-600 transition-colors"
              >
                Valoare Diary
              </button>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => setViewMode('clients')}
                className={`text-sm transition-colors ${
                  viewMode === 'clients'
                    ? 'text-amber-600 font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Clients
              </button>
              <button
                onClick={() => setViewMode('payments')}
                className={`text-sm transition-colors ${
                  viewMode === 'payments'
                    ? 'text-amber-600 font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Payments
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`text-sm transition-colors ${
                  viewMode === 'history'
                    ? 'text-amber-600 font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                History
              </button>
              <UserMenu
                user={user}
                onShowUserManagement={onShowUserManagement}
                onShowActivityLog={onShowActivityLog}
                onShowChangePassword={onShowChangePassword}
                onShowGoogleOAuth={onShowGoogleOAuth}
                onSignOut={onSignOut}
              />
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                className="text-gray-600 hover:text-gray-900"
                aria-label="Open menu"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Section */}
        {viewMode !== 'history' && viewMode !== 'payments' && viewMode !== 'clients' && (
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Schedule Meeting
            </h2>
            {canEdit && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setShowAddEventModal(true)}
                  className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  Add Meeting
                </button>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                >
                  <IndianRupee className="w-5 h-5" />
                  Schedule Payments
                </button>
              </div>
            )}
          </div>
        )}

        {/* Calendar Controls */}
        {viewMode !== 'history' && viewMode !== 'payments' && viewMode !== 'clients' && (
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Month Navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 min-w-[160px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              aria-label="Calendar view"
            >
              <Calendar className="w-4 h-4" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${
                viewMode === 'list'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
              <span>List</span>
            </button>
          </div>
        </div>
        )}

        {/* Calendar/List/History View */}
        {viewMode === 'calendar' && renderCalendarView()}
        {viewMode === 'list' && renderListView()}
        {viewMode === 'history' && renderHistoryView()}
        {viewMode === 'payments' && renderPaymentsView()}
        {viewMode === 'clients' && renderClientsView()}
      </main>

      {/* In-App Reminder Alarm Modal */}
      {showReminderAlert && activeReminder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black bg-opacity-70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform animate-bounce-in">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-5 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-white rounded-full p-2 animate-pulse">
                  <Bell className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Meeting Reminder!</h2>
                  <p className="text-red-50 text-sm">Your meeting is starting soon</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 rounded-lg p-2">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Client</p>
                    <p className="text-lg font-semibold text-gray-900">{activeReminder.clientName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-purple-50 rounded-lg p-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Time</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {activeReminder.time}
                      <span className="text-sm text-gray-600 ml-2">
                        (in {activeReminder.reminder_minutes || 30} minutes)
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-green-50 rounded-lg p-2">
                    <MapPin className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Location</p>
                    <p className="text-lg font-semibold text-gray-900">{activeReminder.location}</p>
                  </div>
                </div>

                {activeReminder.agenda && (
                  <div className="flex items-start gap-3">
                    <div className="bg-amber-50 rounded-lg p-2">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">Agenda</p>
                      <p className="text-sm text-gray-700">{activeReminder.agenda}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowReminderAlert(false);
                    setActiveReminder(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Dismiss
                </button>
                {activeReminder.meetingLink && (
                  <a
                    href={activeReminder.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      setShowReminderAlert(false);
                      setActiveReminder(null);
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all text-center"
                  >
                    Join Meeting
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showNotesModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Notes</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedClient.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setNewNoteContent('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 border-b border-gray-200">
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Write a note..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                rows={4}
              />
              <button
                onClick={handleAddNote}
                disabled={!newNoteContent.trim()}
                className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Add Note
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">All Notes</h3>
              {notesLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                </div>
              ) : clientNotes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No notes yet</p>
              ) : (
                <div className="space-y-4">
                  {clientNotes.map((note) => (
                    <div key={note.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-xs text-gray-500">
                          {new Date(note.created_at).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          {' at '}
                          {new Date(note.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            aria-label="Delete note"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-gray-900 whitespace-pre-wrap">{note.note_content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
