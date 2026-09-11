// Deploy via the Supabase Dashboard: Edge Functions -> Deploy a new function
// -> name it "admin-create-account" -> paste this file's contents.
//
// Creates a PM or employee login with an admin-chosen temp password.
// Requires the service-role key (never sent to the client), so this can
// only run here, not in the app itself.

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
    return new Response(JSON.stringify({ error: 'Only an admin can create accounts.' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { email, password, fullName, role, managerId } = await req.json();

  if (!email || !password || !fullName || !['pm', 'employee'].includes(role)) {
    return new Response(JSON.stringify({ error: 'Missing or invalid fields.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Service-role client: the only thing that can set someone else's
  // password directly and bypass RLS to insert their profile row.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return new Response(JSON.stringify({ error: createError?.message ?? 'Failed to create account.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { error: profileError } = await adminClient.from('profiles').insert({
    id: created.user.id,
    company_id: callerProfile.company_id,
    full_name: fullName,
    role,
    manager_id: role === 'employee' ? managerId ?? null : null,
  });

  if (profileError) {
    // Don't leave an orphaned login if the profile insert fails.
    await adminClient.auth.admin.deleteUser(created.user.id);
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ id: created.user.id }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
