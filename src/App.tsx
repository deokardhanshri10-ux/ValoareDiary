import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, List, Plus, IndianRupee, Menu, X } from 'lucide-react';
import { UserManagement } from './components/UserManagement';
import { ChangePassword } from './components/ChangePassword';
import { GoogleOAuth } from './components/GoogleOAuth';
import { ActivityLog } from './components/ActivityLog';
import { UserMenu } from './components/AuthenticatedApp';

import { CalendarView } from './components/Calendar/CalendarView';
import { ListView } from './components/Calendar/ListView';
import { PaymentList } from './components/Payments/PaymentList';
import { ClientList } from './components/Clients/ClientList';
import { HistoryView } from './components/History/HistoryView';
import { EventModal } from './components/Events/EventModal';
import { AddEventModal } from './components/Events/AddEventModal';
import { RescheduleModal } from './components/Events/RescheduleModal';
import { PaymentModal } from './components/Payments/PaymentModal';
import { ClientModal } from './components/Clients/ClientModal';
import { ClientImportModal } from './components/Clients/ClientImportModal';
import { ClientDetailsModal } from './components/Clients/ClientDetailsModal';


import { useEvents } from './hooks/useEvents';
import { usePayments } from './hooks/usePayments';
import { useClients } from './hooks/useClients';
import { useHistory } from './hooks/useHistory';
import { Event, Payment, Client } from './types';
import { AuthUser } from './lib/auth';
import { monthNames } from './utils/dateUtils';

interface AppProps {
  user: AuthUser;
  onShowUserManagement: () => void;
  onCloseUserManagement: () => void;
  showUserManagement: boolean;
  onShowActivityLog: () => void;
  showActivityLog: boolean;
  onCloseActivityLog: () => void;
  onShowChangePassword: () => void;
  showChangePassword: boolean;
  onCloseChangePassword: () => void;
  onShowGoogleOAuth: () => void;
  showGoogleOAuth: boolean;
  onCloseGoogleOAuth: () => void;
  onSignOut: () => void;
}

