import { useState, useEffect } from 'react';
import { X, IndianRupee, Plus } from 'lucide-react';
import { Payment, Client } from '../../types';
import { AuthUser } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: Payment | null; // If null, it's add mode. If set, it's edit mode.
    user: AuthUser;
    clients: Client[];
    onPaymentUpdated: () => void;
}

export function PaymentModal({
    isOpen,
    onClose,
    payment,
    user,
    clients,
    onPaymentUpdated,
}: PaymentModalProps) {
    const [dueDates, setDueDates] = useState<string[]>(['']);
    const [paymentAmounts, setPaymentAmounts] = useState<string[]>(['']);
    const [paymentFrequency, setPaymentFrequency] = useState('one-time');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (payment) {
            setDueDates(payment.due_dates || ['']);
            setPaymentAmounts(payment.amounts ? payment.amounts.map(String) : [String(payment.amount)]);
            setPaymentFrequency(payment.frequency);
        } else {
            setDueDates(['']);
            setPaymentAmounts(['']);
            setPaymentFrequency('one-time');
        }
    }, [payment, isOpen]);

    if (!isOpen) return null;

    const isEditMode = !!payment;

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

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const form = e.currentTarget;
        const clientName = (form.elements.namedItem('clientName') as HTMLInputElement).value;
        const frequency = (form.elements.namedItem('frequency') as HTMLSelectElement).value;
        const comments = (form.elements.namedItem('comments') as HTMLTextAreaElement)?.value || null;
        const validDueDates = dueDates.filter(date => date !== '');

        if (validDueDates.length === 0) {
            alert('Please add at least one due date.');
            setIsSubmitting(false);
            return;
        }

        let amountsArray: number[] = [];
        let singleAmount: number = 0;

        if (frequency === 'quarterly' || frequency === 'half-yearly') {
            const validAmounts = paymentAmounts.filter(amt => amt !== '').map(amt => parseFloat(amt));
            if (validAmounts.length !== validDueDates.length) {
                alert('Please enter an amount for each due date.');
                setIsSubmitting(false);
                return;
            }
            amountsArray = validAmounts;
            singleAmount = validAmounts[0];
        } else {
            const amountInput = form.elements.namedItem('amount') as HTMLInputElement;
            singleAmount = parseFloat(amountInput.value);
            amountsArray = [singleAmount];
        }

        if (isEditMode && payment) {
            // Update
            const { error } = await supabase
                .from('payments')
                .update({
                    client_name: clientName,
                    amount: singleAmount,
                    amounts: amountsArray,
                    due_dates: validDueDates,
                    frequency: frequency,
                    comments: comments,
                })
                .eq('id', payment.id);

            if (error) {
                console.error('Error updating payment:', error);
                alert('Failed to update payment. Please try again.');
                setIsSubmitting(false);
                return;
            }
        } else {
            // Create
            const { error } = await supabase
                .from('payments')
                .insert({
                    client_name: clientName,
                    amount: singleAmount,
                    amounts: amountsArray,
                    due_dates: validDueDates,
                    frequency: frequency,
                    payment_method: '', // Default to empty string for now
                    organisation_id: user.organisationId,
                    created_by_id: user.id,
                    created_by_name: user.fullName,
                    comments: comments,
                });

            if (error) {
                console.error('Error adding payment:', error);
                alert('Failed to add payment. Please try again.');
                setIsSubmitting(false);
                return;
            }
        }

        onPaymentUpdated();
        onClose();
        setIsSubmitting(false);
        if (!isEditMode) {
            setDueDates(['']);
            setPaymentAmounts(['']);
            setPaymentFrequency('one-time');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {isEditMode ? 'Modify Payment' : 'Schedule Payment'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
                    <div>
                        <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
                            Client's Name
                        </label>
                        <input
                            type="text"
                            id="clientName"
                            name="clientName"
                            list="clientsListPayment"
                            defaultValue={payment?.client_name}
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
                            name="frequency"
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
                                    name="amount"
                                    defaultValue={payment?.amount}
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
                        <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
                            Comments
                        </label>
                        <textarea
                            id="comments"
                            name="comments"
                            defaultValue={payment?.comments || ''}
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                            placeholder="Add any comments..."
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Payment' : 'Schedule Payment')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
