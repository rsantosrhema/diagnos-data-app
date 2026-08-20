import { NextResponse } from "next/server";

export interface ProxyOptions {
  /** caminho interno após /api/, ex.: "leads" ou "tokens/validate" */
  target: string;
  /** método HTTP a usar (default: o método do request original) */
  method?: string;
  /** se true, exige Authorization do gerente (BEFORE o fetch interno) */
  requireManager?: boolean;
}

const ORIGINAL_URL_HEADER = "x-internal-original-url";

function getOrigin(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const host = req.headers.get("host") ?? new URL(req.url).host;
  return `${proto}://${host}`;
}

async function readBody(req: Request): Promise<Buffer | null> {
  if (req.method === "GET" || req.method === "HEAD") return null;
  try {
    const ab = await req.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

export async function proxyToInternal(req: Request, opts: ProxyOptions): Promise<NextResponse> {
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey) {
    return NextResponse.json({ error: "INTERNAL_API_KEY não configurada" }, { status: 500 });
  }

  const origin = getOrigin(req);
  const targetUrl = `${origin}/api/${opts.target}`;

  const headers = new Headers();
  headers.set("x-internal-api-key", internalKey);
  headers.set(ORIGINAL_URL_HEADER, targetUrl);

  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);

  const body = await readBody(req);
  const method = (opts.method ?? req.method).toUpperCase();
  const bodyArg: BodyInit | undefined =
    body && body.length > 0 ? new Uint8Array(body) : undefined;

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method,
      headers,
      body: bodyArg,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Falha ao chamar API interna", detail: String(err) },
      { status: 502 }
    );
  }

  const resHeaders = new Headers();
  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === "content-encoding" ||
      lower === "content-length" ||
      lower === "transfer-encoding"
    ) {
      return;
    }
    resHeaders.append(key, value);
  });

  const responseBody = await response.arrayBuffer();
  return new NextResponse(responseBody, {
    status: response.status,
    headers: resHeaders,
  });
}
