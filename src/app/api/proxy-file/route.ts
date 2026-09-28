import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing "url" parameter', {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  try {
    let resolvedUrl = targetUrl;
    try {
      // Decode if safely possible
      resolvedUrl = decodeURIComponent(targetUrl);
    } catch {
      resolvedUrl = targetUrl;
    }

    // Ensure valid URI encoding (e.g. spaces encoded as %20)
    try {
      resolvedUrl = encodeURI(resolvedUrl);
    } catch {
      // keep resolvedUrl as is
    }

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (EduFlow LMS File Proxy)',
      Accept: '*/*',
    };

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdub2FlZ2pxYXppYmRjaG9ycHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NzM3NTAsImV4cCI6MjEwMzA0OTc1MH0.YJhqRTU_TZAa0l3W8qFxK-_66yYnDbXtOQRDMcLyJmo';

    if (resolvedUrl.includes('supabase.co')) {
      headers['apikey'] = supabaseKey;
      headers['Authorization'] = `Bearer ${supabaseKey}`;
    }

    const response = await fetch(resolvedUrl, { headers });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch target file: ${response.statusText}`, {
        status: response.status,
        headers: CORS_HEADERS,
      });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        ...CORS_HEADERS,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (err: any) {
    console.error('File proxy error:', err);
    return new NextResponse(`Error proxying file: ${err.message}`, {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
