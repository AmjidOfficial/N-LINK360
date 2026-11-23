import {
  CfContext,
  DEFAULT_GOOGLE_SHEETS_WEBHOOK,
  jsonResponse,
  optionsResponse,
  verifyEdgeSessionToken,
} from './_shared';

export async function onRequest(ctx: CfContext): Promise<Response> {
  if (ctx.request.method === 'OPTIONS') return optionsResponse(ctx.request);
  if (ctx.request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405, {}, ctx.request);
  }

  const secret = String(ctx.env.NLINK_SESSION_SECRET || '').trim();
  const authHeader = ctx.request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const session = await verifyEdgeSessionToken(token, secret);
  if (!session) {
    return jsonResponse(
      { success: false, error: 'Authentication required for Google Sheets synchronization.' },
      401,
      {},
      ctx.request
    );
  }

  try {
    const payload = (await ctx.request.json().catch(() => ({}))) as Record<string, any>;
    const clientWebhookUrl = ctx.request.headers.get('x-google-sheets-webhook') || '';
    const serverWebhookUrl =
      ctx.env.GOOGLE_SHEETS_WEBHOOK_URL || ctx.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL || '';
    const webhookUrl = String(serverWebhookUrl || clientWebhookUrl || DEFAULT_GOOGLE_SHEETS_WEBHOOK).trim();

    let isValidWebhookUrl = false;
    try {
      const parsedWebhook = new URL(webhookUrl);
      isValidWebhookUrl =
        parsedWebhook.protocol === 'https:' &&
        parsedWebhook.hostname === 'script.google.com' &&
        parsedWebhook.pathname.startsWith('/macros/s/');
    } catch {
      isValidWebhookUrl = false;
    }

    if (!isValidWebhookUrl) {
      return jsonResponse(
        {
          success: false,
          error:
            'Invalid Google Apps Script Webhook URL. It must start with https://script.google.com/macros/s/.../exec',
        },
        400,
        {},
        ctx.request
      );
    }

    const sheetToken = String(ctx.env.NLINK_SHEET_TOKEN || '').trim();
    const forwardedBody = {
      ...(payload || {}),
      ...(sheetToken ? { sheetToken } : {}),
      spreadsheetId: payload?.spreadsheetId || '1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo',
    };

    const googleResponse = await fetch(webhookUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        ...(sheetToken ? { 'X-NLINK-SHEET-TOKEN': sheetToken } : {}),
      },
      body: JSON.stringify(forwardedBody),
    });

    const responseText = await googleResponse.text();
    let googleData: Record<string, unknown> = { status: 'success' };
    try {
      if (responseText) {
        googleData = JSON.parse(responseText);
      }
    } catch {
      googleData = { status: 'success', raw: responseText.slice(0, 120) };
    }

    if (!googleResponse.ok && googleResponse.status !== 302) {
      return jsonResponse(
        {
          success: false,
          error: `Google Apps Script returned status ${googleResponse.status}. Verify deployment and NLINK_SHEET_TOKEN.`,
          statusCode: googleResponse.status,
        },
        502,
        {},
        ctx.request
      );
    }

    return jsonResponse(
      {
        success: true,
        status: googleResponse.status,
        googleData,
      },
      200,
      {},
      ctx.request
    );
  } catch (err: any) {
    return jsonResponse(
      {
        success: false,
        error: err?.message || 'Failed to relay Google Sheets sync request',
      },
      500,
      {},
      ctx.request
    );
  }
}
