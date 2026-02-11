import { useState } from 'react';
import { Calendar, IndianRupee, Users, Trash2, Pencil, Search, Filter } from 'lucide-react';
import { Payment } from '../../types';
import { AuthUser } from '../../lib/auth';

interface PaymentListProps {
    payments: Payment[];
    loading: boolean;
    user: AuthUser;
    onEdit: (payment: Payment) => void;
    onDelete: (id: string) => void;
    onToggleStatus: (payment: Payment, dateKey: string) => void;
}

export function PaymentList({
    payments,
    loading,
    user,
    onEdit,
    onDelete,
    onToggleStatus,
}: PaymentListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [frequencyFilter, setFrequencyFilter] = useState('all');
    const [methodFilter, setMethodFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const canEdit = user.role === 'manager' || user.role === 'associate_editor';
    const canDelete = user.role === 'manager';
    const isViewer = user.role === 'associate_viewer';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Flatten payments to show each due date as an item
    const expandedPayments: { payment: Payment; dateKey: string; date: Date }[] = [];

    payments.forEach((payment) => {
        payment.due_dates.forEach((dateStr) => {
            if (dateStr) {
                expandedPayments.push({
                    payment,
                    dateKey: dateStr,
                    date: new Date(dateStr),
                });
            }
        });
    });

    const filteredPayments = expandedPayments.filter(({ payment, dateKey }) => {
        // Status Filter
        const status = payment.payment_status[dateKey] || 'unpaid';
        if (statusFilter !== 'all') {
            if (statusFilter === 'pending' && status !== 'unpaid') return false;
            if (statusFilter === 'completed' && status !== 'paid') return false;
        }

        // Search Filter
        if (searchTerm && !payment.client_name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }

        // Frequency Filter
        if (frequencyFilter !== 'all' && payment.frequency !== frequencyFilter) {
            return false;
        }

        // Method Filter
        if (methodFilter !== 'all' && payment.payment_method !== methodFilter) {
            return false;
        }

        return true;
    });

    // Group by date for display
    const groupedPayments: { [key: string]: typeof expandedPayments } = {};

    filteredPayments.forEach((item) => {
        const dateKey = item.date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        if (!groupedPayments[dateKey]) {
            groupedPayments[dateKey] = [];
        }
        groupedPayments[dateKey].push(item);
    });

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-xl font-semibold text-gray-900">Payment Schedule</h3>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search client..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm w-full sm:w-64"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Filters:</span>
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                    </select>

                    <select
                        value={frequencyFilter}
                        onChange={(e) => setFrequencyFilter(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                        <option value="all">All Frequencies</option>
                        <option value="one-time">One-time</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="half-yearly">Half Yearly</option>
                        <option value="annual">Annual</option>
                    </select>

                    <select
                        value={methodFilter}
                        onChange={(e) => setMethodFilter(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                        <option value="all">All Methods</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                    </select>

                    {(statusFilter !== 'all' || frequencyFilter !== 'all' || methodFilter !== 'all' || searchTerm) && (
                        <button
                            onClick={() => {
                                setStatusFilter('all');
                                setFrequencyFilter('all');
                                setMethodFilter('all');
                                setSearchTerm('');
                            }}
                            className="text-sm text-red-600 hover:text-red-700 hover:underline px-2"
                        >
                            Clear all
                        </button>
                    )}
                </div>
            </div>

            <div className="divide-y divide-gray-200">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                        <p className="text-gray-500 text-sm mt-3">Loading payments...</p>
                    </div>
                ) : Object.keys(groupedPayments).length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-4">
                            <IndianRupee className="w-6 h-6 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No payments found</h3>
                        <p className="mt-1 text-gray-500">
                            {searchTerm || statusFilter !== 'all' || frequencyFilter !== 'all' || methodFilter !== 'all'
                                ? 'No payments found matching your filters.'
                                : 'No payments have been scheduled yet.'}
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
                                        const paymentDate = new Date(date);
                                        paymentDate.setHours(0, 0, 0, 0);
                                        const isPaymentDatePassed = paymentDate.getTime() <= today.getTime();

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
                                                                onClick={() => onToggleStatus(payment, dateKey)}
                                                                disabled={status === 'paid'}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${status === 'paid'
                                                                    ? 'bg-green-600 text-white cursor-not-allowed opacity-90'
                                                                    : 'bg-orange-500 text-white hover:bg-orange-600 cursor-pointer'
                                                                    }`}
                                                                title={status === 'paid' ? 'Payment already marked as paid' : 'Mark as paid'}
                                                            >
                                                                {status === 'paid' ? 'Paid' : 'Unpaid'}
                                                            </button>
                                                        )}
                                                        {isPaymentDatePassed && isViewer && (
                                                            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${status === 'paid'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-orange-100 text-orange-700'
                                                                }`}>
                                                                {status === 'paid' ? 'Paid' : 'Unpaid'}
                                                            </span>
                                                        )}
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => onEdit(payment)}
                                                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                aria-label="Modify payment"
                                                                title="Modify"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button
                                                                onClick={() => onDelete(payment.id)}
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
}
