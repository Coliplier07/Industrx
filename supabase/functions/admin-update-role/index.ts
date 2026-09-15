// Deploy via the Supabase Dashboard: Edge Functions -> Deploy a new function
// -> name it "admin-update-role" -> paste this file's contents.
//
// Promotes an employee to PM or demotes a PM back to employee.
// protect_profile_privileges_trigger blocks role changes from a plain
// client update (to stop privilege escalation), so this has to go through
// the service-role key, same as admin-create-account.
//
// Only ever moves someone between 'pm' and 'employee' -- never touches
// 'admin', in either direction, so this can't be used to create or remove
// admins.

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
    return new Response(JSON.stringify({ error: 'Only an admin can change roles.' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { memberId, newRole } = await req.json();

  if (!memberId || !['pm', 'employee'].includes(newRole)) {
    return new Response(JSON.stringify({ error: 'Missing or invalid fields.' }), {
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

  if (member.role === newRole) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Promoting to PM: they don't report to anyone anymore.
  const { error: updateError } = await adminClient
    .from('profiles')
    .update(newRole === 'pm' ? { role: newRole, manager_id: null } : { role: newRole })
    .eq('id', memberId);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (member.role === 'pm' && newRole === 'employee') {
    await adminClient.from('profiles').update({ manager_id: null }).eq('manager_id', memberId);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
