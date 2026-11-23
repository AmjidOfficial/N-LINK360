import {
  CfContext,
  getSupabaseClientConfig,
  jsonResponse,
  normalizeCorporateEmail,
  optionsResponse,
  signEdgeSessionToken,
  supabaseRestFetch,
} from '../_shared';

export async function onRequest(ctx: CfContext): Promise<Response> {
  if (ctx.request.method === 'OPTIONS') return optionsResponse(ctx.request);
  if (ctx.request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405, {}, ctx.request);
  }

  const secret = String(ctx.env.NLINK_SESSION_SECRET || '').trim();
  if (secret.length < 32) {
    return jsonResponse(
      { success: false, error: 'Server signing secret is not configured.' },
      503,
      {},
      ctx.request
    );
  }

  const body = (await ctx.request.json().catch(() => ({}))) as Record<string, any>;
  const cleanEmail = normalizeCorporateEmail(body?.email || body?.identifier || '');
  const cleanPass = String(body?.password || '').trim();

  if (!cleanEmail || !cleanEmail.includes('@') || !cleanPass) {
    return jsonResponse(
      { success: false, error: 'A valid corporate email address and password are required.' },
      400,
      {},
      ctx.request
    );
  }

  const sbClient = getSupabaseClientConfig(ctx.env);
  if (!sbClient) {
    return jsonResponse(
      { success: false, error: 'Authentication backend is not configured.' },
      503,
      {},
      ctx.request
    );
  }

  try {
    const authRes = await fetch(`${sbClient.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: sbClient.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
    });

    if (!authRes.ok) {
      return jsonResponse({ success: false, error: 'Invalid email address or password.' }, 401, {}, ctx.request);
    }

    const authJson = (await authRes.json().catch(() => ({}))) as any;
    const empRes = await supabaseRestFetch(
      ctx.env,
      `employees?email=ilike.${encodeURIComponent(cleanEmail)}&limit=1`
    );
    const empList = empRes && empRes.ok ? ((await empRes.json().catch(() => [])) as any[]) : [];
    const emp = empList[0] || null;

    if (emp && emp.status === false) {
      return jsonResponse(
        { success: false, error: 'Account is deactivated. Contact Head Office Administration.' },
        403,
        {},
        ctx.request
      );
    }

    const resolvedRole = String(emp?.role || 'SALES_RECOVERY').toUpperCase();
    const resolvedId = String(emp?.id || authJson?.user?.id || `usr_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`);
    const sessionToken = await signEdgeSessionToken(
      { sub: resolvedId, email: cleanEmail, role: resolvedRole },
      secret
    );

    return jsonResponse(
      {
        success: true,
        sessionToken,
        user: {
          id: resolvedId,
          employeeCode: emp?.employee_code || 'NL-EMP',
          email: cleanEmail,
          fullName: emp?.full_name || authJson?.user?.user_metadata?.full_name || cleanEmail.split('@')[0],
          role: resolvedRole,
          roleTitle: emp?.role_title || resolvedRole,
          department: emp?.department || 'SALES_FIELD',
          phone: emp?.mobile || emp?.phone || '',
          region: emp?.region || undefined,
          zone: emp?.zone || undefined,
          territory: emp?.territory || undefined,
          canApprove:
            cleanEmail === 'shahzadullah@nationallight.pk' || cleanEmail === 'nationallights2026@gmail.com',
          mustChangePassword: Boolean(emp?.must_change_password),
        },
      },
      200,
      {},
      ctx.request
    );
  } catch {
    return jsonResponse({ success: false, error: 'Authentication verification failed.' }, 502, {}, ctx.request);
  }
}
