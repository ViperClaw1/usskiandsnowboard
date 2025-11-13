import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      throw new Error("Only admins can create users");
    }

    const { email, fullName, userType } = await req.json();

    if (!email || !fullName || !userType) {
      throw new Error("Email, full name, and user type are required");
    }

    // Generate a random invite code
    const inviteCode = generateInviteCode();

    console.log(`Creating user: ${email} with invite code: ${inviteCode}`);

    // Create the user with a temporary password
    const tempPassword = generateTempPassword();
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        user_type: userType,
        invite_code: inviteCode,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    console.log("User created successfully:", userData.user.id);

    // Send email with invite code
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "US Ski & Snowboard <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to US Ski & Snowboard",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to US Ski & Snowboard!</h2>
          <p>Hello ${fullName},</p>
          <p>An account has been created for you. Use the following invite code when signing up:</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <code style="font-size: 18px; font-weight: bold;">${inviteCode}</code>
          </div>
          <p>Your account details:</p>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Account Type:</strong> ${userType === 'athlete' ? 'Athlete' : 'Partner'}</li>
          </ul>
          <p>To complete your account setup:</p>
          <ol>
            <li>Visit the sign-up page</li>
            <li>Enter your email and create a password</li>
            <li>Use the invite code above when prompted</li>
          </ol>
          <p>If you have any questions, please contact an administrator.</p>
          <p>Best regards,<br>US Ski & Snowboard Team</p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      // Don't fail the whole operation if email fails
      console.warn("User created but email failed to send");
    } else {
      console.log("Email sent successfully", emailData);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User created successfully",
        inviteCode,
        userId: userData.user.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in create-user-with-code function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function generateInviteCode(): string {
  // Generate a 6-character alphanumeric code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding confusing chars like 0, O, I, 1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateTempPassword(): string {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  
  // Ensure at least one of each type
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]; // uppercase
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]; // lowercase
  password += "0123456789"[Math.floor(Math.random() * 10)]; // number
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)]; // special char
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

serve(handler);
