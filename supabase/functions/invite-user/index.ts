import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

serve(async (req) => {
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

    // Verify the request is from an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      throw new Error('Only admins can invite users');
    }

    const { email, firstName, lastName, role } = await req.json();

    if (!email || !role) {
      throw new Error('Email and role are required');
    }

    console.log('Creating user:', email, 'with role:', role);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      console.log('User already exists, resending invitation:', existingUser.id);
      userId = existingUser.id;

      // Update user metadata if provided
      if (firstName || lastName) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            first_name: firstName || existingUser.user_metadata?.first_name || '',
            last_name: lastName || existingUser.user_metadata?.last_name || '',
            full_name: `${firstName || existingUser.user_metadata?.first_name || ''} ${lastName || existingUser.user_metadata?.last_name || ''}`.trim(),
          }
        });
      }

      // Update profile if exists
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (existingProfile) {
        await supabaseAdmin
          .from('profiles')
          .update({
            first_name: firstName || null,
            last_name: lastName || null,
            full_name: `${firstName || ''} ${lastName || ''}`.trim() || null,
          })
          .eq('id', userId);
      } else {
        // Create profile if it doesn't exist
        await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            first_name: firstName || null,
            last_name: lastName || null,
            full_name: `${firstName || ''} ${lastName || ''}`.trim() || null,
          });
      }

      // Check if role exists, if not create it
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', role)
        .single();

      if (!existingRole) {
        await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userId,
            role: role,
          });
      }
    } else {
      // Create new user
      const tempPassword = crypto.randomUUID().slice(0, 16);

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: false,
        user_metadata: {
          first_name: firstName || '',
          last_name: lastName || '',
          full_name: `${firstName || ''} ${lastName || ''}`.trim(),
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }

      console.log('User created successfully:', newUser.user.id);
      userId = newUser.user.id;

      // Create or update profile (handle_new_user trigger may have already created it)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          email: email,
          first_name: firstName || null,
          last_name: lastName || null,
          full_name: `${firstName || ''} ${lastName || ''}`.trim() || null,
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw profileError;
      }

      // Assign role
      const { error: roleAssignError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
        });

      if (roleAssignError) {
        console.error('Error assigning role:', roleAssignError);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw roleAssignError;
      }
    }

    // Generate password reset link
    const appUrl = 'https://usskiandsnowboard.lovable.app';
    
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (resetError) {
      console.error('Error generating reset link:', resetError);
      throw resetError;
    }

    // Construct direct link to our app with token_hash (bypasses Supabase redirect allowlist)
    const directLink = `${appUrl}/reset-password?invited=true&token_hash=${resetData.properties.hashed_token}&type=recovery`;

    console.log('Sending invitation email to:', email);

    // Send invitation email
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
                  You've been invited to join the U.S. Ski & Snowboard platform as a <strong>${role}</strong>.
                </p>
                <p style="margin: 0 0 30px; font-size: 16px;">
                  To get started, please set your password by clicking the button below:
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a href="${directLink}" style="display: inline-block; padding: 16px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Set Your Password</a>
                    </td>
                  </tr>
                </table>
                <p style="margin: 30px 0 10px; font-size: 14px; color: #666;">
                  Or copy and paste this link into your browser:
                </p>
                <p style="margin: 0 0 30px; padding: 15px; background-color: #f4f4f4; border-radius: 5px; font-size: 12px; word-break: break-all; color: #333;">
                  ${directLink}
                </p>
                <p style="margin: 0 0 10px; font-size: 14px; color: #666;">
                  Your login email is: <strong>${email}</strong>
                </p>
                <p style="margin: 0; font-size: 14px; color: #999;">
                  This link will expire in 24 hours.
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
      subject: 'Welcome to U.S. Ski & Snowboard - Set Your Password',
      html,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the request if email fails
      return new Response(
        JSON.stringify({ 
          success: true, 
          user: user,
          emailError: 'User created but email failed to send'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Invitation email sent successfully');

    return new Response(
      JSON.stringify({ success: true, user: user }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in invite-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
