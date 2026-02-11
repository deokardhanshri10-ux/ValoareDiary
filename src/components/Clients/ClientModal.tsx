import { useState } from 'react';
import { X, User } from 'lucide-react';
import { AuthUser } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: AuthUser;
    onClientAdded: () => void;
}

export function ClientModal({
    isOpen,
    onClose,
    user,
    onClientAdded,
}: ClientModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleAddClient = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const form = e.currentTarget;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const type = (form.elements.namedItem('type') as HTMLSelectElement).value;

        const { error } = await supabase
            .from('clients')
            .insert({
                name: name,
                type: type,
                organisation_id: user.organisationId
            });

        if (error) {
            console.error('Error adding client:', error);
            alert('Failed to add client. Please try again.');
            setIsSubmitting(false);
            return;
        }

        onClientAdded();
        onClose();
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Add New Client</h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleAddClient} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                            Client Name
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                required
                                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                placeholder="Enter client name"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                            Client Type
                        </label>
                        <select
                            id="type"
                            name="type"
                            required
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        >
                            <option value="holistic">Holistic</option>
                            <option value="mutual_funds">Mutual Funds</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Adding...' : 'Add Client'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
