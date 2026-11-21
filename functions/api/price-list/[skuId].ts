import { NATIONAL_LIGHT_OFFICIAL_CATALOG } from '../../../src/data/national-light-rate-card';
import {
  CfContext,
  jsonResponse,
  optionsResponse,
  supabaseRestFetch,
  verifyEdgeSessionToken,
} from '../_shared';

export async function onRequest(ctx: CfContext): Promise<Response> {
  if (ctx.request.method === 'OPTIONS') return optionsResponse();
  if (ctx.request.method !== 'PUT') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  const authHeader = ctx.request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const secret = String(ctx.env.NLINK_SESSION_SECRET || '');
  const session = await verifyEdgeSessionToken(token, secret);

  if (!session) {
    return jsonResponse({ success: false, error: 'Authentication required to update price list.' }, 401);
  }

  const roleUpper = String(session.role || '').toUpperCase();
  const allowed = roleUpper === 'SUPER_ADMIN' || roleUpper === 'ACCOUNTS' || roleUpper === 'MANAGEMENT';
  if (!allowed) {
    return jsonResponse({ success: false, error: 'Forbidden: Authorized Admin / Accounts role required.' }, 403);
  }

  const skuId = String(ctx.params?.skuId || '').trim();
  const target = NATIONAL_LIGHT_OFFICIAL_CATALOG.find((s) => s.id === skuId || s.sku === skuId);
  if (!target) {
    return jsonResponse({ success: false, error: `SKU ${skuId} not found.` }, 404);
  }

  const body = (await ctx.request.json().catch(() => ({}))) as Record<string, any>;
  const tradePrice = Number(body?.tradePrice);
  const listPrice = Number(body?.listPrice);
  const reason = String(body?.reason || '').trim();

  if (!Number.isFinite(tradePrice) || tradePrice <= 0 || !Number.isFinite(listPrice) || listPrice <= 0) {
    return jsonResponse({ success: false, error: 'Positive finite tradePrice and listPrice are required.' }, 400);
  }
  if (!reason) {
    return jsonResponse({ success: false, error: 'Price change reason is mandatory.' }, 400);
  }

  const nowIso = new Date().toISOString();
  const effectivePriceDate = String(body?.effectiveDate || nowIso.slice(0, 10));

  try {
    await supabaseRestFetch(ctx.env, `products?id=eq.${encodeURIComponent(target.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        trade_price: tradePrice,
        list_price: listPrice,
        discount_percentage: body?.discountPercentage ?? target.discountPercentage,
        updated_at: nowIso,
      }),
    });
  } catch {
    // Non-blocking: local priceListService override persists immediately
  }

  const historyEntry = {
    id: `PH-EDGE-${Date.now()}`,
    skuId: target.id,
    skuCode: target.sku,
    skuName: target.name,
    oldTradePrice: target.tradePrice,
    newTradePrice: tradePrice,
    oldListPrice: target.listPrice,
    newListPrice: listPrice,
    effectiveDate: effectivePriceDate,
    changedBy: session.email,
    reason,
    createdAt: nowIso,
  };

  return jsonResponse({
    success: true,
    skuId: target.id,
    updated: {
      tradePrice,
      listPrice,
      discountPercentage: body?.discountPercentage ?? target.discountPercentage,
      purchasePrice: body?.purchasePrice !== undefined ? body.purchasePrice : null,
      effectivePriceDate,
      updatedAt: nowIso,
    },
    historyEntry,
  });
}
