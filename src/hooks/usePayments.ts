import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser } from '../lib/auth';
import { Payment } from '../types';
import { useActivityLog } from './useActivityLog';

export function usePayments(user: AuthUser | null) {
    const { logActivity } = useActivityLog();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPayments = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('organisation_id', user.organisationId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading payments:', error);
            setLoading(false);
            return;
        }

        setPayments(data || []);
        setLoading(false);
    };

    const addPayment = async (paymentData: Omit<Payment, 'id' | 'created_at' | 'payment_status'>) => {
        if (!user) return;
        const { error } = await supabase
            .from('payments')
            .insert({
                ...paymentData,
                payment_status: {},
                organisation_id: user.organisationId,
                created_by_id: user.id,
                created_by_name: user.fullName,

            })
            .select()
            .maybeSingle();

        if (error) {
            console.error('Error adding payment:', error);
            throw error;
        }

        await loadPayments();

        // Log activity
        logActivity(
            user,
            'create',
            'payments',
            '', // We don't have the ID from insert unless we select it.
            paymentData
        );
    };

    const updatePayment = async (id: string, paymentData: Partial<Payment>) => {
        if (!user) return;
        const { error } = await supabase
            .from('payments')
            .update(paymentData)
            .eq('id', id);

        if (error) {
            console.error('Error updating payment:', error);
            throw error;
        }

        // Log activity
        logActivity(
            user,
            'update',
            'payments',
            id,
            paymentData
        );

        await loadPayments();
    };

    const deletePayment = async (paymentId: string) => {
        // Ask for confirmation before deleting
        const confirmed = window.confirm(
            'Are you sure you want to delete this payment? This action cannot be undone.'
        );

        if (!confirmed) {
            return;
        }

        const { error } = await supabase
            .from('payments')
            .delete()
            .eq('id', paymentId);

        if (error) {
            console.error('Error deleting payment:', error);
            throw error;
        }

        // Log activity
        logActivity(
            user,
            'delete',
            'payments',
            paymentId,
            { paymentId }
        );

        await loadPayments();
    };

    const togglePaymentStatus = async (payment: Payment, dueDate: string, method: string) => {
        const currentStatus = payment.payment_status[dueDate] || 'unpaid';

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
                payment_method: method,
            })
            .eq('id', payment.id);

        if (error) {
            console.error('Error updating payment status:', error);
            throw error;
        }

        await loadPayments();
    };

    useEffect(() => {
        if (user) {
            loadPayments();
        } else {
            setPayments([]);
            setLoading(false);
        }
    }, [user?.id]);

    return {
        payments,
        loading,
        loadPayments,
        addPayment,
        updatePayment,
        deletePayment,
        togglePaymentStatus,
    };
}
