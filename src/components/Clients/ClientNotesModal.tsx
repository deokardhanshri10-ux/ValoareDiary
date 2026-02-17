import React, { useState } from 'react';
import { X, Plus, Trash2, Calendar, User } from 'lucide-react';
import { ClientNote } from '../../types';
import { AuthUser } from '../../lib/auth';

interface ClientNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientName: string;
    notes: ClientNote[];
    onAddNote: (content: string) => Promise<void>;
    onDeleteNote: (noteId: string) => void;
    userRole?: string; // Add userRole prop for RBAC
    user: AuthUser | null;
}

export const ClientNotesModal: React.FC<ClientNotesModalProps> = ({
    isOpen,
    onClose,
    clientName,
    notes,
    onAddNote,
    onDeleteNote,
    userRole,
    user
}) => {
    // console.log('ClientNotesModal render. Notes:', notes);
    const [newNote, setNewNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Determine if user has permission to add/delete notes
    // Viewer roles cannot modify notes
    const canModify = userRole !== 'associate-viewer';

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newNote.trim()) {
            setIsSubmitting(true);
            try {
                await onAddNote(newNote.trim());
                setNewNote('');
            } catch (error) {
                console.error('Failed to add note:', error);
                alert('Failed to save note. Please try again.');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Notes - {clientName}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {notes.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            No notes yet. Add one below!
                        </div>
                    ) : (
                        notes.map((note) => (
                            <div key={note.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                        <span className="flex items-center">
                                            <Calendar size={14} className="mr-1" />
                                            {formatDate(note.created_at)}
                                        </span>
                                        <span className="flex items-center">
                                            <User size={14} className="mr-1" />
                                            {note.created_by_name || 'Unknown User'}
                                        </span>
                                    </div>
                                    {canModify && (note.created_by_id === user?.id || userRole === 'admin' || userRole === 'super-admin') && (
                                        <button
                                            onClick={() => onDeleteNote(note.id)}
                                            className="text-red-500 hover:text-red-700 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete note"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap">{note.note_content}</p>
                            </div>
                        ))
                    )}
                </div>

                {canModify && (
                    <div className="p-6 border-t bg-gray-50">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Type a new note..."
                                disabled={isSubmitting}
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2 border disabled:bg-gray-100 disabled:text-gray-500"
                            />
                            <button
                                type="submit"
                                disabled={!newNote.trim() || isSubmitting}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {isSubmitting ? (
                                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span>
                                ) : (
                                    <Plus size={20} className="mr-1" />
                                )}
                                Add Note
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};