export default function App({
  user,
  onShowUserManagement,
  onCloseUserManagement,
  showUserManagement,
  onShowActivityLog,
  showActivityLog,
  onCloseActivityLog,
  onShowChangePassword,
  showChangePassword,
  onCloseChangePassword,
  onShowGoogleOAuth,
  showGoogleOAuth,
  onCloseGoogleOAuth,
  onSignOut
}: AppProps) {
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'history' | 'payments' | 'clients'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modals state
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [eventToReschedule, setEventToReschedule] = useState<Event | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showClientImportModal, setShowClientImportModal] = useState(false);
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<Client | null>(null);

  const [showOAuthForMeetLink, setShowOAuthForMeetLink] = useState(false);
  const [pendingMeetLinkGeneration, setPendingMeetLinkGeneration] = useState(false);

  // Hooks
  const {
    events,
    loadEvents,
    deleteEvent
  } = useEvents(user);

  const {
    payments,
    loading: paymentsLoading,
    loadPayments,
    deletePayment,
    togglePaymentStatus
  } = usePayments(user);

  const {
    clients,
    loading: clientsLoading,
    loadClients,
    deleteClient
  } = useClients(user);

  const {
    history,
    loading: historyLoading,
    loadHistory,
    movePastEventsToHistory,
    uploadMOM
  } = useHistory(user);

  // Load initial data
  useEffect(() => {
    // Hooks handle loading now
  }, [user]);

  useEffect(() => {
    if (user && viewMode === 'history') {
      movePastEventsToHistory().then(() => {
        loadHistory();
      });
    }
  }, [user, viewMode]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modals */}
      <EventModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onReschedule={(event) => {
          setEventToReschedule(event);
          setShowRescheduleModal(true);
          setSelectedEvent(null);
        }}
        onDelete={async (eventId) => {
          await deleteEvent(eventId);
          setSelectedEvent(null);
        }}
        user={user}
        onEventUpdated={() => loadEvents(false)}
      />

      <AddEventModal
        isOpen={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        onEventAdded={() => loadEvents(false)}
        user={user}
        clients={clients}
        onShowOAuth={() => {
          setPendingMeetLinkGeneration(true);
          setShowOAuthForMeetLink(true);
        }}
      />

      <PaymentModal
        isOpen={showPaymentModal || !!editingPayment}
        onClose={() => {
          setShowPaymentModal(false);
          setEditingPayment(null);
        }}
        payment={editingPayment}
        user={user}
        clients={clients}
        onPaymentUpdated={loadPayments}
      />

      <ClientModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        user={user}
        onClientAdded={loadClients}
      />

      <ClientImportModal
        isOpen={showClientImportModal}
        onClose={() => setShowClientImportModal(false)}
        user={user}
        onClientsImported={loadClients}
      />

      <ClientDetailsModal
        isOpen={!!selectedClientForDetails}
        onClose={() => setSelectedClientForDetails(null)}
        client={selectedClientForDetails}
        events={events}
        history={history}
        payments={payments}
      />



      <RescheduleModal
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false);
          setEventToReschedule(null);
        }}
        event={eventToReschedule}
        onEventUpdated={() => {
          loadEvents(false);
          setShowRescheduleModal(false);
          setEventToReschedule(null);
        }}
        user={user}
      />

      {showUserManagement && (
        <UserManagement user={user} onClose={onCloseUserManagement} />
      )}
      {showChangePassword && (
        <ChangePassword user={user} onClose={onCloseChangePassword} />
      )}
      {showActivityLog && (
        <ActivityLog user={user} onClose={onCloseActivityLog} />
      )}

      {showGoogleOAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Google Integration</h2>
              <button
                onClick={onCloseGoogleOAuth}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <GoogleOAuth />
            </div>
          </div>
        </div>
      )}

      {showOAuthForMeetLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Connect Google Account</h2>
              <button
                onClick={() => {
                  setShowOAuthForMeetLink(false);
                  setPendingMeetLinkGeneration(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  To generate Google Meet links, you need to connect your Google account. After connecting, the meeting link will be generated automatically.
                </p>
              </div>
              <GoogleOAuth />
            </div>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <button
                onClick={() => setViewMode('calendar')}
                className="text-lg font-semibold text-gray-900 hover:text-amber-600 transition-colors"
              >
                Valoare Diary
              </button>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => setViewMode('clients')}
                className={`text-sm transition-colors ${viewMode === 'clients' ? 'text-amber-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Clients
              </button>
              <button
                onClick={() => setViewMode('payments')}
                className={`text-sm transition-colors ${viewMode === 'payments' ? 'text-amber-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Payments
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`text-sm transition-colors ${viewMode === 'history' ? 'text-amber-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
              >
                History
              </button>

              <UserMenu
                user={user}
                onShowUserManagement={onShowUserManagement}
                onShowActivityLog={onShowActivityLog}
                onShowChangePassword={onShowChangePassword}
                onShowGoogleOAuth={onShowGoogleOAuth}
                onSignOut={onSignOut}
              />
            </div>

            <div className="md:hidden">
              <button className="text-gray-600">
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {viewMode !== 'history' && viewMode !== 'payments' && viewMode !== 'clients' && (
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Schedule Meeting
            </h2>
            {(user.role === 'manager' || user.role === 'associate-editor') && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setShowAddEventModal(true)}
                  className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  Add Meeting
                </button>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                >
                  <IndianRupee className="w-5 h-5" />
                  Schedule Payments
                </button>
              </div>
            )}
          </div>
        )}

        {viewMode !== 'history' && viewMode !== 'payments' && viewMode !== 'clients' && (
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h3 className="text-lg font-semibold text-gray-900 min-w-[160px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Calendar className="w-4 h-4" />
                <span>Month</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
                <span>List</span>
              </button>
            </div>
          </div>
        )}

        {viewMode === 'calendar' && (
          <CalendarView
            currentDate={currentDate}
            events={events}
            payments={payments}
            user={user}
            onSelectEvent={setSelectedEvent}
            onTogglePaymentStatus={togglePaymentStatus}
          />
        )}

        {viewMode === 'list' && (
          <ListView
            events={events}
            onSelectEvent={setSelectedEvent}
          />
        )}

        {viewMode === 'history' && (
          <HistoryView
            history={history}
            loading={historyLoading}
            user={user}
            onUploadMOM={uploadMOM}
          />
        )}

        {viewMode === 'payments' && (
          <PaymentList
            payments={payments}
            loading={paymentsLoading}
            onEdit={setEditingPayment}
            onDelete={deletePayment}
            onToggleStatus={togglePaymentStatus}
            user={user}
          />
        )}

        {viewMode === 'clients' && (
          <ClientList
            clients={clients}
            events={events}
            loading={clientsLoading}
            onAddClient={() => setShowClientModal(true)}
            onImportClients={() => setShowClientImportModal(true)}
            onDeleteClient={deleteClient}
            user={user}
            onSelectClient={(client) => {
              setSelectedClientForDetails(client);
            }}
          />
        )}
      </main>
    </div>
  );
}
