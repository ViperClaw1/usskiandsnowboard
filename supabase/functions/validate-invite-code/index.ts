import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inviteCode } = await req.json();

    if (!inviteCode) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invite code is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get valid invite codes from environment variable
    const validCodes = (Deno.env.get('VALID_INVITE_CODES') || 'cortina26').split(',');

    // Validate the invite code
    const isValid = validCodes.includes(inviteCode.trim());

    if (!isValid) {
      console.log(`Invalid invite code attempt: ${inviteCode}`);
      return new Response(
        JSON.stringify({ valid: false }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Valid invite code provided');
    return new Response(
      JSON.stringify({ valid: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error validating invite code:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Validation failed' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
