import React from 'npm:react@18.3.1';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { ConfirmationEmail } from './_templates/confirmation-email.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const hookSecret = Deno.env.get('SEND_CONFIRMATION_EMAIL_HOOK_SECRET') as string;

Deno.serve(async (req) => {
  console.log('Confirmation email function called');

  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    return new Response('Method not allowed', { status: 400 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(hookSecret);

  try {
    console.log('Verifying webhook signature...');
    const {
      user,
      email_data: { token_hash, redirect_to },
    } = wh.verify(payload, headers) as {
      user: {
        email: string;
      };
      email_data: {
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
      };
    };

    console.log('Webhook verified. Sending confirmation email to:', user.email);

    const html = await renderAsync(
      React.createElement(ConfirmationEmail, {
        supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
        token_hash,
        redirect_to,
        user_email: user.email,
      })
    );

    const { error } = await resend.emails.send({
      from: 'U.S. Ski & Snowboard <onboarding@resend.dev>',
      to: [user.email],
      subject: 'Confirm your email address',
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('Confirmation email sent successfully to:', user.email);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-confirmation-email function:', error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: error.code,
          message: error.message,
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
