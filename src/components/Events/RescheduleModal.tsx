import { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { Event } from '../../types';
import { supabase } from '../../lib/supabase';

interface RescheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: Event | null;
    onEventUpdated: () => void;
}

export function RescheduleModal({
    isOpen,
    onClose,
    event,
    onEventUpdated,
}: RescheduleModalProps) {
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !event) return null;

    const handleRescheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rescheduleDate || !rescheduleTime) {
            alert('Please select both date and time.');
            return;
        }

        setIsSubmitting(true);

        const { error } = await supabase
            .from('Meet Schedule Data')
            .update({
                start_date: rescheduleDate,
                start_time: rescheduleTime,
            })
            .eq('id', event.id);

        if (error) {
            console.error('Error rescheduling event:', error);
            alert('Failed to reschedule event. Please try again.');
            setIsSubmitting(false);
            return;
        }

        onEventUpdated();
        onClose();
        setRescheduleDate('');
        setRescheduleTime('');
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Reschedule Event</h2>
                    <button
                        onClick={() => {
                            onClose();
                            setRescheduleDate('');
                            setRescheduleTime('');
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleRescheduleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="rescheduleDate" className="block text-sm font-medium text-gray-700 mb-2">
                            New Date
                        </label>
                        <input
                            type="date"
                            id="rescheduleDate"
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label htmlFor="rescheduleTime" className="block text-sm font-medium text-gray-700 mb-2">
                            New Time
                        </label>
                        <input
                            type="time"
                            id="rescheduleTime"
                            value={rescheduleTime}
                            onChange={(e) => setRescheduleTime(e.target.value)}
                            required
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                setRescheduleDate('');
                                setRescheduleTime('');
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Updating...' : 'Update Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
