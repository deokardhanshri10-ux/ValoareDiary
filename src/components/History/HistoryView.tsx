import { useState } from 'react';
import { Search, MapPin, Clock, FileText, Link as LinkIcon, ExternalLink, Download, Plus, Filter } from 'lucide-react';
import { HistoryItem } from '../../types';
import { supabase } from '../../lib/supabase';
import { formatFileSize, formatUploadDate, getFileTypeIcon } from '../../utils/fileUtils';
import { AuthUser } from '../../lib/auth';

interface HistoryViewProps {
    history: HistoryItem[];
    loading: boolean;
    user: AuthUser;
    onUploadMOM: (historyId: string, file: File) => Promise<boolean>;
}

export function HistoryView({ history, loading, user, onUploadMOM }: HistoryViewProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<'all' | 'this_week' | 'this_month'>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'online' | 'in_person' | 'on_call'>('all');

    const canEdit = user.role === 'manager' || user.role === 'associate-editor';

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, historyId: string) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // 10MB limit
        if (file.size > 10 * 1024 * 1024) {
            alert('File size too large. Please select a file smaller than 10MB.');
            return;
        }

        try {
            setUploadingId(historyId);
            const success = await onUploadMOM(historyId, file);
            if (success) {
                alert('MOM uploaded successfully!');
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('Error uploading MOM:', error);
            alert('Failed to upload MOM. Please try again.');
        } finally {
            setUploadingId(null);
            // Reset input
            event.target.value = '';
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

    const handleViewMOMFile = async (filePath: string) => {
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

    const filteredHistory = history.filter(item => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = (
            item.client_name?.toLowerCase().includes(searchLower) ||
            item.agenda?.toLowerCase().includes(searchLower) ||
            item.location?.toLowerCase().includes(searchLower)
        );

        if (!matchesSearch) return false;

        // Date Filter
        if (dateFilter !== 'all') {
            const itemDate = new Date(item.start_date);
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
            startOfWeek.setHours(0, 0, 0, 0);

            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            if (dateFilter === 'this_week') {
                if (itemDate < startOfWeek) return false;
            } else if (dateFilter === 'this_month') {
                if (itemDate < startOfMonth) return false;
            }
        }

        // Type Filter
        if (typeFilter !== 'all') {
            const isOnline = item.is_online || item.location?.toLowerCase() === 'online' || item.meeting_type === 'online';
            const isOnCall = item.meeting_type === 'on_call' || item.location?.toLowerCase() === 'on call';
            const isInPerson = !isOnline && !isOnCall;

            if (typeFilter === 'online' && !isOnline) return false;
            if (typeFilter === 'on_call' && !isOnCall) return false;
            if (typeFilter === 'in_person' && !isInPerson) return false;
        }

        return true;
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex flex-col gap-4 mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Meeting History</h2>
                        <p className="text-sm text-gray-500 mt-1">Past meetings and Minutes of Meeting (MOM)</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search history..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mr-2">
                        <Filter className="w-4 h-4" />
                        <span className="font-medium">Filters:</span>
                    </div>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as any)}
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500"
                    >
                        <option value="all">All Types</option>
                        <option value="online">Online</option>
                        <option value="on_call">On Call</option>
                        <option value="in_person">In Person</option>
                    </select>

                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500"
                    >
                        <option value="all">All Dates</option>
                        <option value="this_week">This Week</option>
                        <option value="this_month">This Month</option>
                    </select>
                </div>
            </div>

            <div className="space-y-6">
                {filteredHistory.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <p className="text-gray-500">No meeting history found</p>
                    </div>
                ) : (
                    filteredHistory.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                        >
                            <div className="p-6">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                                            {item.client_name}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4" />
                                                <span>
                                                    {new Date(item.start_date).toLocaleDateString('en-US', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                    {' at '}
                                                    {item.start_time}{item.end_time ? ` - ${item.end_time}` : ''}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4" />
                                                <span>{item.location === 'Face to Face' ? 'In person' : item.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {item.meeting_link && (
                                        <a
                                            href={item.meeting_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors self-start"
                                        >
                                            <LinkIcon className="w-4 h-4" />
                                            Meeting Link
                                        </a>
                                    )}
                                </div>

                                {item.agenda && (
                                    <div className="mb-6">
                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Agenda</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg">
                                            {item.agenda}
                                        </p>
                                    </div>
                                )}

                                {item.mom_files && item.mom_files.length > 0 && (
                                    <div className="border-t border-gray-100 pt-4">
                                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-amber-600" />
                                            Minutes of Meeting ({item.mom_files.length})
                                        </h4>
                                        {canEdit && (
                                            <div className="flex items-center gap-2 mb-3">
                                                <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors ${uploadingId === item.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        onChange={(e) => handleFileChange(e, item.id)}
                                                        disabled={uploadingId === item.id}
                                                        accept=".pdf,.doc,.docx,.txt"
                                                    />
                                                    <div className="w-4 h-4">
                                                        {uploadingId === item.id ? (
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-700"></div>
                                                        ) : (
                                                            <Plus className="w-4 h-4" />
                                                        )}
                                                    </div>
                                                    {uploadingId === item.id ? 'Uploading...' : 'Add MOM'}
                                                </label>
                                            </div>
                                        )}
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {item.mom_files.map((file, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-amber-300 transition-colors group"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600 group-hover:bg-amber-100 transition-colors">
                                                            {getFileTypeIcon(file.name)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                                                                {file.name}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                <span>{formatFileSize(file.size)}</span>
                                                                {file.uploadedAt && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>{formatUploadDate(file.uploadedAt)}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 pl-2 border-l border-gray-100 ml-2">
                                                        <button
                                                            onClick={() => handleViewMOMFile(file.path)}
                                                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                                                            title="View file"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadMOMFile(file.path, file.name)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                            title="Download file"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(!item.mom_files || item.mom_files.length === 0) && (
                                    <p className="text-sm text-gray-500 italic mt-4">
                                        No MOM files uploaded yet.
                                    </p>
                                )}

                                {canEdit && (!item.mom_files || item.mom_files.length === 0) && (
                                    <div className="mt-2">
                                        <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors ${uploadingId === item.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={(e) => handleFileChange(e, item.id)}
                                                disabled={uploadingId === item.id}
                                                accept=".pdf,.doc,.docx,.txt"
                                            />
                                            <div className="w-4 h-4">
                                                {uploadingId === item.id ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-700"></div>
                                                ) : (
                                                    <Plus className="w-4 h-4" />
                                                )}
                                            </div>
                                            {uploadingId === item.id ? 'Uploading...' : 'Add MOM'}
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
