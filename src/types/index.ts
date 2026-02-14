export interface Event {
  id: string;
  title: string;
  clientName: string;
  date: Date;
  time: string;
  endTime?: string;
  location: string;
  agenda?: string;
  meetingLink?: string;
  isOnline: boolean;
  color: string;
  momFiles?: { name: string; path: string; size: number; uploadedAt?: string }[];
  attachments?: { name: string; path: string; size: number; uploadedAt?: string }[];
  alert_type?: string;
  reminder_minutes?: number;
  historyId?: string;
  created_by_name?: string;
  created_by_id?: string;
}

export interface Payment {
  id: string;
  client_name: string;
  amount: number;
  amounts?: number[];
  due_dates: string[];
  frequency: string;
  payment_method: string;
  payment_status: { [key: string]: string };
  created_at: string;
  comments?: string;
  created_by_name?: string;
  created_by_id?: string;
}

export interface Client {
  id: string;
  name: string;
  type: 'mutual_funds' | 'holistic';
  created_at: string;
  organisation_id?: string;
}

export interface HistoryItem {
  id: string;
  original_event_id: string;
  client_name: string;
  start_date: string;
  start_time: string;
  end_time?: string;
  location: string;
  agenda: string;
  is_online?: boolean;
  meeting_type?: 'online' | 'in_person' | 'on_call' | 'facetoface';
  meeting_link?: string;
  mom_files?: { name: string; path: string; size: number; uploadedAt?: string }[];
  attachments?: { name: string; path: string; size: number; uploadedAt?: string }[];
  created_at: string;
  created_by_name?: string;
  created_by_id?: string;
}
