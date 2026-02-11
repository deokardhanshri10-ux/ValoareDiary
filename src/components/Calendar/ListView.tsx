import { Event } from '../../types';
import { Clock, MapPin, Video, Phone } from 'lucide-react';

interface ListViewProps {
    events: Event[];
    onSelectEvent: (event: Event) => void;
}

export function ListView({ events, onSelectEvent }: ListViewProps) {
    // Group events by date
    const eventsByDate = events.reduce((acc, event) => {
        const dateStr = event.date.toDateString();
        if (!acc[dateStr]) {
            acc[dateStr] = [];
        }
        acc[dateStr].push(event);
        return acc;
    }, {} as Record<string, Event[]>);

    // Sort dates
    const sortedDates = Object.keys(eventsByDate).sort((a, b) =>
        new Date(a).getTime() - new Date(b).getTime()
    );

    if (events.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500">No upcoming events scheduled</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {sortedDates.map((dateStr) => (
                <div key={dateStr} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-900">
                            {new Date(dateStr).toLocaleDateString(undefined, {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {eventsByDate[dateStr]
                            .sort((a, b) => a.time.localeCompare(b.time))
                            .map((event) => (
                                <div
                                    key={event.id}
                                    onClick={() => onSelectEvent(event)}
                                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-lg ${event.color} bg-opacity-10`}>
                                                {event.isOnline ? (
                                                    <Video className={`w-6 h-6 ${event.color.replace('bg-', 'text-').replace('text-white', '')}`} />
                                                ) : event.location === 'On Call' ? (
                                                    <Phone className={`w-6 h-6 ${event.color.replace('bg-', 'text-').replace('text-white', '')}`} />
                                                ) : (
                                                    <Clock className={`w-6 h-6 ${event.color.replace('bg-', 'text-').replace('text-white', '')}`} />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
                                                    {event.title}
                                                </h4>
                                                <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-gray-500">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-4 h-4" />
                                                        {event.time}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="w-4 h-4" />
                                                        {event.location}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`px-3 py-1 rounded-full text-xs font-medium self-start sm:self-center ${event.alert_type === 'remind'
                                                ? 'bg-amber-100 text-amber-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {event.alert_type === 'remind' ? 'Reminder Set' : 'No Reminder'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
