import { CfContext, jsonResponse, optionsResponse } from './_shared';

export async function onRequest(ctx: CfContext): Promise<Response> {
  if (ctx.request.method === 'OPTIONS') return optionsResponse();
  return jsonResponse({
    status: 'healthy',
    system: 'N-LINK 360',
    platform: 'cloudflare-pages',
    costTier: '$0/month',
    timestamp: new Date().toISOString(),
  });
}
