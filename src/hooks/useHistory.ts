import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { HistoryItem } from '../types';
import { AuthUser } from '../lib/auth';

export const useHistory = (user: AuthUser | null) => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadHistory = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
            let query = supabase.from('meeting_history')
                .select('*')
                .order('start_date', { ascending: false })
                .order('start_time', { ascending: false });

            if (user.role === 'associate-viewer') {
                // Example of restricting access if needed for viewer
                // For now, let's keep it simple or remove if not applicable
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error loading history:', error);
            } else {
                setHistory(data || []);
            }
        } catch (error) {
            console.error('Error in loadHistory:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const movePastEventsToHistory = useCallback(async () => {
        if (!user) return;

        try {
            const now = new Date();
            // Get local date in YYYY-MM-DD format
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const currentDateString = `${year}-${month}-${day}`;

            const currentTimeString = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

            console.log('Checking for past events...', { currentDateString, currentTimeString });

            // Find past events
            const { data: pastEvents, error: fetchError } = await supabase
                .from('Meet Schedule Data')
                .select('*')
                .lte('start_date', currentDateString);

            if (fetchError) {
                console.error('Error fetching past events:', fetchError);
                throw fetchError;
            }

            if (!pastEvents || pastEvents.length === 0) {
                console.log('No potential past events found in DB.');
                return;
            }

            console.log(`Found ${pastEvents.length} potential past events. Filtering...`);

            const eventsToMove = pastEvents.filter(event => {
                // Check if date is strictly less than today
                if (event.start_date < currentDateString) return true;

                // If date is today, check if time is less than now
                // Assumes event.start_time is in HH:MM format
                if (event.start_date === currentDateString) {
                    const eventTime = event.start_time.substring(0, 5);
                    return eventTime < currentTimeString;
                }

                return false;
            });

            if (eventsToMove.length === 0) {
                console.log('No events to move after filtering.');
                return;
            }

            console.log(`Moving ${eventsToMove.length} events to history:`, eventsToMove);

            // Prepare history records
            const historyRecords = eventsToMove.map(event => ({
                original_event_id: event.id,
                client_name: event.client_name,
                start_date: event.start_date,
                start_time: event.start_time,
                end_time: event.end_time,
                location: event.location,
                agenda: event.agenda,
                meeting_link: event.meeting_link,
                attachments: event.attachments,
                is_online: event.is_online,
                meeting_type: event.meeting_type,
                organisation_id: event.organisation_id,
                created_by_id: event.created_by_id,
                created_by_name: event.created_by_name
            }));

            // Insert into history
            const { error: insertError } = await supabase
                .from('meeting_history')
                .insert(historyRecords);

            if (insertError) {
                console.error('Error moving to history (insert failed):', insertError);
                return;
            }

            // Delete from events
            const eventIds = eventsToMove.map(e => e.id);
            const { error: deleteError } = await supabase
                .from('Meet Schedule Data')
                .delete()
                .in('id', eventIds);

            if (deleteError) {
                console.error('Error deleting moved events:', deleteError);
            } else {
                console.log('Successfully moved events to history.');
            }

            // If we moved events, reload history
            loadHistory();

        } catch (error) {
            console.error('Error in movePastEventsToHistory:', error);
        }
    }, [user, loadHistory]);

    const uploadMOM = async (historyId: string, file: File) => {
        if (!user) return false;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${historyId}/${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('mom-files')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Get current history item to retrieve existing files
            const { data: currentItem, error: fetchError } = await supabase
                .from('meeting_history')
                .select('mom_files')
                .eq('id', historyId)
                .single();

            if (fetchError) throw fetchError;

            const currentFiles = currentItem?.mom_files || [];
            const newFile = {
                name: file.name,
                path: filePath,
                size: file.size,
                uploadedAt: new Date().toISOString()
            };

            const { error: updateError } = await supabase
                .from('meeting_history')
                .update({
                    mom_files: [...currentFiles, newFile]
                })
                .eq('id', historyId);

            if (updateError) throw updateError;

            await loadHistory();
            return true;
        } catch (error) {
            console.error('Error uploading MOM:', error);
            return false;
        }
    };

    return {
        history,
        loading,
        loadHistory,
        movePastEventsToHistory,
        uploadMOM
    };
};
