import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ChangePasswordRequest {
  username: string;
  current_password: string;
  new_password: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { username, current_password, new_password }: ChangePasswordRequest = await req.json();

    console.log('Password change request for username:', username);

    if (!username || !current_password || !new_password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'New password must be at least 6 characters long' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify current password using verify_credentials function
    console.log('Verifying credentials...');
    const { data: verifyData, error: verifyError } = await supabase.rpc(
      'verify_credentials',
      {
        p_username: username,
        p_password: current_password,
      }
    );

    if (verifyError) {
      console.error('Verification error:', verifyError);
      return new Response(
        JSON.stringify({ error: 'Current password is incorrect', details: verifyError.message }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!verifyData || verifyData.length === 0) {
      console.error('No verification data returned');
      return new Response(
        JSON.stringify({ error: 'Current password is incorrect' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Verification successful, user_id:', verifyData[0].user_id);

    // Get the user_id from the verified profile
    const profile_user_id = verifyData[0].user_id;

    // Update password using update_user_password function
    console.log('Updating password for user_id:', profile_user_id);
    const { data: updateData, error: updateError } = await supabase.rpc(
      'update_user_password',
      {
        p_user_id: profile_user_id,
        p_new_password: new_password,
      }
    );

    console.log('Update result - data:', updateData, 'error:', updateError);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update password', details: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if the update was successful (the function returns a boolean)
    if (updateData === false) {
      console.error('Update returned false - no rows affected');
      return new Response(
        JSON.stringify({ error: 'Failed to update password: User credentials not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Password updated successfully');
    return new Response(
      JSON.stringify({ success: true, message: 'Password updated successfully' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in change-password function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});