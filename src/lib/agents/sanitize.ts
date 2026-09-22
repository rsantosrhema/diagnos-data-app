/**
 * Utilitários de sanitização para conteúdos não-confiáveis que entram em
 * prompts de LLM (dados do lead, resultados de busca web).
 *
 * Estratégia (OWASP LLM01/05):
 * - stripControlChars: remove caracteres de controle (CRLF, tab, zero-width,
 *   Unicode tags) que quebram a estrutura do prompt ou carregam payloads
 *   invisíveis de injection.
 * - clamp: limita o tamanho máximo, evitando DoS de contexto.
 */

const CONTROL_CHARS =
  /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u{E0000}-\u{E007F}]/gu;

export function stripControlChars(input: string): string {
  return input.replace(CONTROL_CHARS, " ");
}

export function clampText(input: string, maxLength: number): string {
  const clean = stripControlChars(input);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength)}...`;
}

export function sanitizeUntrusted(input: string, maxLength: number): string {
  return clampText(input, maxLength);
}
