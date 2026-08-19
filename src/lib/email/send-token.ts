import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurada");
  resend = new Resend(key);
  return resend;
}

export interface SendTokenEmailInput {
  to: string;
  name: string;
  token: string;
}

export async function sendTokenEmail(input: SendTokenEmailInput): Promise<void> {
  const accessUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/access`;
  await getResend().emails.send({
    from: "Diagnos <no-reply@diagnos.app>",
    to: input.to,
    subject: "Seu acesso ao Diagnóstico de Maturidade de Dados",
    html: `
      <p>Olá, ${escapeHtml(input.name)}.</p>
      <p>Seu token de acesso é:</p>
      <p style="font-size:24px;font-weight:700;letter-spacing:4px;">${input.token}</p>
      <p>Ele expira em 20 minutos e pode ser usado uma única vez.</p>
      <p><a href="${accessUrl}">Acessar o diagnóstico</a></p>
    `,
  });
}

export function buildMailtoFallback(input: SendTokenEmailInput): string {
  const subject = encodeURIComponent("Seu acesso ao Diagnóstico de Maturidade de Dados");
  const body = encodeURIComponent(
    `Olá, ${input.name}.\n\nSeu token de acesso é: ${input.token}\n\nEle expira em 20 minutos e pode ser usado uma única vez.\n\nAcesse: ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/access`
  );
  return `mailto:${input.to}?subject=${subject}&body=${body}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
