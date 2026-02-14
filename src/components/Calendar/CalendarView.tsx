import { useState } from 'react';
import { Event, Payment } from '../../types';
import { getDaysInMonth, calculateRecurringDates } from '../../utils/dateUtils';
import { PaymentMethodModal } from '../Payments/PaymentMethodModal';
import { AuthUser } from '../../lib/auth';

interface CalendarViewProps {
    currentDate: Date;
    events: Event[];
    payments: Payment[];
    user: AuthUser;
    onSelectEvent: (event: Event) => void;
    onTogglePaymentStatus: (payment: Payment, dateKey: string, method: string) => void;
}

export function CalendarView({
    currentDate,
    events,
    payments,
    user,
    onSelectEvent,
    onTogglePaymentStatus,
}: CalendarViewProps) {
    const canEdit = user.role === 'manager' || user.role === 'associate-editor';
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const [methodModalOpen, setMethodModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<{ payment: Payment, dateKey: string } | null>(null);

    const getEventsForDate = (day: number) => {
        return events.filter((event) => {
            return (
                event.date.getDate() === day &&
                event.date.getMonth() === currentDate.getMonth() &&
                event.date.getFullYear() === currentDate.getFullYear()
            );
        });
    };

    const getPaymentsForDate = (day: number) => {
        return payments.filter((payment) => {
            const recurringDates = calculateRecurringDates(payment, currentDate.getMonth(), currentDate.getFullYear());
            return recurringDates.some((date) => date.getDate() === day);
        });
    };

    const days = [];
    const totalCells = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
        const dayNumber = i - startingDayOfWeek + 1;
        const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
        const eventsForDay = isCurrentMonth ? getEventsForDate(dayNumber) : [];
        const paymentsForDay = isCurrentMonth ? getPaymentsForDate(dayNumber) : [];

        days.push(
            <div
                key={i}
                className={`min-h-24 border border-gray-200 p-2 ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                    }`}
            >
                {isCurrentMonth && (
                    <>
                        <div className="text-sm font-medium text-gray-700 mb-1">
                            {dayNumber}
                        </div>
                        <div className="space-y-1">
                            {eventsForDay.map((event) => (
                                <div
                                    key={event.id}
                                    onClick={() => onSelectEvent(event)}
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
                                        className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${status === 'paid'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                            }`}
                                        title={`Payment: ${payment.client_name} - ₹${payment.amount} (${status})`}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <span>₹{payment.amount} - {payment.client_name}</span>
                                            {isPaymentDateToday && canEdit && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (status === 'unpaid') {
                                                            setSelectedPayment({ payment, dateKey });
                                                            setMethodModalOpen(true);
                                                        }
                                                    }}
                                                    disabled={status === 'paid'}
                                                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${status === 'paid'
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

            <PaymentMethodModal
                isOpen={methodModalOpen}
                onClose={() => {
                    setMethodModalOpen(false);
                    setSelectedPayment(null);
                }}
                onSelect={(method) => {
                    if (selectedPayment) {
                        onTogglePaymentStatus(selectedPayment.payment, selectedPayment.dateKey, method);
                        setMethodModalOpen(false);
                        setSelectedPayment(null);
                    }
                }}
            />
        </div>
    );
}
