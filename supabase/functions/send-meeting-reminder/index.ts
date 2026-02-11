import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Helper function to create RFC 2822 email format
function createEmailMessage(to: string, subject: string, htmlBody: string, textBody: string): string {
    const messageParts = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="boundary123"`,
        ``,
        `--boundary123`,
        `Content-Type: text/plain; charset="UTF-8"`,
        ``,
        textBody,
        ``,
        `--boundary123`,
        `Content-Type: text/html; charset="UTF-8"`,
        ``,
        htmlBody,
        ``,
        `--boundary123--`,
    ];

    const message = messageParts.join('\r\n');
    // Base64url encode
    return btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Generate HTML email template
function generateEmailHTML(meeting: any): string {
    const meetingTypeLabel = {
        online: 'Online Meeting',
        on_call: 'Phone Call',
        face_to_face: 'In-Person Meeting'
    }[meeting.meeting_type] || 'Meeting';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; }
    .header p { margin: 0; font-size: 16px; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .badge { display: inline-block; padding: 4px 12px; background: #374151; color: white; border-radius: 4px; font-size: 12px; margin-top: 5px; }
    .button { display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .detail { margin: 15px 0; }
    .label { font-weight: bold; color: #6b7280; }
    .value { color: #111827; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Meeting Reminder</h1>
      <p>Your meeting is starting in ${meeting.reminder_minutes} minutes!</p>
    </div>
    <div class="content">
      <div class="detail">
        <span class="label">Client:</span> <span class="value">${meeting.client_name || meeting.name}</span>
      </div>
      <div class="detail">
        <span class="label">Meeting:</span> <span class="value">${meeting.name}</span>
        <br><span class="badge">${meetingTypeLabel}</span>
      </div>
      <div class="detail">
        <span class="label">Date:</span> <span class="value">${new Date(meeting.start_date).toLocaleDateString()}</span>
      </div>
      <div class="detail">
        <span class="label">Time:</span> <span class="value">${meeting.start_time}</span>
      </div>
      <div class="detail">
        <span class="label">Location:</span> <span class="value">${meeting.location}</span>
      </div>
      ${meeting.agenda ? `
      <div class="detail">
        <span class="label">Agenda:</span><br>
        <span class="value">${meeting.agenda.replace(/\n/g, '<br>')}</span>
      </div>
      ` : ''}
      ${meeting.meeting_link ? `
      <a href="${meeting.meeting_link}" class="button">Join Meeting</a>
      ` : ''}
    </div>
  </div>
</body>
</html>
  `;
}

// Generate plain text version
function generateEmailText(meeting: any): string {
    const meetingTypeLabel = {
        online: 'Online Meeting',
        on_call: 'Phone Call',
        face_to_face: 'In-Person Meeting'
    }[meeting.meeting_type] || 'Meeting';

    let text = `🔔 Meeting Reminder\n\n`;
    text += `Your meeting is starting in ${meeting.reminder_minutes} minutes!\n\n`;
    text += `Client: ${meeting.client_name || meeting.name}\n`;
    text += `Meeting: ${meeting.name}\n`;
    text += `Type: ${meetingTypeLabel}\n`;
    text += `Date: ${new Date(meeting.start_date).toLocaleDateString()}\n`;
    text += `Time: ${meeting.start_time}\n`;
    text += `Location: ${meeting.location}\n`;

    if (meeting.agenda) {
        text += `\nAgenda:\n${meeting.agenda}\n`;
    }

    if (meeting.meeting_link) {
        text += `\nJoin Meeting: ${meeting.meeting_link}\n`;
    }

    return text;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { meeting_id, user_id } = await req.json();

        if (!meeting_id || !user_id) {
            return new Response(
                JSON.stringify({ error: 'Missing meeting_id or user_id' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get meeting details
        const { data: meeting, error: meetingError } = await supabase
            .from('Meet Schedule Data')
            .select('*')
            .eq('id', meeting_id)
            .single();

        if (meetingError || !meeting) {
            console.error('Error fetching meeting:', meetingError);
            return new Response(
                JSON.stringify({ error: 'Meeting not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get user's Google OAuth tokens
        const { data: oauthData, error: oauthError } = await supabase
            .from('google_oauth_tokens')
            .select('access_token, refresh_token, token_expiry')
            .eq('connected_by_user_id', user_id)
            .eq('is_active', true)
            .single();

        if (oauthError || !oauthData) {
            console.error('Error fetching OAuth tokens:', oauthError);
            return new Response(
                JSON.stringify({ error: 'OAuth tokens not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        let accessToken = oauthData.access_token;

        // Check if token is expired and refresh if needed
        const tokenExpiry = new Date(oauthData.token_expiry);
        if (tokenExpiry < new Date()) {
            // Refresh token logic would go here
            console.log('Token expired, would refresh here');
            // For now, we'll try with the existing token
        }

        // Prepare email recipients
        const recipients = [];
        if (meeting.client_email) {
            recipients.push(meeting.client_email);
        }
        if (meeting.hosts_emails) {
            const hosts = meeting.hosts_emails.split(',').map((email: string) => email.trim());
            recipients.push(...hosts);
        }

        if (recipients.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No recipients found' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Generate email content
        const subject = `Reminder: Meeting with ${meeting.client_name || meeting.name} in ${meeting.reminder_minutes} minutes`;
        const htmlBody = generateEmailHTML(meeting);
        const textBody = generateEmailText(meeting);

        const sentEmails = [];
        const failedEmails = [];

        // Send email to each recipient
        for (const recipient of recipients) {
            try {
                const encodedMessage = createEmailMessage(recipient, subject, htmlBody, textBody);

                const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ raw: encodedMessage }),
                });

                if (response.ok) {
                    sentEmails.push(recipient);

                    // Log to email_reminders table
                    await supabase.from('email_reminders').insert({
                        event_id: meeting_id,
                        recipient_email: recipient,
                        status: 'sent',
                    });
                } else {
                    const errorData = await response.text();
                    console.error(`Failed to send to ${recipient}:`, errorData);
                    failedEmails.push({ email: recipient, error: errorData });

                    // Log failure
                    await supabase.from('email_reminders').insert({
                        event_id: meeting_id,
                        recipient_email: recipient,
                        status: 'failed',
                        error_message: errorData.substring(0, 500),
                    });
                }
            } catch (error) {
                console.error(`Error sending to ${recipient}:`, error);
                failedEmails.push({ email: recipient, error: error.message });
            }
        }

        // Mark reminder as sent
        await supabase
            .from('Meet Schedule Data')
            .update({
                reminder_sent: true,
                reminder_sent_at: new Date().toISOString(),
            })
            .eq('id', meeting_id);

        return new Response(
            JSON.stringify({
                success: true,
                meeting_id,
                sent: sentEmails,
                failed: failedEmails,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in send-meeting-reminder:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
