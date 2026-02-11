import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get current time
        const now = new Date();

        // Query for meetings that need reminders
        // Find meetings where:
        // 1. alert_type = 'remind'
        // 2. reminder_sent = FALSE
        // 3. Current time is within the reminder window
        const { data: meetings, error } = await supabase
            .from('Meet Schedule Data')
            .select('*')
            .eq('alert_type', 'remind')
            .eq('reminder_sent', false)
            .not('client_email', 'is', null);

        if (error) {
            console.error('Error fetching meetings:', error);
            return new Response(
                JSON.stringify({ error: 'Failed to fetch meetings', details: error }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const remindersToSend = [];

        // Check each meeting to see if it's time to send reminder
        for (const meeting of meetings || []) {
            try {
                // Combine date and time to get meeting datetime
                const meetingDate = new Date(meeting.start_date);
                const [hours, minutes] = (meeting.start_time || '00:00').split(':');
                meetingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

                // Calculate reminder time
                const reminderMinutes = meeting.reminder_minutes || 30;
                const reminderTime = new Date(meetingDate.getTime() - (reminderMinutes * 60 * 1000));

                // Check if we're within 1 minute of reminder time
                const timeDiff = now.getTime() - reminderTime.getTime();
                const withinWindow = timeDiff >= 0 && timeDiff < 60000; // Within 1 minute

                if (withinWindow) {
                    remindersToSend.push(meeting);

                    // Call send-meeting-reminder function
                    const response = await fetch(
                        `${supabaseUrl}/functions/v1/send-meeting-reminder`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${supabaseServiceKey}`,
                            },
                            body: JSON.stringify({
                                meeting_id: meeting.id,
                                user_id: meeting.created_by_id,
                            }),
                        }
                    );

                    if (!response.ok) {
                        console.error(`Failed to send reminder for meeting ${meeting.id}`);
                    }
                }
            } catch (err) {
                console.error(`Error processing meeting ${meeting.id}:`, err);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                checked: meetings?.length || 0,
                sent: remindersToSend.length,
                meetings: remindersToSend.map(m => ({ id: m.id, name: m.name })),
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in check-reminders:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
