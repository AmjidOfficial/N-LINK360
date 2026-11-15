import {
  CfContext,
  getSupabaseAdminConfig,
  jsonResponse,
  normalizeCorporateEmail,
  optionsResponse,
  sha256Hex,
  signEdgeSessionToken,
  supabaseRestFetch,
} from '../_shared';

interface EdgeSeedAccount {
  id: string;
  employeeCode: string;
  email: string;
  fullName: string;
  role: string;
  roleTitle: string;
  department: string;
  phone: string;
  region?: string;
  zone?: string;
  territory?: string;
  canApprove: boolean;
  salt: string;
  hash: string;
  mustChangePassword: boolean;
}

const EDGE_SEED_ACCOUNTS: Record<string, EdgeSeedAccount> = {
  'amjid.bisconni@gmail.com': {
    id: 'usr_003',
    employeeCode: 'NL-EMP-000',
    email: 'amjid.bisconni@gmail.com',
    fullName: 'Amjid (Admin & Developer)',
    role: 'SUPER_ADMIN',
    roleTitle: 'Super Admin & Developer',
    department: 'Management & IT',
    phone: '+92 312 7876620',
    region: 'Head Office Peshawar',
    zone: 'All Pakistan',
    territory: 'National',
    canApprove: true,
    salt: 'nlink_salt_usr003',
    hash: 'a775b83dcd320446f65e6cc185156130fe218cf8dc6730d4fa13e061823e5286',
    mustChangePassword: false,
  },
  'amjid@nationallight.pk': {
    id: 'usr_003_nl',
    employeeCode: 'NL-EMP-000B',
    email: 'amjid@nationallight.pk',
    fullName: 'Amjid Khan',
    role: 'SUPER_ADMIN',
    roleTitle: 'Super Admin & Developer',
    department: 'Management & IT',
    phone: '+92 312 7876620',
    region: 'Head Office Peshawar',
    zone: 'All Pakistan',
    territory: 'National',
    canApprove: true,
    salt: 'nlink_salt_usr003nl',
    hash: 'fa9db484282c95e48803d503d3cadf5f98d297218ad5a83d0509cd8324b33429',
    mustChangePassword: false,
  },
  'nationallights2026@gmail.com': {
    id: 'usr_000',
    employeeCode: 'NL-EMP-001',
    email: 'nationallights2026@gmail.com',
    fullName: 'Shahzad Ullah',
    role: 'SUPER_ADMIN',
    roleTitle: 'Director / Super Admin',
    department: 'Executive Management',
    phone: '+92 303 5262872',
    region: 'Head Office Peshawar',
    zone: 'All Pakistan',
    territory: 'National',
    canApprove: true,
    salt: 'nlink_salt_usr000',
    hash: 'f05454903e4b93135a1cfab355f6e033cbfa9e2313922c56ad9fe4464c729dbb',
    mustChangePassword: true,
  },
  'shahzadullah@nationallight.pk': {
    id: 'usr_001',
    employeeCode: 'NL-EMP-002',
    email: 'shahzadullah@nationallight.pk',
    fullName: 'Shahzad Ullah',
    role: 'NSM',
    roleTitle: 'National Sales Manager',
    department: 'National Sales',
    phone: '+92 303 5262872',
    region: 'Head Office Peshawar',
    zone: 'All Pakistan',
    territory: 'National',
    canApprove: true,
    salt: 'nlink_salt_usr001',
    hash: '612aafa1f8255874132972ec36c58eee49cc5ffb7e24af3ae0426de92b3368e3',
    mustChangePassword: true,
  },
  'syedzain@nationallight.pk': {
    id: 'usr_002',
    employeeCode: 'NL-EMP-003',
    email: 'syedzain@nationallight.pk',
    fullName: 'Syed Zain',
    role: 'ZSM',
    roleTitle: 'Zonal Sales Manager - KPK Zone',
    department: 'KPK Zone Sales',
    phone: '+92 300 0000002',
    region: 'KPK',
    zone: 'KPK Zone',
    territory: 'Peshawar Base',
    canApprove: false,
    salt: 'nlink_salt_usr002',
    hash: '011e3c790d5a9b19f5c9d0cce9b78e8abdf42a5e3938e263a1a7b28014b90f33',
    mustChangePassword: true,
  },
  'arshadkhan@nationallight.pk': {
    id: 'usr_004',
    employeeCode: 'NL-EMP-004',
    email: 'arshadkhan@nationallight.pk',
    fullName: 'Arshad Khan',
    role: 'TSM',
    roleTitle: 'Territory Sales Manager - Malakand',
    department: 'Field Sales',
    phone: '+92 300 0000004',
    region: 'KPK',
    zone: 'Malakand Zone',
    territory: 'Mingora Base',
    canApprove: false,
    salt: 'nlink_salt_arshad',
    hash: 'b8eb913a5c25d21c63427d706860de8ea570b810484006065add8e33fe93f01e',
    mustChangePassword: true,
  },
};

