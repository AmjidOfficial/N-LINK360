import { CfContext, jsonResponse, optionsResponse } from './_shared';

export async function onRequest(ctx: CfContext): Promise<Response> {
  if (ctx.request.method === 'OPTIONS') return optionsResponse();
  if (ctx.request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const body = (await ctx.request.json().catch(() => ({}))) as Record<string, any>;
    const imageBase64 = String(body?.imageBase64 || '');
    const mimeType = String(body?.mimeType || 'image/jpeg');

    if (!imageBase64) {
      return jsonResponse({ error: 'No image data provided' }, 400);
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9+]+;base64,/, '');
    const apiKey = String(ctx.env.GEMINI_API_KEY || '').trim();

    if (!apiKey) {
      return jsonResponse({
        success: false,
        fallback: true,
        message: 'Gemini API key is not configured; manual verification required.',
        data: {
          amount: null,
          bankName: '',
          instrumentNumber: '',
          date: new Date().toISOString().split('T')[0],
          senderOrAccountTitle: '',
          remarks: 'Uploaded slip attached for verification',
          confidence: 0,
          slipType: 'UNKNOWN',
        },
      });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data: cleanBase64 } },
              {
                text: `You are an automated financial transaction analyzer for National Lights (N-LINK 360).
Examine this payment slip image (Pakistani Bank Deposit Slip, Online IBFT Receipt / Mobile App screenshot, ATM receipt, or Cheque).
Extract actual and accurate data with zero fabrication:
- amount: numeric amount paid in PKR without commas, or null.
- bankName: official bank name.
- instrumentNumber: transaction reference number, TRX ID, STAN, RRN, or Cheque number.
- date: YYYY-MM-DD format if detected.
- senderOrAccountTitle: sender's account name or dealer business name.
- remarks: concise 1-line note.
- slipType: one of ['IBFT_SCREENSHOT', 'BANK_DEPOSIT_SLIP', 'CHEQUE', 'ATM_RECEIPT', 'OTHER'].
- confidence: integer 0-100.
Return valid JSON only.`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiRes.ok) {
      return jsonResponse({
        success: false,
        fallback: true,
        message: 'Payment slip OCR service unavailable; manual verification required.',
        data: {
          amount: null,
          bankName: '',
          instrumentNumber: '',
          date: new Date().toISOString().split('T')[0],
          senderOrAccountTitle: '',
          remarks: 'Uploaded slip attached for verification',
          confidence: 0,
          slipType: 'UNKNOWN',
        },
      });
    }

    const geminiJson = (await geminiRes.json()) as any;
    const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(rawText);
    return jsonResponse({ success: true, data: parsed });
  } catch (err: any) {
    return jsonResponse(
      {
        success: false,
        error: err?.message || 'Failed to scan payment slip',
      },
      500
    );
  }
}
