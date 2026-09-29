/**
 * Cloudflare Worker for Apex Coaching LMS (apex-coaching-lms)
 * Edge Proxy and API gateway connecting custom domains & Cloudflare edge to the deployment.
 */

export interface Env {
  UPSTREAM_URL?: string;
}

const DEFAULT_UPSTREAM = 'https://apex-coaching-lms.vercel.app';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Direct Edge File Proxy for Student Answer Sheets & Notes (Zero cold-start)
    if (url.pathname === '/api/proxy-file') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          },
        });
      }

      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response('Missing "url" parameter', {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          },
        });
      }

      try {
        const decodedUrl = decodeURIComponent(targetUrl);
        const headers = new Headers();
        headers.set('User-Agent', 'Mozilla/5.0 (Apex LMS Edge Worker)');
        headers.set('Accept', '*/*');

        const supabaseKey =
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdub2FlZ2pxYXppYmRjaG9ycHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NzM3NTAsImV4cCI6MjEwMzA0OTc1MH0.YJhqRTU_TZAa0l3W8qFxK-_66yYnDbXtOQRDMcLyJmo';

        if (decodedUrl.includes('supabase.co')) {
          headers.set('apikey', supabaseKey);
          headers.set('Authorization', `Bearer ${supabaseKey}`);
        }

        const originResponse = await fetch(decodedUrl, { headers });
        const newResponse = new Response(originResponse.body, originResponse);
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        newResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        newResponse.headers.set('Access-Control-Allow-Headers', '*');
        return newResponse;
      } catch (err: any) {
        return new Response(`Proxy error: ${err.message}`, { status: 502 });
      }
    }

    // 2. Reverse proxy all application traffic to production origin
    const upstream = env.UPSTREAM_URL || DEFAULT_UPSTREAM;
    const targetUrl = new URL(url.pathname + url.search, upstream);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-Forwarded-Host', url.host);
    requestHeaders.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

    const proxyRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: requestHeaders,
      body: request.body,
      redirect: 'manual',
    });

    try {
      const response = await fetch(proxyRequest);
      return response;
    } catch (err: any) {
      return new Response(`Gateway error: ${err.message}`, { status: 502 });
    }
  },
};