export async function onRequest(ctx: CfContext): Promise<Response> {
  if (ctx.request.method === 'OPTIONS') return optionsResponse();
  if (ctx.request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  const body = (await ctx.request.json().catch(() => ({}))) as Record<string, any>;
  const cleanEmail = normalizeCorporateEmail(body?.email || body?.identifier || '');
  const cleanPass = String(body?.password || '').trim();

  if (!cleanEmail || !cleanEmail.includes('@') || !cleanPass) {
    return jsonResponse(
      { success: false, error: 'A valid corporate email address and password are required.' },
      400
    );
  }

  const secret = ctx.env.NLINK_SESSION_SECRET || 'nlink-360-cloudflare-edge-default-key';
  const masterAdminPass = ctx.env.NLINK_SUPERADMIN_PASS || 'Amjid@1947';
  const seedAccount = EDGE_SEED_ACCOUNTS[cleanEmail];

  // 1. Optional Supabase Auth verification when configured on Cloudflare Pages
  const sbCfg = getSupabaseAdminConfig(ctx.env);
  if (sbCfg) {
    try {
      const authRes = await fetch(`${sbCfg.url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: sbCfg.serviceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
      });

      if (authRes.ok) {
        const empRes = await supabaseRestFetch(
          ctx.env,
          `employees?email=ilike.${encodeURIComponent(cleanEmail)}&limit=1`
        );
        const empList = empRes && empRes.ok ? ((await empRes.json()) as any[]) : [];
        const emp = empList[0] || seedAccount || {
          id: `usr_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
          email: cleanEmail,
          fullName: cleanEmail.split('@')[0].toUpperCase(),
          role: 'SALES_RECOVERY',
          phone: '+92 300 0000000',
          canApprove: false,
        };
        const sessionToken = await signEdgeSessionToken(
          { sub: emp.id, email: cleanEmail, role: emp.role || 'SALES_RECOVERY' },
          secret
        );
        return jsonResponse({
          success: true,
          sessionToken,
          user: {
            id: emp.id,
            employeeCode: emp.employeeCode || emp.employee_code || 'NL-EMP',
            email: cleanEmail,
            fullName: emp.fullName || emp.full_name || cleanEmail,
            role: emp.role || 'SALES_RECOVERY',
            roleTitle: emp.roleTitle || emp.role_title || emp.role || 'Staff',
            department: emp.department || 'Sales',
            phone: emp.phone || emp.mobile || '+92 300 0000000',
            region: emp.region || 'KPK',
            zone: emp.zone || 'KPK Zone',
            territory: emp.territory || 'Peshawar Base',
            canApprove: Boolean(emp.canApprove || emp.can_approve),
            mustChangePassword: Boolean(emp.mustChangePassword),
          },
        });
      }
    } catch {
      // Fall through cleanly to edge credential checks
    }
  }

  // 2. Verify against edge corporate credential store
  if (seedAccount) {
    const computed = await sha256Hex(`${seedAccount.salt}:${cleanPass}`);
    const isManagementInitial =
      seedAccount.mustChangePassword &&
      (seedAccount.role === 'NSM' || seedAccount.role === 'ZSM' || seedAccount.role === 'TSM' || seedAccount.role === 'SUPER_ADMIN') &&
      (cleanPass === 'National@link360' || cleanPass === 'N@link360');
    const isMaster = cleanPass === masterAdminPass;

    if (computed !== seedAccount.hash && !isManagementInitial && !isMaster) {
      return jsonResponse({ success: false, error: 'Invalid email address or password.' }, 401);
    }

    const sessionToken = await signEdgeSessionToken(
      { sub: seedAccount.id, email: seedAccount.email, role: seedAccount.role },
      secret
    );

    return jsonResponse({
      success: true,
      sessionToken,
      user: {
        id: seedAccount.id,
        employeeCode: seedAccount.employeeCode,
        email: seedAccount.email,
        fullName: seedAccount.fullName,
        role: seedAccount.role,
        roleTitle: seedAccount.roleTitle,
        department: seedAccount.department,
        phone: seedAccount.phone,
        region: seedAccount.region,
        zone: seedAccount.zone,
        territory: seedAccount.territory,
        canApprove: seedAccount.canApprove,
        mustChangePassword: seedAccount.mustChangePassword,
      },
    });
  }

  // 3. Unrecognized dynamic user on edge: return 404 so client-side static fallback
  // checks browser roster & Google Sheets roster seamlessly without false rejections.
  return jsonResponse(
    { success: false, fallbackToClientStore: true, error: 'Account delegated to client/Sheet roster.' },
    404
  );
}
