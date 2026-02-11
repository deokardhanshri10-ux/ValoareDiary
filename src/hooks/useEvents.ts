import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser } from '../lib/auth';
import { Event } from '../types';

export function useEvents(user: AuthUser | null) {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [scheduledReminders, setScheduledReminders] = useState<Set<string>>(new Set());
    const [activeReminder, setActiveReminder] = useState<Event | null>(null);
    const [showReminderAlert, setShowReminderAlert] = useState(false);

    const loadEvents = async (checkHistory = false) => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);

        if (checkHistory) {
            await movePastEventsToHistory();
        }

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

    const movePastEventsToHistory = async () => {
        if (!user) return;
        const now = new Date();

        const { data: allScheduledEvents, error: fetchError } = await supabase
            .from('Meet Schedule Data')
            .select('*')
            .eq('organisation_id', user.organisationId);

        if (fetchError || !allScheduledEvents) {
            console.error('Error fetching events for history check:', fetchError);
            return;
        }

        const pastEvents = allScheduledEvents.filter((event) => {
            const eventDateTime = new Date(event.start_date);
            const [hours, minutes] = (event.start_time || '00:00').split(':').map(Number);
            eventDateTime.setHours(hours, minutes, 0, 0);
            return eventDateTime < now;
        });

        if (pastEvents.length === 0) return;

        for (const event of pastEvents) {
            const { data: existingHistory } = await supabase
                .from('meeting_history')
                .select('id')
                .eq('original_event_id', event.id)
                .maybeSingle();

            if (!existingHistory) {
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

    const deleteEvent = async (eventId: string) => {
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

                if (timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000 && !scheduledReminders.has(reminderKey)) {
                    setScheduledReminders(prev => new Set(prev).add(reminderKey));

                    setTimeout(() => {
                        playAlarmSound();

                        setActiveReminder(event);
                        setShowReminderAlert(true);

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

    useEffect(() => {
        if (user) {
            loadEvents(true);

            const interval = setInterval(() => {
                movePastEventsToHistory().then(() => loadEvents(false));
            }, 5 * 60 * 1000);

            const reminderInterval = setInterval(() => {
                checkAndScheduleReminders();
            }, 60 * 1000);

            return () => {
                clearInterval(interval);
                clearInterval(reminderInterval);
            };
        } else {
            setEvents([]);
            setLoading(false);
        }
    }, [user?.id]); // Depend on user ID

    useEffect(() => {
        checkAndScheduleReminders();
    }, [events]);

    return {
        events,
        loading,
        loadEvents,
        deleteEvent,
        activeReminder,
        setActiveReminder,
        showReminderAlert,
        setShowReminderAlert
    };
}
