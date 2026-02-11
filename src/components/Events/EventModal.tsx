import { useState } from 'react';
import { X, Clock, Trash2, ExternalLink, Download, Upload, FileText, Link as LinkIcon } from 'lucide-react';
import { Event } from '../../types';
import { AuthUser } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { formatFileSize, formatUploadDate, getFileTypeIcon } from '../../utils/fileUtils';

interface EventModalProps {
    event: Event | null;
    onClose: () => void;
    onReschedule: (event: Event) => void;
    onDelete: (id: string) => void;
    user: AuthUser;
    onEventUpdated: () => void;
}

export function EventModal({
    event,
    onClose,
    onReschedule,
    onDelete,
    user,
    onEventUpdated,
}: EventModalProps) {
    const [momFiles, setMomFiles] = useState<File[]>([]);

    if (!event) return null;

    const canEdit = user.role === 'manager' || user.role === 'associate_editor';
    const canDelete = user.role === 'manager';

    const now = new Date();
    const eventDateTime = new Date(event.date);
    const [hours, minutes] = event.time.split(':').map(Number);
    eventDateTime.setHours(hours, minutes, 0, 0);
    const isPastEvent = eventDateTime < now;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setMomFiles([...momFiles, ...filesArray]);
        }
    };

    const handleRemoveFile = (index: number) => {
        setMomFiles(momFiles.filter((_, i) => i !== index));
    };

    const handleViewAttachment = async (filePath: string, fileName: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('meeting-attachments')
                .createSignedUrl(filePath, 3600);

            if (error) {
                console.error('Error getting file URL:', error);
                alert('Failed to load file. Please try again.');
                return;
            }

            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (error) {
            console.error('Error in handleViewAttachment:', error);
            alert('An error occurred. Please try again.');
        }
    };

    const handleDownloadAttachment = async (filePath: string, fileName: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('meeting-attachments')
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
            console.error('Error in handleDownloadAttachment:', error);
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
                alert('Failed to load file. Please try again.');
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

    const handleDeleteMOMFile = async (filePath: string, fileName: string) => {
        if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            let historyRecord;
            const historyId = (event as any).historyId; // Use type assertion or update type

            if (historyId) {
                const { data, error: findError } = await supabase
                    .from('meeting_history')
                    .select('id, mom_files')
                    .eq('id', parseInt(historyId))
                    .maybeSingle();

                if (findError) throw findError;
                historyRecord = data;
            } else {
                const { data, error: findError } = await supabase
                    .from('meeting_history')
                    .select('id, mom_files')
                    .eq('original_event_id', parseInt(event.id))
                    .maybeSingle();

                if (findError) throw findError;
                historyRecord = data;
            }

            if (!historyRecord) {
                alert('Meeting history not found.');
                return;
            }

            const { error: deleteError } = await supabase.storage
                .from('mom-files')
                .remove([filePath]);

            if (deleteError) {
                console.error('Error deleting file from storage:', deleteError);
                alert('Failed to delete file from storage. Please try again.');
                return;
            }

            const existingFiles = historyRecord.mom_files || [];
            const updatedFiles = existingFiles.filter((file: { path: string }) => file.path !== filePath);

            const { error: updateError } = await supabase
                .from('meeting_history')
                .update({ mom_files: updatedFiles })
                .eq('id', historyRecord.id);

            if (updateError) {
                console.error('Error updating history record:', updateError);
                alert('Failed to update meeting history. Please try again.');
                return;
            }

            alert('File deleted successfully!');
            onEventUpdated();
            onClose();
        } catch (error) {
            console.error('Error in handleDeleteMOMFile:', error);
            alert('An error occurred. Please try again.');
        }
    };

    const handleAddMOM = async () => {
        if (!event || momFiles.length === 0) return;

        try {
            let historyRecord;
            const historyId = (event as any).historyId;

            if (historyId) {
                const { data, error: findError } = await supabase
                    .from('meeting_history')
                    .select('id, mom_files')
                    .eq('id', parseInt(historyId))
                    .maybeSingle();

                if (findError) throw findError;
                historyRecord = data;
            } else {
                const { data, error: findError } = await supabase
                    .from('meeting_history')
                    .select('id, mom_files')
                    .eq('original_event_id', parseInt(event.id))
                    .maybeSingle();

                if (findError) throw findError;
                historyRecord = data;
            }

            if (!historyRecord) {
                alert('This meeting has not been moved to history yet.');
                return;
            }

            const uploadedFiles = [];

            for (const file of momFiles) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${historyRecord.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('mom-files')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Error uploading file:', uploadError);
                    alert(`Failed to upload ${file.name}. Please try again.`);
                    return;
                }

                uploadedFiles.push({
                    name: file.name,
                    path: filePath,
                    size: file.size,
                    uploadedAt: new Date().toISOString()
                });
            }

            const existingFiles = historyRecord.mom_files || [];
            const updatedFiles = [...existingFiles, ...uploadedFiles];

            const { error: updateError } = await supabase
                .from('meeting_history')
                .update({ mom_files: updatedFiles })
                .eq('id', historyRecord.id);

            if (updateError) {
                console.error('Error updating history record:', updateError);
                alert('Failed to update meeting history. Please try again.');
                return;
            }

            alert(`Successfully added ${momFiles.length} file(s) to Minutes of Meeting!`);
            setMomFiles([]);
            onEventUpdated();
            onClose();
        } catch (error) {
            console.error('Error in handleAddMOM:', error);
            alert('An error occurred. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Event Details</h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-6 space-y-5">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">
                            {event.clientName}
                        </h3>
                        <p className="text-sm text-gray-500">{event.title}</p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <span className="text-sm font-medium text-gray-500">Date</span>
                            <p className="text-sm text-gray-900 mt-1">
                                {event.date.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </p>
                        </div>

                        <div>
                            <span className="text-sm font-medium text-gray-500">Time</span>
                            <p className="text-sm text-gray-900 mt-1">{event.time}</p>
                        </div>

                        <div>
                            <span className="text-sm font-medium text-gray-500">Location</span>
                            <p className="text-sm text-gray-900 mt-1">{event.location}</p>
                        </div>

                        {event.isOnline && event.meetingLink && (
                            <div>
                                <span className="text-sm font-medium text-gray-500">Meeting Link</span>
                                <a
                                    href={event.meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 mt-1 group"
                                >
                                    <LinkIcon className="w-4 h-4" />
                                    <span className="group-hover:underline">Join online meeting</span>
                                </a>
                            </div>
                        )}

                        {event.agenda && (
                            <div>
                                <span className="text-sm font-medium text-gray-500">Agenda</span>
                                <p className="text-sm text-gray-900 mt-1 leading-relaxed">
                                    {event.agenda}
                                </p>
                            </div>
                        )}

                        <div>
                            <span className="text-sm font-medium text-gray-500">Created by</span>
                            <p className="text-sm text-gray-900 mt-1">
                                {event.created_by_name || 'Not tracked'}
                            </p>
                        </div>

                        {event.attachments && event.attachments.length > 0 && (
                            <div className="border-t border-gray-200 pt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Attachments ({event.attachments.length})
                                </label>
                                <div className="space-y-2">
                                    {event.attachments.map((file, index) => (
                                        <div
                                            key={index}
                                            className="group bg-gray-50 border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-blue-100 rounded-lg">
                                                    {getFileTypeIcon(file.name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {file.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                        <span>{formatFileSize(file.size)}</span>
                                                        <span>•</span>
                                                        <span>{formatUploadDate(file.uploadedAt)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleViewAttachment(file.path, file.name)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View file"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadAttachment(file.path, file.name)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Download file"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isPastEvent && (
                            <div className="border-t border-gray-200 pt-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Minutes of Meeting (MOM)
                                    </label>

                                    {/* Show existing MOM files */}
                                    {event.momFiles && event.momFiles.length > 0 && (
                                        <div className="space-y-3 mb-4">
                                            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                <FileText className="w-4 h-4" />
                                                Uploaded Files ({event.momFiles.length})
                                            </h4>
                                            <div className="grid gap-3">
                                                {event.momFiles.map((file, index) => (
                                                    <div
                                                        key={index}
                                                        className="group bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-md transition-all duration-200"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2.5 bg-amber-100 rounded-lg">
                                                                {getFileTypeIcon(file.name)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h5 className="text-sm font-semibold text-gray-900 truncate mb-1">
                                                                    {file.name}
                                                                </h5>
                                                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                                                    <span className="flex items-center gap-1">
                                                                        <span className="font-medium">{formatFileSize(file.size)}</span>
                                                                    </span>
                                                                    {file.uploadedAt && (
                                                                        <>
                                                                            <span className="text-gray-300">•</span>
                                                                            <span>{formatUploadDate(file.uploadedAt)}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                                            <button
                                                                onClick={() => handleViewMOMFile(file.path, file.name)}
                                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                                                                title="Open file"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                                Open
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadMOMFile(file.path, file.name)}
                                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                                                                title="Download file"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                                Download
                                                            </button>
                                                            {canDelete && (
                                                                <button
                                                                    onClick={() => handleDeleteMOMFile(file.path, file.name)}
                                                                    className="flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                                    title="Delete file"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Upload new files section */}
                                    {canEdit && (
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold text-gray-700">Add New Files</h4>
                                            <label className="flex flex-col items-center justify-center gap-2 px-6 py-8 text-sm font-medium text-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl hover:border-amber-400 hover:bg-amber-50/50 transition-all cursor-pointer group">
                                                <div className="p-3 bg-white rounded-full shadow-sm group-hover:shadow-md transition-shadow">
                                                    <Upload className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition-colors" />
                                                </div>
                                                <span className="text-gray-700 group-hover:text-amber-700 transition-colors">
                                                    Click to upload or drag files here
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    PDF, DOC, DOCX, TXT, JPG, PNG (Max 10MB)
                                                </span>
                                                <input
                                                    type="file"
                                                    multiple
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                                                />
                                            </label>
                                            {momFiles.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-medium text-gray-600">Ready to upload ({momFiles.length})</p>
                                                    {momFiles.map((file, index) => (
                                                        <div
                                                            key={index}
                                                            className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                                                        >
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm text-gray-900 truncate font-medium">
                                                                        {file.name}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {formatFileSize(file.size)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemoveFile(index)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                title="Remove file"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
                    {isPastEvent ? (
                        canEdit && (
                            <button
                                onClick={handleAddMOM}
                                disabled={momFiles.length === 0}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${momFiles.length === 0
                                        ? 'text-gray-400 bg-gray-200 cursor-not-allowed'
                                        : 'text-white bg-amber-600 hover:bg-amber-700'
                                    }`}
                            >
                                <FileText className="w-4 h-4" />
                                Add MOM ({momFiles.length})
                            </button>
                        )
                    ) : (
                        <>
                            {canEdit && (
                                <button
                                    onClick={() => onReschedule(event)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <Clock className="w-4 h-4" />
                                    Reschedule
                                </button>
                            )}
                            {canDelete && (
                                <button
                                    onClick={() => onDelete(event.id)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Event
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
