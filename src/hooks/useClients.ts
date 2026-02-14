import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser } from '../lib/auth';
import { Client } from '../types';
import { useActivityLog } from './useActivityLog';

export function useClients(user: AuthUser | null) {
    const { logActivity } = useActivityLog();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    const loadClients = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('organisation_id', user.organisationId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading clients:', error);
            setLoading(false);
            return;
        }

        setClients(data || []);
        setLoading(false);
    };

    const deleteClient = async (clientId: string) => {
        // Ask for confirmation before deleting
        const confirmed = window.confirm(
            'Are you sure you want to delete this client? This action cannot be undone.'
        );

        if (!confirmed) {
            return;
        }

        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', clientId);

        if (error) {
            console.error('Error deleting client:', error);
            throw error;
        }

        // Log activity
        await logActivity(
            user,
            'delete',
            'clients',
            clientId,
            { clientId }
        );

        await loadClients();
    };


    useEffect(() => {
        if (user) {
            loadClients();
        } else {
            setClients([]);
            setLoading(false);
        }
    }, [user?.id]);

    return {
        clients,
        loading,
        loadClients,
        deleteClient
    };
}
