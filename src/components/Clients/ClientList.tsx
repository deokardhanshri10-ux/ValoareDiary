import { useState } from 'react';
import { Users, Plus, Trash2, Search, X, FileSpreadsheet } from 'lucide-react';
import { Client, Event as AppEvent } from '../../types';
import { AuthUser } from '../../lib/auth';

interface ClientListProps {
    clients: Client[];
    events: AppEvent[];
    loading: boolean;
    user: AuthUser;
    onSelectClient: (client: Client) => void;
    onDeleteClient: (id: string) => void;
    onAddClient: () => void;
    onImportClients: () => void;
}

export function ClientList({
    clients,
    events,
    loading,
    user,
    onSelectClient,
    onDeleteClient,
    onAddClient,
    onImportClients,
}: ClientListProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const canEdit = user.role === 'manager' || user.role === 'associate_editor';
    const canDelete = user.role === 'manager';

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h3 className="text-xl font-semibold text-gray-900">Clients</h3>

                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative flex-1 sm:min-w-[200px]">
                            <input
                                type="text"
                                placeholder="Search clients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {canEdit && (
                            <>
                                <button
                                    onClick={onImportClients}
                                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    <span className="hidden sm:inline">Import Clients</span>
                                    <span className="sm:hidden">Import</span>
                                </button>
                                <button
                                    onClick={onAddClient}
                                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Add Client</span>
                                    <span className="sm:hidden">Add</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="divide-y divide-gray-200">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                        <p className="text-gray-500 text-sm mt-3">Loading clients...</p>
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm mb-4">
                            {searchTerm ? 'No clients found matching search' : 'No clients added yet'}
                        </p>
                        {canEdit && (
                            <button
                                onClick={onAddClient}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add Your First Client
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredClients.map((client) => (
                                <div
                                    key={client.id}
                                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h4
                                            className="text-base font-semibold text-gray-900 hover:text-amber-600 transition-colors cursor-pointer"
                                            onClick={() => onSelectClient(client)}
                                        >
                                            {client.name}
                                        </h4>
                                        {canDelete && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteClient(client.id);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                aria-label="Delete client"
                                                title="Delete client"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <div
                                        className="flex items-center gap-2 cursor-pointer mt-1"
                                        onClick={() => onSelectClient(client)}
                                    >
                                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${client.type === 'mutual_funds'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-green-100 text-green-700'
                                            }`}>
                                            {client.type === 'mutual_funds' ? 'Mutual Funds' : 'Holistic'}
                                        </span>
                                    </div>

                                    {/* Next Meeting Indicator */}
                                    {(() => {
                                        const nextMeeting = events
                                            .filter(e => {
                                                if (e.clientName !== client.name) return false;
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
                                            })[0];

                                        if (nextMeeting) {
                                            return (
                                                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                                    <div className="font-medium">Next:</div>
                                                    <div>
                                                        {new Date(nextMeeting.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {nextMeeting.time}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {clients.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <p className="text-sm text-gray-600 text-center">
                        Showing {clients.length} client{clients.length !== 1 ? 's' : ''}
                    </p>
                </div>
            )}
        </div>
    );
}
