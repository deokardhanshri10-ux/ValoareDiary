import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser } from '../lib/auth';
import { ClientNote } from '../types';
import { useActivityLog } from './useActivityLog';

export function useClientNotes(user: AuthUser | null) {
    const { logActivity } = useActivityLog();
    const [notes, setNotes] = useState<ClientNote[]>([]);
    const [loading, setLoading] = useState(false);

    const loadNotes = useCallback(async (clientId: string) => {
        if (!user) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('client_notes')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading notes:', error);
        } else {
            setNotes(data || []);
        }
        setLoading(false);
    }, [user]);

    const addNote = async (clientId: string, content: string) => {
        if (!user) return;

        const { data, error } = await supabase
            .from('client_notes')
            .insert({
                client_id: clientId,
                note_content: content,
                created_by_id: user.id,
                created_by_name: user.fullName,
                organisation_id: user.organisationId
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding note:', error);
            throw error;
        }

        setNotes(prev => [data, ...prev]);

        await logActivity(
            user,
            'create',
            'clients',
            clientId,
            { type: 'note', content: content.substring(0, 50) }
        );
    };

    const deleteNote = async (noteId: string, clientId: string) => {
        if (!user) return;

        const { error } = await supabase
            .from('client_notes')
            .delete()
            .eq('id', noteId);

        if (error) {
            console.error('Error deleting note:', error);
            throw error;
        }

        setNotes(prev => prev.filter(n => n.id !== noteId));

        await logActivity(
            user,
            'delete',
            'clients',
            clientId,
            { type: 'note', noteId }
        );
    };

    return {
        notes,
        loading,
        loadNotes,
        addNote,
        deleteNote
    };
}
