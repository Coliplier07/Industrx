// Deploy via the Supabase Dashboard: Edge Functions -> Deploy a new function
// -> name it "admin-reassign-employee" -> paste this file's contents.
//
// Changes which PM an employee reports to. protect_profile_privileges_trigger
// blocks manager_id changes from a plain client update (to stop privilege
// escalation), so this has to go through the service-role key, same as
// admin-create-account.

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

  // Scoped to the caller's own JWT, so this respects RLS -- used only to
  // verify who is calling and that they're actually an admin.
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
    return new Response(JSON.stringify({ error: 'Only an admin can reassign employees.' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { employeeId, managerId } = await req.json();

  if (!employeeId) {
    return new Response(JSON.stringify({ error: 'Missing employeeId.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Service-role client: the only thing that can bypass
  // protect_profile_privileges_trigger to change manager_id.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: employee } = await adminClient
    .from('profiles')
    .select('id, role, company_id')
    .eq('id', employeeId)
    .single();

  if (!employee || employee.company_id !== callerProfile.company_id || employee.role !== 'employee') {
    return new Response(JSON.stringify({ error: 'Employee not found in your company.' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (managerId !== null) {
    const { data: manager } = await adminClient
      .from('profiles')
      .select('id, role, company_id')
      .eq('id', managerId)
      .single();

    if (!manager || manager.company_id !== callerProfile.company_id || manager.role !== 'pm') {
      return new Response(JSON.stringify({ error: 'PM not found in your company.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ manager_id: managerId })
    .eq('id', employeeId);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
