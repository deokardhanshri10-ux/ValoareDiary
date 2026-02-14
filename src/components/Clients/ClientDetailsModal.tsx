import { Calendar, IndianRupee, Clock, FileText, ChevronLeft, ExternalLink, Download } from 'lucide-react';
import { Client, Event, Payment, HistoryItem } from '../../types';
import { supabase } from '../../lib/supabase';

interface ClientDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
    events: Event[];
    history: HistoryItem[];
    payments: Payment[];
}

export function ClientDetailsModal({
    isOpen,
    onClose,
    client,
    events,
    history,
    payments,
}: ClientDetailsModalProps) {

    if (!isOpen || !client) return null;


    // Filter data for this client
    const clientEvents = events.filter(e => e.clientName === client.name);
    const clientHistory = history.filter(h => h.client_name === client.name);
    const clientPayments = payments.filter(p => p.client_name === client.name);

    // Sort events by date
    const upcomingEvents = clientEvents
        .filter(e => {
            const eventDate = new Date(e.date);
            const [hours, minutes] = e.time.split(':');
            eventDate.setHours(parseInt(hours || '0'), parseInt(minutes || '0'));
            return eventDate >= new Date();
        })
        .sort((a, b) => {
            const dateA = new Date(a.date);
            const [hoursA, minutesA] = a.time.split(':');
            dateA.setHours(parseInt(hoursA || '0'), parseInt(minutesA || '0'));

            const dateB = new Date(b.date);
            const [hoursB, minutesB] = b.time.split(':');
            dateB.setHours(parseInt(hoursB || '0'), parseInt(minutesB || '0'));

            return dateA.getTime() - dateB.getTime();
        });


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

    const handleViewMOMFile = async (filePath: string, _fileName: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('mom-files')
                .createSignedUrl(filePath, 3600);

            if (error) {
                console.error('Error getting file URL:', error);
                alert('Failed to get file URL. Please try again.');
                return;
            }

            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (error) {
            console.error('Error in handleViewMOMFile:', error);
            alert('An error occurred. Please try again.');
        }
    };


    // Render Main Details View (Image 2 Style)
    return (
        <>
            {/* Background Overlay */}
            <div className="fixed top-16 left-0 right-0 bottom-0 z-[60] bg-black bg-opacity-50" onClick={onClose} />

            {/* Modal Content */}
            <div className="fixed top-16 left-0 right-0 bottom-0 z-[61] flex items-start justify-center overflow-hidden pointer-events-none pt-6">
                <div className="w-full max-w-6xl h-full bg-white shadow-xl overflow-hidden flex flex-col pointer-events-auto rounded-t-lg">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-6 h-6 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${client.type === 'mutual_funds'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-green-100 text-green-700'
                                    }`}>
                                    {client.type === 'mutual_funds' ? 'Mutual Funds' : 'Holistic'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-8">

                        {/* Upcoming Meetings Section */}
                        <section>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-teal-600" />
                                Upcoming Meetings ({upcomingEvents.length})
                            </h3>
                            {upcomingEvents.length === 0 ? (
                                <p className="text-gray-500 text-sm ml-7">No upcoming meetings scheduled</p>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingEvents.map(event => (
                                        <div key={event.id} className="bg-white p-4 rounded-lg border border-gray-200">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-gray-900 mb-2">{client.name}</h4>
                                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="w-4 h-4" />
                                                            <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="w-4 h-4" />
                                                            <span>{event.time}</span>
                                                        </div>
                                                    </div>
                                                    {event.agenda && <p className="text-sm text-gray-600 mt-2">{event.agenda}</p>}
                                                </div>
                                                <span className="px-3 py-1 bg-gray-700 text-white rounded text-xs font-medium">
                                                    {event.isOnline ? 'Online' : event.location?.toLowerCase() === 'on call' ? 'On Call' : 'In Person'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Past Meetings Section */}
                        <section>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-gray-600" />
                                Past Meetings ({clientHistory.length})
                            </h3>
                            {clientHistory.length === 0 ? (
                                <p className="text-gray-500 text-sm ml-7">No past meeting history</p>
                            ) : (
                                <div className="space-y-3">
                                    {clientHistory.map(item => {
                                        const meetingType = item.is_online ? 'Online' : item.meeting_type === 'on_call' ? 'On Call' : 'In Person';

                                        return (
                                            <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-gray-900 mb-2">{client.name}</h4>
                                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar className="w-4 h-4" />
                                                                <span>{new Date(item.start_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="w-4 h-4" />
                                                                <span>{item.start_time}</span>
                                                            </div>
                                                        </div>
                                                        {item.agenda && <p className="text-sm text-gray-600 mt-2">{item.agenda}</p>}
                                                    </div>
                                                    <span className="px-3 py-1 bg-gray-700 text-white rounded text-xs font-medium">
                                                        {meetingType}
                                                    </span>
                                                </div>

                                                {item.mom_files && item.mom_files.length > 0 && (
                                                    <div className="pt-3 border-t border-gray-100">
                                                        <h5 className="text-sm font-medium text-gray-700 mb-2">Minutes of Meeting:</h5>
                                                        <div className="space-y-2">
                                                            {item.mom_files.map((file, idx) => (
                                                                <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                        <FileText className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                                                            <p className="text-xs text-gray-500">
                                                                                {file.size ? `${(file.size / 1024).toFixed(2)} KB` : ''}
                                                                                {file.uploadedAt && ` • ${new Date(file.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date(file.uploadedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 ml-2">
                                                                        <button
                                                                            onClick={() => handleViewMOMFile(file.path, file.name)}
                                                                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                                                            title="View"
                                                                        >
                                                                            <ExternalLink className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDownloadMOMFile(file.path, file.name)}
                                                                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                                                            title="Download"
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
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {/* Scheduled Payments Section */}
                        <section>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <IndianRupee className="w-5 h-5 text-emerald-600" />
                                Scheduled Payments ({clientPayments.length})
                            </h3>
                            {clientPayments.length === 0 ? (
                                <p className="text-gray-500 text-sm ml-7">No payments scheduled</p>
                            ) : (
                                <div className="space-y-3">
                                    {clientPayments.map(payment => (
                                        <div key={payment.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-gray-900">₹{payment.amount.toLocaleString()}</span>
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                                                    {payment.frequency}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mb-3">{payment.payment_method}</p>

                                            <div className="space-y-2 border-t border-gray-100 pt-2">
                                                {payment.due_dates.map((date, idx) => {
                                                    const status = payment.payment_status[date] || 'pending';
                                                    const isPaid = status === 'paid';
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between text-sm">
                                                            <span className="text-gray-600">{new Date(date).toLocaleDateString()}</span>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isPaid
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-yellow-100 text-yellow-700'
                                                                }`}>
                                                                {isPaid ? 'Paid' : 'Pending'}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                    </div>
                </div>
            </div>
        </>
    );
}
