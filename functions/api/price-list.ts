import { NATIONAL_LIGHT_OFFICIAL_CATALOG } from '../../src/data/national-light-rate-card';
import { CfContext, jsonResponse, optionsResponse } from './_shared';

export async function onRequest(ctx: CfContext): Promise<Response> {
  if (ctx.request.method === 'OPTIONS') return optionsResponse();

  const items = NATIONAL_LIGHT_OFFICIAL_CATALOG.map((item) => ({
    ...item,
    skuCode: item.sku,
    purchasePrice: null,
    effectivePriceDate: '2026-01-01',
    updatedAt: null,
  }));

  return jsonResponse({
    success: true,
    count: items.length,
    items,
    history: [],
  });
}
