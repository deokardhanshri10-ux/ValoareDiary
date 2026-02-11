import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Client, ClientNote } from '../../types';
import { AuthUser } from '../../lib/auth';

interface ClientNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
    notes: ClientNote[];
    loading: boolean;
    onAddNote: (content: string) => void;
    onDeleteNote: (id: string) => void;
    user: AuthUser;
}

export function ClientNotesModal({
    isOpen,
    onClose,
    client,
    notes,
    loading,
    onAddNote,
    onDeleteNote,
    user,
}: ClientNotesModalProps) {
    const [newNoteContent, setNewNoteContent] = useState('');

    if (!isOpen || !client) return null;

    const canEdit = user.role === 'manager' || user.role === 'associate_editor';
    const canDelete = user.role === 'manager';

    const handleAdd = () => {
        if (newNoteContent.trim()) {
            onAddNote(newNoteContent);
            setNewNoteContent('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Notes</h2>
                        <p className="text-sm text-gray-600 mt-1">{client.name}</p>
                    </div>
                    <button
                        onClick={() => {
                            onClose();
                            setNewNoteContent('');
                        }}
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
                        onClick={handleAdd}
                        disabled={!newNoteContent.trim()}
                        className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        Add Note
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">All Notes</h3>
                    {loading ? (
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
                                            {new Date(note.created_at).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                            {' at '}
                                            {new Date(note.created_at).toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
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
