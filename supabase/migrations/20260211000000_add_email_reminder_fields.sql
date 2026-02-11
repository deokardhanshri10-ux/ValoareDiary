-- Add email fields for reminder system to Meet Schedule Data table
ALTER TABLE "Meet Schedule Data" 
ADD COLUMN IF NOT EXISTS client_email TEXT,
ADD COLUMN IF NOT EXISTS hosts_emails TEXT, -- Comma-separated emails for hosts/co-hosts
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN "Meet Schedule Data".client_email IS 'Email address of the client for meeting reminders';
COMMENT ON COLUMN "Meet Schedule Data".hosts_emails IS 'Comma-separated email addresses of hosts and co-hosts for meeting reminders';
COMMENT ON COLUMN "Meet Schedule Data".reminder_sent IS 'Flag indicating if reminder email has been sent';
COMMENT ON COLUMN "Meet Schedule Data".reminder_sent_at IS 'Timestamp when reminder email was sent';

-- Create email_reminders tracking table for audit trail
CREATE TABLE IF NOT EXISTS email_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id INTEGER REFERENCES "Meet Schedule Data"(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
    error_message TEXT,
    organisation_id TEXT, -- For RLS filtering
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for email_reminders table
ALTER TABLE email_reminders ENABLE ROW LEVEL SECURITY;

-- Allow users to view email reminders for their organization's meetings
CREATE POLICY "Users can view email reminders for their organization"
ON email_reminders
FOR SELECT
USING (
    organisation_id = current_setting('app.current_user_organisation_id', true)
);

-- Allow system to insert email reminder records (service role key)
CREATE POLICY "System can insert email reminders"
ON email_reminders
FOR INSERT
WITH CHECK (true);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_email_reminders_event_id ON email_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_email_reminders_sent_at ON email_reminders(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_reminders_organisation_id ON email_reminders(organisation_id);
CREATE INDEX IF NOT EXISTS idx_meet_schedule_reminder_pending ON "Meet Schedule Data"(reminder_sent, start_date, start_time) WHERE reminder_sent = FALSE;
\n
