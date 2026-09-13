// Deploy via the Supabase Dashboard: Edge Functions -> Deploy a new function
// -> name it "admin-delete-member" -> paste this file's contents.
//
// Permanently deletes a PM or employee's login and profile. Never deletes
// an admin (including the caller) -- this only ever targets 'pm' or
// 'employee' rows.
//
// Deleting the auth user cascades: their own timesheet_entries rows are
// removed (employee_id ON DELETE CASCADE), anyone who reported to them
// falls back to unassigned (manager_id ON DELETE SET NULL), and hours they
// logged for someone else stay intact with logged_by cleared to null
// (ON DELETE SET NULL -- see supabase_timesheet_logged_by_set_null.sql).

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await callerClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not signed in.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: callerProfile } = await callerClient
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single();

  if (!callerProfile || callerProfile.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Only an admin can delete team members.' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { memberId } = await req.json();

  if (!memberId) {
    return new Response(JSON.stringify({ error: 'Missing memberId.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: member } = await adminClient
    .from('profiles')
    .select('id, role, company_id')
    .eq('id', memberId)
    .single();

  if (!member || member.company_id !== callerProfile.company_id || !['pm', 'employee'].includes(member.role)) {
    return new Response(JSON.stringify({ error: 'Team member not found in your company.' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(memberId);

  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
