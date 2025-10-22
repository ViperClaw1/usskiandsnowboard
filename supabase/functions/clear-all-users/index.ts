import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

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
    const { preserveEmails = [] } = await req.json().catch(() => ({ preserveEmails: [] }));
    console.log('Starting to clear users, preserving:', preserveEmails);

    // Create admin client with service role key
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

    // Get all users
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    console.log(`Found ${users.length} total users`);

    // Filter users to delete (exclude preserved emails)
    const usersToDelete = users.filter(user => !preserveEmails.includes(user.email));
    const preservedUsers = users.filter(user => preserveEmails.includes(user.email));

    console.log(`Will delete ${usersToDelete.length} users, preserving ${preservedUsers.length} users`);

    // Delete each user
    let deletedCount = 0;
    for (const user of usersToDelete) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`Error deleting user ${user.email}:`, deleteError);
      } else {
        deletedCount++;
        console.log(`Deleted user: ${user.email}`);
      }
    }

    console.log(`Successfully deleted ${deletedCount} users, preserved ${preservedUsers.length} users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Deleted ${deletedCount} users, preserved ${preservedUsers.length} users`,
        deletedCount,
        preservedCount: preservedUsers.length,
        preservedEmails: preservedUsers.map(u => u.email)
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in clear-all-users function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
