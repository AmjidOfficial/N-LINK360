import {
  CfContext,
  DEFAULT_GOOGLE_SHEETS_WEBHOOK,
  jsonResponse,
  optionsResponse,
} from './_shared';

export async function onRequest(ctx: CfContext): Promise<Response> {
  if (ctx.request.method === 'OPTIONS') return optionsResponse();
  if (ctx.request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const payload = await ctx.request.json().catch(() => ({}));
    const clientWebhookUrl = ctx.request.headers.get('x-google-sheets-webhook') || '';
    const serverWebhookUrl =
      ctx.env.GOOGLE_SHEETS_WEBHOOK_URL || ctx.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL || '';
    const webhookUrl = String(serverWebhookUrl || clientWebhookUrl || DEFAULT_GOOGLE_SHEETS_WEBHOOK).trim();

    if (!webhookUrl.startsWith('https://script.google.com')) {
      return jsonResponse(
        {
          success: false,
          error:
            'Invalid Google Apps Script Webhook URL. It must start with https://script.google.com/macros/s/.../exec',
        },
        400
      );
    }

    const googleResponse = await fetch(webhookUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
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
      return jsonResponse({
        success: false,
        error: `Google Apps Script returned status ${googleResponse.status}. Verify deployment access is set to 'Anyone'.`,
        statusCode: googleResponse.status,
      });
    }

    return jsonResponse({
      success: true,
      status: googleResponse.status,
      googleData,
    });
  } catch (err: any) {
    return jsonResponse(
      {
        success: false,
        error: err?.message || 'Failed to relay Google Sheets sync request',
      },
      500
    );
  }
}
