import { useState } from 'react';
import { X, Trash2, Calendar, IndianRupee, Clock, FileText, ChevronLeft, ExternalLink, Download } from 'lucide-react';
import { Client, ClientNote, Event, Payment, HistoryItem } from '../../types';
import { AuthUser } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { formatFileSize, formatUploadDate, getFileTypeIcon } from '../../utils/fileUtils';

interface ClientDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
    notes: ClientNote[];
    events: Event[];
    history: HistoryItem[];
    payments: Payment[];
    loadingNotes: boolean;
    onAddNote: (content: string) => void;
    onDeleteNote: (id: string) => void;
    user: AuthUser;
}

export function ClientDetailsModal({
    isOpen,
    onClose,
    client,
    notes,
    events,
    history,
    payments,
    loadingNotes,
    onAddNote,
    onDeleteNote,
    user,
}: ClientDetailsModalProps) {
    const [showNotes, setShowNotes] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');

    if (!isOpen || !client) return null;

    const canDelete = user.role === 'manager';

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

    const handleAddNote = () => {
        if (newNoteContent.trim()) {
            onAddNote(newNoteContent);
            setNewNoteContent('');
        }
    };

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

    const handleViewMOMFile = async (filePath: string, fileName: string) => {
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

    // Render Notes View (Image 1 Style)
    if (showNotes) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Notes</h2>
                            <p className="text-sm text-gray-600 mt-1">{client.name}</p>
                        </div>
                        <button
                            onClick={() => setShowNotes(false)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 border-b border-gray-200">
                        <textarea
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            placeholder="Write a note..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                            rows={4}
                        />
                        <button
                            onClick={handleAddNote}
                            disabled={!newNoteContent.trim()}
                            className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            Add Note
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Notes</h3>
                        {loadingNotes ? (
                            <div className="text-center py-8">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                            </div>
                        ) : notes.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No notes yet</p>
                        ) : (
                            <div className="space-y-4">
                                {notes.map((note) => (
                                    <div key={note.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="text-xs text-gray-500">
                                                {new Date(note.created_at).toLocaleDateString()} at {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {canDelete && (
                                                <button
                                                    onClick={() => onDeleteNote(note.id)}
                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    aria-label="Delete note"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-gray-900 whitespace-pre-wrap">{note.note_content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Render Main Details View (Image 2 Style)
    return (
        <div className="fixed inset-0 z-[60] bg-white overflow-hidden flex flex-col">
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
                <button
                    onClick={() => setShowNotes(true)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                    title="View Notes"
                >
                    <FileText className="w-6 h-6" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-8">

                {/* Upcoming Meetings Section */}
                <section>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-amber-600" />
                        Upcoming Meetings ({upcomingEvents.length})
                    </h3>
                    {upcomingEvents.length === 0 ? (
                        <p className="text-gray-500 text-sm ml-7">No upcoming meetings scheduled</p>
                    ) : (
                        <div className="space-y-3">
                            {upcomingEvents.map(event => (
                                <div key={event.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{event.title}</h4>
                                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                                <span>{new Date(event.date).toLocaleDateString()}</span>
                                                <span>{event.time}</span>
                                            </div>
                                            {event.agenda && <p className="text-sm text-gray-600 mt-2">{event.agenda}</p>}
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${event.isOnline ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {event.isOnline ? 'Online' : 'In-person'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Past Meetings Section */}
                <section>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-600" />
                        Past Meetings ({clientHistory.length})
                    </h3>
                    {clientHistory.length === 0 ? (
                        <p className="text-gray-500 text-sm ml-7">No past meeting history</p>
                    ) : (
                        <div className="space-y-3">
                            {clientHistory.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{client.name}</h4>
                                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                                <span>{new Date(item.start_date).toLocaleDateString()}</span>
                                                <span>{item.start_time}</span>
                                            </div>
                                            <div className="text-sm text-gray-600 mt-2">{item.agenda}</div>

                                            {item.mom_files && item.mom_files.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-gray-100">
                                                    <h5 className="text-xs font-medium text-gray-900 mb-2 flex items-center gap-1.5">
                                                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                                                        MOM Files ({item.mom_files.length})
                                                    </h5>
                                                    <div className="space-y-2">
                                                        {item.mom_files.map((file, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm hover:bg-gray-100 transition-colors">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className="text-amber-600">
                                                                        {getFileTypeIcon(file.name)}
                                                                    </span>
                                                                    <span className="truncate max-w-[150px]" title={file.name}>{file.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => handleViewMOMFile(file.path, file.name)}
                                                                        className="p-1 text-gray-400 hover:text-amber-600 rounded transition-colors"
                                                                        title="View"
                                                                    >
                                                                        <ExternalLink className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDownloadMOMFile(file.path, file.name)}
                                                                        className="p-1 text-gray-400 hover:text-cyan-600 rounded transition-colors"
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
                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                            Completed
                                        </span>
                                    </div>
                                </div>
                            ))}
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
    );
}
