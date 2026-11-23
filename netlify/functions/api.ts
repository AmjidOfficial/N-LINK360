import { createApiGateway, invokeExpressGateway } from "../../src/server/apiGateway";

let cachedApp: ReturnType<typeof createApiGateway> | null = null;

function getGatewayApp() {
  if (!cachedApp) {
    cachedApp = createApiGateway();
  }
  return cachedApp;
}

export interface NetlifyEvent {
  httpMethod?: string;
  path?: string;
  rawUrl?: string;
  rawQuery?: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
}

function resolveApiUrlFromEvent(event: NetlifyEvent): string {
  let pathname = event.path || "/api/health";
  if (event.rawUrl) {
    try {
      const parsed = new URL(event.rawUrl);
      pathname = parsed.pathname;
      if (pathname.startsWith("/.netlify/functions/api")) {
        pathname = "/api" + pathname.slice("/.netlify/functions/api".length);
      }
      if (!pathname.startsWith("/api")) {
        pathname = `/api${pathname.startsWith("/") ? "" : "/"}${pathname}`;
      }
      return `${pathname}${parsed.search}`;
    } catch {}
  }

  if (pathname.startsWith("/.netlify/functions/api")) {
    pathname = "/api" + pathname.slice("/.netlify/functions/api".length);
  }
  if (!pathname.startsWith("/api")) {
    pathname = `/api${pathname.startsWith("/") ? "" : "/"}${pathname}`;
  }
  const query = event.rawQuery ? `?${event.rawQuery}` : "";
  return `${pathname}${query}`;
}

export const handler = async (event: NetlifyEvent) => {
  const app = getGatewayApp();
  const url = resolveApiUrlFromEvent(event);
  const bodyBuffer =
    event.body && event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : event.body || null;

  const result = await invokeExpressGateway(app, {
    method: event.httpMethod || "GET",
    url,
    headers: event.headers || {},
    body: bodyBuffer,
  });

  return {
    statusCode: result.statusCode,
    headers: result.headers,
    body: result.body,
  };
};
