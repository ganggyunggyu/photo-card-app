import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_TIMEOUT_MS = 5000;

const normalizeEndpoint = (endpointRaw: string): string =>
  endpointRaw.startsWith('/') ? endpointRaw : `/${endpointRaw}`;

const parsePort = (portRaw: string): number | null => {
  const port = Number(portRaw);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }

  return port;
};

const toJsonResponse = (text: string, status: number) => {
  try {
    return NextResponse.json(JSON.parse(text), { status });
  } catch {
    return new NextResponse(text, { status });
  }
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const ipRaw = searchParams.get('ip');
  const endpointRaw = searchParams.get('endpoint') ?? 'health';
  const portRaw = searchParams.get('port') ?? '80';

  if (!ipRaw) {
    return NextResponse.json({ ok: false, reason: 'missing_ip' }, { status: 400 });
  }

  const ip = ipRaw.trim();
  const endpoint = normalizeEndpoint(endpointRaw);
  const hasExplicitPort = searchParams.has('port');
  const port = hasExplicitPort ? parsePort(portRaw) : null;

  if (hasExplicitPort && port === null) {
    return NextResponse.json({ ok: false, reason: 'invalid_port' }, { status: 400 });
  }

  if (hasExplicitPort && ip.includes(':') && !ip.startsWith('[')) {
    return NextResponse.json({ ok: false, reason: 'port_conflict' }, { status: 400 });
  }

  const targetUrl = hasExplicitPort ? `http://${ip}:${port}${endpoint}` : `http://${ip}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });

    const text = await response.text();
    return toJsonResponse(text, response.status);
  } catch (error) {
    console.error('ESP32 proxy error:', { error, targetUrl });
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ ok: false, reason: 'timeout', targetUrl }, { status: 504 });
    }

    return NextResponse.json(
      { ok: false, reason: 'fetch_failed', message: getErrorMessage(error), targetUrl },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const ipRaw = searchParams.get('ip');
  const endpointRaw = searchParams.get('endpoint') ?? 'dispense';
  const portRaw = searchParams.get('port') ?? '80';

  if (!ipRaw) {
    return NextResponse.json({ ok: false, reason: 'missing_ip' }, { status: 400 });
  }

  const ip = ipRaw.trim();
  const endpoint = normalizeEndpoint(endpointRaw);
  const hasExplicitPort = searchParams.has('port');
  const port = hasExplicitPort ? parsePort(portRaw) : null;

  if (hasExplicitPort && port === null) {
    return NextResponse.json({ ok: false, reason: 'invalid_port' }, { status: 400 });
  }

  if (hasExplicitPort && ip.includes(':') && !ip.startsWith('[')) {
    return NextResponse.json({ ok: false, reason: 'port_conflict' }, { status: 400 });
  }

  const targetUrl = hasExplicitPort ? `http://${ip}:${port}${endpoint}` : `http://${ip}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      signal: controller.signal,
      cache: 'no-store',
    });

    if (response.status === 429) {
      return NextResponse.json({ success: false, error: 'cooldown' }, { status: 429 });
    }

    const text = await response.text();
    return toJsonResponse(text, response.status);
  } catch (error) {
    console.error('ESP32 proxy error:', { error, targetUrl });
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ ok: false, reason: 'timeout', targetUrl }, { status: 504 });
    }

    return NextResponse.json(
      { ok: false, reason: 'fetch_failed', message: getErrorMessage(error), targetUrl },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
