import { useState } from 'react';
import { X, Upload, FileText, Smartphone, Laptop, Users, Calendar as CalendarIcon, Link as LinkIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { Client, Event } from '../../types';
import { AuthUser } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { formatFileSize } from '../../utils/fileUtils';

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEventAdded: () => void;
    user: AuthUser;
    clients: Client[];
    onShowOAuth: () => void;
}

export function AddEventModal({
    isOpen,
    onClose,
    onEventAdded,
    user,
    clients,
    onShowOAuth
}: AddEventModalProps) {
    const [meetingType, setMeetingType] = useState<'online' | 'face_to_face' | 'on_call'>('online');
    const [showReminderTime, setShowReminderTime] = useState(false);
    const [reminderMinutes, setReminderMinutes] = useState('30');
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Controlled inputs for meeting link generation
    const [clientName, setClientName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [meetingLink, setMeetingLink] = useState('');
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);

    // Email fields
    const [clientEmail, setClientEmail] = useState('');
    const [hostsEmail, setHostsEmail] = useState('');

    if (!isOpen) return null;

    const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setAttachmentFiles([...attachmentFiles, ...filesArray]);
        }
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachmentFiles(attachmentFiles.filter((_, i) => i !== index));
    };

    const generateMeetingLink = async () => {
        setIsGeneratingLink(true);

        try {
            const title = clientName || 'Meeting';
            let startDateTime = '';

            if (startDate && startTime) {
                startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
            }

            const requestBody = {
                organisation_id: user.organisationId,
                title,
                start_time: startDateTime || undefined,
            };

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-meet-link`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                if (data.needsAuth) {
                    onShowOAuth();
                } else {
                    console.error('Edge function error:', data);
                    throw new Error(data.error || 'Failed to generate meeting link');
                }
            } else {
                setMeetingLink(data.meetLink);
            }
        } catch (error) {
            console.error('Error generating meeting link:', error);
            alert('Failed to generate meeting link. Please try again or enter one manually.');
        } finally {
            setIsGeneratingLink(false);
        }
    };

    const handleAddEvent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);

        const alertType = formData.get('alertType') as string;
        const repeatEvent = formData.get('repeatEvent') === 'on';

        const supabaseData = {
            name: clientName,
            client_name: clientName,
            meeting_type: meetingType,
            is_online: meetingType === 'online' || meetingType === 'on_call',
            start_date: startDate,
            start_time: startTime,
            location: meetingType === 'online'
                ? 'Online'
                : meetingType === 'on_call'
                    ? 'On Call'
                    : (formData.get('location') as string),
            agenda: formData.get('agenda') as string,
            meeting_link: meetingType === 'online'
                ? meetingLink
                : null,
            repeat_event: repeatEvent,
            alert_type: alertType || 'none',
            reminder_minutes: alertType === 'remind' ? parseInt(reminderMinutes) : 30,
            meeting_mode: 'audio',
            organisation_id: user.organisationId,
            created_by_id: user.id,
            created_by_name: user.fullName,
        };

        const { data, error } = await supabase
            .from('Meet Schedule Data')
            .insert([supabaseData])
            .select()
            .maybeSingle();

        if (error) {
            console.error('Error adding event:', error);
            alert('Failed to add event. Please try again.');
            setIsSubmitting(false);
            return;
        }

        if (data) {
            // Upload attachments if any
            if (attachmentFiles.length > 0) {
                const uploadedAttachments = [];

                for (const file of attachmentFiles) {
                    const fileExt = file.name.split('.').pop();
                    const randomString = Math.random().toString(36).substring(2, 15);
                    const fileName = `${user.organisationId}/${data.id}_${Date.now()}_${randomString}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('meeting-attachments')
                        .upload(fileName, file);

                    if (uploadError) {
                        console.error('Error uploading attachment:', uploadError);
                        alert(`Failed to upload ${file.name}. Please try again.`);
                        continue;
                    }

                    uploadedAttachments.push({
                        name: file.name,
                        path: fileName,
                        size: file.size,
                        uploadedAt: new Date().toISOString()
                    });
                }

                // Update the event with attachment metadata
                if (uploadedAttachments.length > 0) {
                    const { error: updateError } = await supabase
                        .from('Meet Schedule Data')
                        .update({ attachments: uploadedAttachments })
                        .eq('id', data.id);

                    if (updateError) {
                        console.error('Error updating event with attachments:', updateError);
                    }
                }
            }

            onEventAdded();
        }

        resetForm();
    };

    const resetForm = () => {
        onClose();
        setMeetingType('online');
        setShowReminderTime(false);
        setReminderMinutes('30');
        setAttachmentFiles([]);
        setClientName('');
        setStartDate('');
        setStartTime('');
        setMeetingLink('');
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Schedule New Meeting</h2>
                    <button
                        onClick={resetForm}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleAddEvent} className="px-6 py-6 space-y-5">
                    <div className="flex gap-4 mb-4">
                        <button
                            type="button"
                            onClick={() => setMeetingType('online')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${meetingType === 'online'
                                ? 'bg-amber-50 border-amber-500 text-amber-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <Laptop className="w-4 h-4" />
                            Online
                        </button>
                        <button
                            type="button"
                            onClick={() => setMeetingType('face_to_face')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${meetingType === 'face_to_face'
                                ? 'bg-amber-50 border-amber-500 text-amber-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            Face to Face
                        </button>
                        <button
                            type="button"
                            onClick={() => setMeetingType('on_call')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${meetingType === 'on_call'
                                ? 'bg-amber-50 border-amber-500 text-amber-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <Smartphone className="w-4 h-4" />
                            On Call
                        </button>
                    </div>

                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                            Client Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            list="clientsList"
                            required
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="Select or enter client name"
                        />
                        <datalist id="clientsList">
                            {clients.map((client) => (
                                <option key={client.id} value={client.name} />
                            ))}
                        </datalist>
                    </div>

                    <div>
                        <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 mb-2">
                            Mail Client
                        </label>
                        <input
                            type="email"
                            name="clientEmail"
                            id="clientEmail"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="client@example.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="hostsEmail" className="block text-sm font-medium text-gray-700 mb-2">
                            Mail Hosts / Co-hosts
                        </label>
                        <input
                            type="email"
                            name="hostsEmail"
                            id="hostsEmail"
                            value={hostsEmail}
                            onChange={(e) => setHostsEmail(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="host@example.com, cohost@example.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                                Date
                            </label>
                            <input
                                type="date"
                                name="startDate"
                                id="startDate"
                                required
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
                                Time
                            </label>
                            <input
                                type="time"
                                name="startTime"
                                id="startTime"
                                required
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {meetingType === 'online' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Meeting Link
                            </label>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <LinkIcon className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="url"
                                            name="meetingLink"
                                            value={meetingLink}
                                            onChange={(e) => setMeetingLink(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                            placeholder="https://meet.google.com/..."
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={generateMeetingLink}
                                        disabled={isGeneratingLink}
                                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isGeneratingLink ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CalendarIcon className="w-4 h-4" />
                                        )}
                                        Generate
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Click generate to create a Google Meet link. Requires Google account connection.
                                </p>
                            </div>
                        </div>
                    )}

                    {meetingType === 'face_to_face' && (
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                                Location
                            </label>
                            <input
                                type="text"
                                name="location"
                                id="location"
                                required
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                placeholder="Enter meeting location"
                            />
                        </div>
                    )}

                    <div>
                        <label htmlFor="alertType" className="block text-sm font-medium text-gray-700 mb-2">
                            Alert Type
                        </label>
                        <select
                            name="alertType"
                            id="alertType"
                            onChange={(e) => setShowReminderTime(e.target.value === 'remind')}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        >
                            <option value="none">No Alert</option>
                            <option value="notify">Just Notify</option>
                            <option value="remind">Remind Before</option>
                        </select>
                    </div>

                    {showReminderTime && (
                        <div>
                            <label htmlFor="reminderMinutes" className="block text-sm font-medium text-gray-700 mb-2">
                                Reminder Time (minutes before)
                            </label>
                            <input
                                type="number"
                                id="reminderMinutes"
                                value={reminderMinutes}
                                onChange={(e) => setReminderMinutes(e.target.value)}
                                min="5"
                                step="5"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                        </div>
                    )}

                    <div>
                        <label htmlFor="agenda" className="block text-sm font-medium text-gray-700 mb-2">
                            Agenda
                        </label>
                        <textarea
                            name="agenda"
                            id="agenda"
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                            placeholder="Meeting agenda..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Attachments
                        </label>
                        <div className="space-y-3">
                            <label className="flex flex-col items-center justify-center gap-2 px-6 py-4 text-sm font-medium text-gray-600 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl hover:border-amber-400 hover:bg-amber-50/50 transition-all cursor-pointer group">
                                <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md transition-shadow">
                                    <Upload className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transition-colors" />
                                </div>
                                <span className="text-gray-700 group-hover:text-amber-700 transition-colors">
                                    Upload files
                                </span>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleAttachmentChange}
                                    className="hidden"
                                />
                            </label>

                            {attachmentFiles.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-gray-600">Selected files ({attachmentFiles.length})</p>
                                    {attachmentFiles.map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg"
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
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
                                                type="button"
                                                onClick={() => handleRemoveAttachment(index)}
                                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Scheduling...' : 'Schedule Meeting'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
