import { Bell, Users, Clock, MapPin, FileText } from 'lucide-react';
import { Event } from '../../types';

interface ReminderModalProps {
    activeReminder: Event | null;
    onClose: () => void;
}

export function ReminderModal({ activeReminder, onClose }: ReminderModalProps) {
    if (!activeReminder) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black bg-opacity-70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform animate-bounce-in">
                <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-5 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-white rounded-full p-2 animate-pulse">
                            <Bell className="w-8 h-8 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Meeting Reminder!</h2>
                            <p className="text-red-50 text-sm">Your meeting is starting soon</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-6 space-y-4">
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="bg-blue-50 rounded-lg p-2">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-500 mb-1">Client</p>
                                <p className="text-lg font-semibold text-gray-900">{activeReminder.clientName}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="bg-purple-50 rounded-lg p-2">
                                <Clock className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-500 mb-1">Time</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {activeReminder.time}
                                    <span className="text-sm text-gray-600 ml-2">
                                        (in {activeReminder.reminder_minutes || 30} minutes)
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="bg-green-50 rounded-lg p-2">
                                <MapPin className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-500 mb-1">Location</p>
                                <p className="text-lg font-semibold text-gray-900">{activeReminder.location}</p>
                            </div>
                        </div>

                        {activeReminder.agenda && (
                            <div className="flex items-start gap-3">
                                <div className="bg-amber-50 rounded-lg p-2">
                                    <FileText className="w-5 h-5 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-500 mb-1">Agenda</p>
                                    <p className="text-sm text-gray-700">{activeReminder.agenda}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            Dismiss
                        </button>
                        {activeReminder.meetingLink && (
                            <a
                                href={activeReminder.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all text-center"
                            >
                                Join Meeting
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
