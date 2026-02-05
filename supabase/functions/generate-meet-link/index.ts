import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateMeetLinkRequest {
  organisation_id: string;
  title?: string;
  start_time?: string;
  end_time?: string;
}

function simpleDecrypt(encrypted: string): string {
  return atob(encrypted);
}

function simpleEncrypt(text: string): string {
  return btoa(text);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("=== Edge Function: generate-meet-link ===");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { organisation_id, title, start_time, end_time }: GenerateMeetLinkRequest = await req.json();
    console.log("Request data:", { organisation_id, title, start_time, end_time });

    if (!organisation_id) {
      console.error("Missing organisation_id in request");
      return new Response(
        JSON.stringify({ error: "Missing organisation_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Querying google_oauth_tokens for organisation_id:", organisation_id);
    const { data: tokenData, error: tokenError } = await supabase
      .from("google_oauth_tokens")
      .select("*")
      .eq("organisation_id", organisation_id)
      .eq("is_active", true)
      .maybeSingle();

    console.log("Token query result:", { tokenData: tokenData ? "found" : "not found", tokenError });

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({
          error: "No Google account connected. Please connect a Google account first.",
          needsAuth: true,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokenExpiry = new Date(tokenData.token_expiry);
    const now = new Date();
    const buffer = 5 * 60 * 1000;

    let accessToken = simpleDecrypt(tokenData.access_token_encrypted);

    if (tokenExpiry.getTime() - now.getTime() < buffer) {
      const refreshToken = simpleDecrypt(tokenData.refresh_token_encrypted);

      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        await supabase
          .from("google_oauth_tokens")
          .update({ is_active: false })
          .eq("id", tokenData.id);

        return new Response(
          JSON.stringify({
            error: "Failed to refresh Google token. Please reconnect your Google account.",
            needsAuth: true,
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      await supabase
        .from("google_oauth_tokens")
        .update({
          access_token_encrypted: simpleEncrypt(accessToken),
          token_expiry: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tokenData.id);
    }

    const eventTitle = title || "Meeting";
    const startDateTime = start_time || new Date(Date.now() + 3600000).toISOString();
    const endDateTime = end_time || new Date(new Date(startDateTime).getTime() + 3600000).toISOString();

    const calendarEvent = {
      summary: eventTitle,
      start: {
        dateTime: startDateTime,
        timeZone: "UTC",
      },
      end: {
        dateTime: endDateTime,
        timeZone: "UTC",
      },
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    };

    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(calendarEvent),
      }
    );

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.text();
      console.error("Google Calendar API error:", errorData);
      return new Response(
        JSON.stringify({
          error: "Failed to create Google Meet link",
          details: errorData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const eventData = await calendarResponse.json();
    const meetLink = eventData.conferenceData?.entryPoints?.find(
      (entry: any) => entry.entryPointType === "video"
    )?.uri;

    if (!meetLink) {
      return new Response(
        JSON.stringify({ error: "Failed to generate Google Meet link" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        meetLink,
        eventId: eventData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-meet-link function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});