import { NextResponse } from "next/server";

export interface ProxyOptions {
  /** caminho interno após /api/, ex.: "leads" ou "tokens/validate" */
  target: string;
  /** método HTTP a usar (default: o método do request original) */
  method?: string;
  /** se true, exige Authorization do gerente (BEFORE o fetch interno) */
  requireManager?: boolean;
}

const MAX_BODY_BYTES = 256 * 1024;

function resolveInternalOrigin(req: Request): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (base) return base.replace(/\/+$/, "");
  return new URL(req.url).origin;
}

async function readBody(req: Request): Promise<Buffer | null | "too-large"> {
  if (req.method === "GET" || req.method === "HEAD") return null;
  try {
    const ab = await req.arrayBuffer();
    if (ab.byteLength > MAX_BODY_BYTES) return "too-large";
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

  const targetUrl = `${resolveInternalOrigin(req)}/api/${opts.target}`;

  const headers = new Headers();
  headers.set("x-internal-api-key", internalKey);

  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);

  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const body = await readBody(req);
  if (body === "too-large") {
    return NextResponse.json({ error: "Corpo da requisição muito grande" }, { status: 413 });
  }

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
    console.error("[proxy] falha ao chamar API interna:", err);
    return NextResponse.json({ error: "Falha ao chamar API interna" }, { status: 502 });
  }

  const resHeaders = new Headers();
  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === "content-encoding" ||
      lower === "content-length" ||
      lower === "transfer-encoding" ||
      lower === "connection" ||
      lower === "keep-alive" ||
      lower.startsWith("x-internal-")
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
