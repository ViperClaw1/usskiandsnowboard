import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify caller identity
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate confirmation link - try signup first, fall back to magiclink for existing users
    let linkData, linkError;
    ({ data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'signup',
      email,
    }));

    if (linkError && linkError.message?.includes('already been registered')) {
      // User exists but unconfirmed - use magiclink type instead
      ({ data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email,
      }));
    }

    if (linkError) {
      console.error('generateLink error:', linkError);
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const confirmationUrl = linkData?.properties?.action_link;
    if (!confirmationUrl) {
      return new Response(JSON.stringify({ error: 'Failed to generate confirmation link' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send email via Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
              <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #0066cc 0%, #004999 100%);">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Welcome to U.S. Ski & Snowboard!</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 30px;">
                <p style="margin: 0 0 20px; font-size: 16px;">
                  Thank you for signing up with <strong>${email}</strong>.
                </p>
                <p style="margin: 0 0 30px; font-size: 16px;">
                  To complete your registration and access your dashboard, please confirm your email address by clicking the button below:
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a href="${confirmationUrl}" style="display: inline-block; padding: 16px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Confirm Email Address</a>
                    </td>
                  </tr>
                </table>
                <p style="margin: 30px 0 10px; font-size: 14px; color: #666;">
                  Or copy and paste this link into your browser:
                </p>
                <p style="margin: 0 0 30px; padding: 15px; background-color: #f4f4f4; border-radius: 5px; font-size: 12px; word-break: break-all; color: #333;">
                  ${confirmationUrl}
                </p>
                <p style="margin: 0; font-size: 14px; color: #999;">
                  If you didn't create an account, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; text-align: center; background-color: #f8f8f8; border-top: 1px solid #eee;">
                <p style="margin: 0; font-size: 12px; color: #999;">
                  U.S. Ski & Snowboard - Connecting Athletes with Career Opportunities
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const { error: emailError } = await resend.emails.send({
      from: 'U.S. Ski & Snowboard <notifications@athleteconnection.org>',
      to: [email],
      subject: 'Confirm your email address',
      html,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
