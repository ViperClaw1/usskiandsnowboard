import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Reset passwords for all test accounts
    const accounts = [
      { email: 'bryan@cardinallands.com', userId: 'd9d26433-499c-4141-a39c-c8eb4c7c0f47', role: 'admin' },
      { email: 'bd@guidepostcap.com', userId: 'fcea9d6d-f832-4e82-8671-ba22a19474b5', role: 'employer' },
      { email: 'bryanhdunn@gmail.com', userId: '5eda3177-edb7-498f-918b-eae2bff2d520', role: 'athlete' },
      { email: 'joshuacherner@gmail.com', userId: '28ec8285-c1f1-48b3-91c0-5f712209e632', role: 'admin' }
    ];

    const tempPassword = 'Sandcastle116';
    const results = [];

    for (const account of accounts) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        account.userId,
        { password: tempPassword }
      );

      if (error) {
        console.error(`Failed to reset password for ${account.email}:`, error);
        results.push({ email: account.email, success: false, error: error.message });
      } else {
        console.log(`Password reset successful for ${account.email}`);
        results.push({ email: account.email, success: true, role: account.role });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Password reset complete',
        tempPassword: tempPassword,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reset-test-accounts:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
