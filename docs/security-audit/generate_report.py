# -*- coding: utf-8 -*-
"""
Gera o Relatório de Auditoria de Segurança (Diagnos Data App) em PDF (A4).
Uso (ambiente isolado criado junto ao script):
    docs\\security-audit\\.venv\\Scripts\\python.exe docs\\security-audit\\generate_report.py
Dependências: reportlab, matplotlib (instaladas no .venv).
"""
import os
import math

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    BaseDocTemplate,
    PageTemplate,
    Frame,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    KeepTogether,
    Preformatted,
    PageBreak,
)

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.join(OUT_DIR, "relatorio-auditoria-seguranca.pdf")
IMG_CHART_DIR = os.path.join(OUT_DIR, "_charts")
os.makedirs(IMG_CHART_DIR, exist_ok=True)

# ---------------------------------------------------------------- palette
SEV = {
    "critica": ("#B91C1C", "CRÍTICA"),
    "alta": ("#EA580C", "ALTA"),
    "media": ("#D97706", "MÉDIA"),
    "baixa": ("#2563EB", "BAIXA"),
    "informativa": ("#6B7280", "INFO"),
    "forte": ("#059669", "PONTO FORTE"),
}
PALETTE = {"critica": "#B91C1C", "alta": "#EA580C", "media": "#D97706",
           "baixa": "#2563EB", "informativa": "#6B7280", "forte": "#059669"}

HEAD = "#3B2366"
INK = "#1F2333"
MUT = "#6B7280"
LIGHT = "#E5E7EB"

W, H = A4
MARGIN = 2.0 * cm

# ---------------------------------------------------------------- styles
SS = getSampleStyleSheet()

def st(name, **kw):
    base = dict(
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=INK,
        alignment=TA_LEFT,
        spaceAfter=6,
    )
    base.update(kw)
    return ParagraphStyle(name, **base)

ST_TITLE = st("Title", fontName="Helvetica-Bold", fontSize=26, leading=32, textColor=colors.white, alignment=TA_CENTER)
ST_SUB = st("Sub", fontName="Helvetica", fontSize=13, leading=18, textColor=colors.HexColor("#E0D8F0"), alignment=TA_CENTER)
ST_H1 = st("H1", fontName="Helvetica-Bold", fontSize=17, leading=22, textColor=HEAD, spaceBefore=14, spaceAfter=8)
ST_H2 = st("H2", fontName="Helvetica-Bold", fontSize=13, leading=18, textColor=HEAD, spaceBefore=10, spaceAfter=6)
ST_BODY = st("Body", alignment=TA_JUSTIFY)
ST_SMALL = st("Small", fontSize=8.5, leading=12, textColor=MUT)
ST_CODE = st("Code", fontName="Courier", fontSize=8.2, leading=10.5, textColor=colors.HexColor("#111827"))
ST_CELL = st("Cell", fontSize=8.5, leading=11, spaceAfter=0)
ST_CELL_B = st("CellB", fontName="Helvetica-Bold", fontSize=8.5, leading=11, spaceAfter=0, textColor=colors.white)
ST_CELL_S = st("CellS", fontName="Courier", fontSize=7.6, leading=10, spaceAfter=0)
ST_CHIP = st("Chip", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.white, alignment=TA_CENTER, spaceAfter=0)
ST_ISSUE = st("Issue", fontName="Courier", fontSize=7.6, leading=9.6, textColor=colors.HexColor("#111827"), spaceAfter=4, alignment=TA_LEFT)

# ---------------------------------------------------------------- data
FINDINGS = [
    # (id, cat, sev, ref, title, desc, exploit, impact, fix)
    ("A1", "Banco sem trava (RLS)", "informativa",
     "src/app/api/admin/analysis/reprocess/route.ts:79",
     "dispatchWorker() sem await e sem tratamento de erro",
     "Após enfileirar o job, a rota dispara o worker em fire-and-forget (fetch sem await, catch vazio). Se o POST do worker falhar (ex.: cold start/timeout), o relatório fica na fila até o próximo cron.",
     "Não é uma falha de segurança — é resilência: atraso no processamento.",
     "Impacto operacional baixo. Nenhum dado exposto.",
     "Opcional: retry ou aguardar o cron de 5 min. Sem ação de segurança."),
    ("A2", "Banco sem trava (RLS)", "informativa",
     "src/app/admin/fila/page.tsx:118-133 e 152-280",
     "Página /admin/fila não valida sessão no cliente",
     "A página 'Fila de relatórios' não chama getAdminSessionInfo() e não redireciona para /login; a UI fica disponível. Os dados, porém, só vêm do /api/admin-proxy/dashboard, que valida requireManager no servidor.",
     "Nenhuma exploração possível — a proteção real está no backend.",
     "Cosmético/UX.",
     "Opcional: replicar o fluxo de login do /admin."),
    ("B1", "Permissão no navegador", "critica",
     "src/lib/auth/guard.ts:7-15",
     "isManagerEmail() com allowlist vazia libera todo usuário autenticado do Supabase",
     "Quando MANAGER_EMAILS não está configurado (ou vazio), `if (allowlist.length === 0) return true` — qualquer conta do Supabase Auth passa em requireManager()/loginAdmin() e acessa todo o painel admin e todas as RPCs de fila.",
     "Qualquer pessoa que consiga autenticar (o admin panel aceita qualquer e-mail+senha no fluxo de login do Supabase) vira gerente: lê todos os leads (PII), enfileira relatórios com custo de LLM.",
     "Exposição total dos dados de leads (nome, e-mail, telefone, empresa, respostas) e custo de LLM/Exa/Resend.",
     "Fail-closed: remover o `return true`; exigir MANAGER_EMAILS em produção (validação de env fail-fast) ou usar papel gerenciado por claim do Supabase."),
    ("C1", "IDOR", "informativa",
     "src/app/api/admin/scoring-config/[id]/activate/route.ts:28",
     "Ativação de versão de calibração sem verificação de posse",
     "O parâmetro `id` (path) é usado para ativar uma scoring_versions; não há conceito de dono. O privilégio é o requisito (requireManager), que é validado.",
     "Apenas gerentes alcançam a rota. Não há tenant/usuario final.",
     "Sem impacto — dados de calibração são internos.",
     "Nenhuma ação (administrativo legítimo)."),
    ("D1", "Chaves expostas", "media",
     "src/lib/service/analysis-service.ts:149",
     "Fallback de e-mail do relatório aponta para 'comercial@rhemadata.com'",
     "Quando MANAGER_NOTIFICATION_EMAIL não está configurado, o relatório do lead (com PII) é enviado para 'comercial@rhemadata.com' (domínio real da Rhema Data). O mesmo e-mail fica como default de RESEND_FROM_EMAIL em src/lib/email/send-report.ts:22.",
     "Se o env não for sobrescrito, o e-mail de vendas em produção é endereço real não controlado pela aplicação; não há validação fail-fast de MANAGER_NOTIFICATION_EMAIL no getSecrets().",
     "Vazamento de dados de leads para endereço possivelmente incorreto/desatualizado; ausência de fail-fast de segredos.",
     "Remover o default real; tornar MANAGER_NOTIFICATION_EMAIL obrigatório em produção (env.ts) e usar um endereço placeholder."),
    ("D2", "Chaves expostas", "baixa",
     "src/middleware.ts:14-18 (e src/app/api/leads/route.ts:28-30)",
     "Rate limit idêntico (5 req/10 min) para a rota de honeypot (detalhe menor)",
     "O limite da rota pública de leads é 5/10min e o honeypot retorna 200 ok. Não é um vazamento de chave; só observação de hardening.",
     "Sem explorabilidade.",
     "Nenhum.",
     "Nenhuma ação."),
    ("E1", "Input sem tratamento (XSS)", "media",
     "src/lib/service/analysis-service.ts:155 (escapeHtml local)",
     "Email HTML do relatório escapa manualmente apenas o nome/cargo/faixa",
     "O HTML do e-mail usa escapeHtml() local para nome, cargo e faixa (string) — mitigação correta para esses campos. Mas o objeto completo do lead entra apenas como texto escapado; não há sanitização de HTML/URLs vindos do LLM (research.sources são URLs de terceiros e entram em relatórios internos).",
     "A superfície de XSS real é baixa: os únicos campos refletidos em HTML são escapados. Fontes externas (Exa/LLM) entram apenas em PDF e prompts, não em HTML de e-mail.",
     "Se um campo futuro refletir conteúdo do LLM sem escape, vira XSS no e-mail (menos crítico) — hoje não há XSS verificado no e-mail.",
     "Opcional: usar biblioteca de sanitização de HTML (ex.: DOMPurify server) e nunca confiar em conteúdo do LLM em HTML."),
    ("E2", "Input sem tratamento (XSS)", "baixa",
     "src/app/diagnostico/page.tsx:19,66-102",
     "Draft do diagnóstico fica no localStorage com TTL de 24h",
     "O rascunho (formulário completo do lead) persiste 24h no localStorage. Se o dispositivo for compartilhado, outra pessoa pode reler o rascunho no mesmo navegador. Não há XSS — o React escapa tudo e não há dangerouslySetInnerHTML no projeto.",
     "Baixa (é o próprio usuário; não há XSS).",
     "Privacidade local de dispositivo compartilhado.",
     "Opcional: limpar o rascunho após envio (já feito) e reduzir o TTL."),
]

STRENGTHS = [
    ("RLS em todas as tabelas sem policies p/ anon/authenticated",
     "0003 (diagnostics), 0005 (assessment_responses), 0007 (market_insights, analysis_job_logs) e 0014 (scoring_versions) habilitam RLS sem nenhuma policy para anon/authenticated — só a service role acessa, que reside no servidor. Verificado migration a migration."),
    ("RPCs de fila revogadas de anon/authenticated",
     "0013_revoke_queue_rpc_execute.sql faz REVOKE EXECUTE de todas as funções analysis_queue_* de PUBLIC/anon/authenticated e GRANT apenas para service_role. Fecha o ataque de chamar pgmq/SQL via PostgREST."),
    ("Verificação de privilégio real no servidor em todas as rotas de escrita",
     "Dashboard, reprocess e scoring-config exigem requireManager() (getUser() do Supabase) + INTERNAL_API_KEY no handler. O frontend (admin) não decide acesso: a UI esconde botões, mas o backend re-valida sempre. Nenhuma rota sensível confia no gate do navegador."),
    ("Nenhuma rota pública expõe objeto por ID; públicos têm rate limit + honeypot",
     "/api/public-proxy/leads e /screener são os únicos públicos; ambos sem IDOR (ID só reutiliza o próprio lead por e-mail; honeypot descarta bots). Middleware aplica rate limit por IP a todos os proxies públicos/admin."),
    ("Sem segredos no cliente; timing-safe nas comparações",
     "Nenhum NEXT_PUBLIC_* contém segredo (verificado no bundle: apenas URL/anon key públicos). INTERNAL_API_KEY, CRON_SECRET, RESEND_API_KEY, service role só no servidor. verifyInternalApiKey usa SHA-256 + timingSafeEqual; CRON_SECRET idem. .env*.local estão no .gitignore."),
    ("Sem XSS no frontend e conteúdo LLM/Exa validado por Zod + clamp",
     "Nenhum dangerouslySetInnerHTML/innerHTML/eval no projeto (varredura). Texto do lead entra no e-mail com escape HTML (escapeHtml) e em prompts com stripControlChars/clamp. Saídas do LLM passam por schemas Zod .strict()."),
]

RECS = [
    ("P1", "Corrigir o fail-open do gate de gerente (A1→B1)",
     "Eliminar o `return true` de isManagerEmail() quando a allowlist está vazia (guard.ts:13) e tornar MANAGER_EMAILS obrigatório no ambiente de produção com validação fail-fast no módulo de env (src/lib/env.ts). Comportamento fail-closed: sem allowlist, nenhum usuário é gerente."),
    ("P2", "Tornar obrigatórios MANAGER_NOTIFICATION_EMAIL e remover defaults reais",
     "Em src/lib/env.ts, adicionar MANAGER_NOTIFICATION_EMAIL e RESEND_FROM_EMAIL como obrigatórios em produção; remover o fallback 'comercial@rhemadata.com' (analysis-service.ts:149, send-report.ts:22) e o RESEND_FROM_EMAIL default, deixando apenas placeholder."),
    ("P3", "Validação de startup (fail-fast) de todos os segredos de produção",
     "Chamar getSecrets() (src/lib/env.ts) em um healthcheck/startup para que INTERNAL_API_KEY, CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, MANAGER_NOTIFICATION_EMAIL, LLM_API_KEY, EXA_API_KEY falhem rápido quando ausentes, impedindo que defaults/fallbacks entrem em operação."),
    ("P4", "Elevar a validação do HTML do e-mail para biblioteca de sanitização",
     "Trocar o escape manual por sanitização de HTML dedicada (ex.: DOMPurify server) no ponto de montagem do e-mail em analysis-service.ts e revisar qualquer novo campo refletido em HTML. Bloquear URLs javascript: em hrefs gerados por conteúdo do LLM."),
]

ISSUES = [
    (
        "[Segurança] Gate de gerente abre por padrão (allowlist vazia = todos autenticados)",
        ["security", "critica"],
        """O controle de acesso ao painel administrativo e às RPCs de fila depende de `isManagerEmail()` em `src/lib/auth/guard.ts`. Quando a variável `MANAGER_EMAILS` não está configurada (ou é vazia), o código retorna `true` para qualquer e-mail — ou seja, **qualquer usuário autenticado do Supabase Auth vira gerente**. Como o painel admin aceita qualquer e-mail/senha no fluxo de login (sem restrição), isso expõe todos os leads (PII) e o pipeline de relatórios (custo de LLM/Exa/Resend).

**Evidência (src/lib/auth/guard.ts:7-15):**
```ts
export function isManagerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env[MANAGER_ALLOWLIST_ENV] ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) return true;   // <-- fail-open
  return allowlist.includes(email.toLowerCase());
}
```

**Impacto:** vazamento de dados pessoais de leads (nome, e-mail, telefone, empresa, respostas do diagnóstico), geração de relatórios não autorizados (custo financeiro), acesso a logs de processamento.

**Correção sugerida:** remover o `return true` e adotar fail-closed: sem allowlist configurada, nenhum usuário é gerente. Tornar `MANAGER_EMAILS` obrigatório em produção com validação fail-fast no módulo `src/lib/env.ts`.

**Critérios de aceite:**
- [ ] `isManagerEmail` retorna `false` quando a allowlist está vazia
- [ ] `MANAGER_EMAILS` obrigatório em produção (env.ts) com falha no boot se ausente
- [ ] Teste unitário cobrindo allowlist vazia → acesso negado
- [ ] Teste E2E manual: usuário fora da allowlist recebe 401 no /api/admin-proxy/dashboard"""
    ),
    (
        "[Segurança] Defaults de e-mail para domínio real e sem fail-fast de segredos",
        ["security", "media"],
        """Dois problemas relacionados de configuração:

1. `src/lib/service/analysis-service.ts:149` usa `MANAGER_NOTIFICATION_EMAIL ?? "comercial@rhemadata.com"` — um e-mail real da organização. Se a variável não for sobrescrita, relatórios com PII de leads vão para um endereço não gerenciado pela aplicação.
2. `src/lib/email/send-report.ts:22` usa o mesmo domínio como `RESEND_FROM_EMAIL` default.
3. `src/lib/env.ts` (getSecrets) marca `RESEND_API_KEY`, `MANAGER_NOTIFICATION_EMAIL` e `CRON_SECRET` como opcionais — sem validação fail-fast de startup, defaults silenciosos entram em produção.

**Evidência (src/lib/service/analysis-service.ts:149):**
```ts
const to = process.env.MANAGER_NOTIFICATION_EMAIL ?? "comercial@rhemadata.com";
```

**Impacto:** envio indevido de dados pessoais para endereço incorreto; ausência de garantia de configuração correta de segredos em produção.

**Correção sugerida:** remover os defaults reais, deixando placeholders; tornar `MANAGER_NOTIFICATION_EMAIL` e `RESEND_FROM_EMAIL` obrigatórios em produção; chamar `getSecrets()` no startup/healthcheck para falhar rápido.

**Critérios de aceite:**
- [ ] Nenhum domínio real em fallback de código (apenas placeholder)
- [ ] `MANAGER_NOTIFICATION_EMAIL` e `RESEND_FROM_EMAIL` obrigatórios em produção no schema de env
- [ ] Teste de env: ausência de variável → erro de boot
- [ ] Chamada de `getSecrets()` no healthcheck"""
    ),
    (
        "[Segurança] Ratelimit por IP pode ser burlado por proxy traseiro em redes internas (info)",
        ["security", "baixa"],
        """O rate limit de rota usa a última entrada de `x-forwarded-for` (src/middleware.ts:49-58). Em deploy direto na Vercel, o upstream sobrescreve o header com o IP real do cliente — correto. Porém, se a aplicação for servida atrás de outro proxy que concatene XFF sem sobrescrever, a última entrada pode ser forjada pelo cliente, anulando o limite por IP.

**Evidência (src/middleware.ts:49-58):**
```ts
const fwd = req.headers.get("x-forwarded-for");
if (fwd) {
  const parts = fwd.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length > 0) return parts[parts.length - 1];
}
```

**Impacto:** baixo no deploy Vercel; em outros hosts, possibilidade de contornar o limite de 5 req/10 min das rotas públicas.

**Correção sugerida:** documentar que o deploy deve usar plataforma que sobrescreva o XFF (Vercel); caso contrário, configurar proxy de confiança que trunque/sobrescreva o header antes de chegar ao app.

**Critérios de aceite:**
- [ ] Documentado o requisito de XFF sobrescrito pelo upstream
- [ ] (Opcional) configuração de trusted-proxy para a ordem correta"""
    ),
    (
        "[Segurança] Escape manual de HTML no e-mail deve ser substituído por sanitização de biblioteca",
        ["security", "media"],
        """O e-mail do relatório escapa manualmente nome, cargo e faixa com `escapeHtml()` local (src/lib/service/analysis-service.ts:77-84). A prática atual protege os campos refletidos, mas é frágil: qualquer campo novo refletido em HTML sem o mesmo escape reintroduz XSS. Não há biblioteca de sanitização de HTML (ex.: DOMPurify) no projeto para conteúdo não-confiável vindo de LLM/Exa.

**Evidência (src/lib/service/analysis-service.ts:155):**
```ts
html: `<p>Diagnóstico recebido de <strong>${escapeHtml(opts.payload!.solicitante.nome)}</strong> (${escapeHtml(opts.payload!.solicitante.cargo)}).</p><p>Faixa: <strong>${escapeHtml(opts.payload!.score.faixa)}</strong></p>`,
```

**Impacto:** hoje baixo (campos refletidos são escapados); risco cresce com novos campos ou conteúdo do LLM refletido em HTML.

**Correção sugerida:** centralizar a construção do e-mail e usar sanitização de HTML por biblioteca; bloquear protocolos `javascript:` em URLs vindas do LLM.

**Critérios de aceite:**
- [ ] E-mail construído via helper único com sanitização de biblioteca
- [ ] Teste com payload `<img onerror=...>` não renderiza script
- [ ] Nenhum href com `javascript:` permitido em conteúdo do LLM"""
    ),
]

CATS = ["Banco sem trava (RLS)", "Permissão no navegador", "IDOR", "Chaves expostas", "Input sem tratamento (XSS)"]
SEV_ORDER = ["critica", "alta", "media", "baixa", "informativa"]

def total_por_sev():
    counts = {k: 0 for k in SEV_ORDER}
    for f in FINDINGS:
        counts[f[2]] += 1
    return counts

def total_por_cat():
    counts = {c: 0 for c in CATS}
    for f in FINDINGS:
        counts[f[1]] += 1
    return counts

# ---------------------------------------------------------------- charts
def build_charts():
    sev = total_por_sev()
    cat = total_por_cat()

    fig, ax = plt.subplots(figsize=(3.4, 3.4), dpi=200)
    sizes = [sev[k] for k in SEV_ORDER if sev[k] > 0]
    labels = [SEV[k][1] for k in SEV_ORDER if sev[k] > 0]
    cols = [PALETTE[k] for k in SEV_ORDER if sev[k] > 0]
    if not sizes:
        sizes, labels, cols = [1], ["Sem achados"], ["#D1D5DB"]
    ax.pie(sizes, labels=labels, colors=cols, autopct="%d",
           startangle=90, textprops={"fontsize": 8, "color": "#111827"},
           wedgeprops={"edgecolor": "white", "linewidth": 1.2})
    ax.set_aspect("equal")
    donut = plt.Circle((0, 0), 0.6, transform=ax.transData, fc="white", zorder=2)
    ax.add_artist(donut)
    ax.text(0, 0, f"{len(FINDINGS)}\nachados", ha="center", va="center",
            fontsize=9, fontweight="bold", color="#111827")
    fig.tight_layout()
    donut_path = os.path.join(IMG_CHART_DIR, "donut.png")
    fig.savefig(donut_path, transparent=True)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(6.9, 2.5), dpi=200)
    x = list(range(len(CATS)))
    vals = [cat[c] for c in CATS]
    ax.bar(x, vals, color="#3B2366", width=0.6)
    ax.set_xticks(x)
    ax.set_xticklabels([c.split(" (")[0] for c in CATS], fontsize=6.4, rotation=12, ha="right")
    ax.set_ylabel("Achados", fontsize=8)
    ax.tick_params(axis="y", labelsize=7)
    for i, v in enumerate(vals):
        ax.text(i, v + 0.05, str(v), ha="center", fontsize=8, fontweight="bold")
    ax.set_ylim(0, max(vals) + 1 if vals else 1)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    bars_path = os.path.join(IMG_CHART_DIR, "bars.png")
    fig.savefig(bars_path, transparent=True)
    plt.close(fig)
    return donut_path, bars_path

# ---------------------------------------------------------------- helpers
def chip(sev_key):
    color = PALETTE[sev_key]
    return Table([[Paragraph(SEV[sev_key][1], ParagraphStyle(
        "chip", fontName="Helvetica-Bold", fontSize=8, leading=10,
        textColor=colors.white, alignment=TA_CENTER))]],
        colWidths=[2.2 * cm], rowHeights=[0.5 * cm])
    pass

def severity_colored(sev_key):
    color = PALETTE[sev_key]
    return Table([[Paragraph(SEV[sev_key][1], ParagraphStyle(
        "chip", fontName="Helvetica-Bold", fontSize=8, leading=10,
        textColor=colors.white, alignment=TA_CENTER))]],
        colWidths=[2.0 * cm], rowHeights=[0.5 * cm])

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(HEAD)
    canvas.rect(0, H - 1.0 * cm, W, 1.0 * cm, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(MARGIN, H - 0.7 * cm, "Relatório de Auditoria de Segurança — Diagnos Data App")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(W - MARGIN, H - 0.7 * cm, "Confidencial")
    canvas.setStrokeColor(colors.HexColor("#D9D5E0"))
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 1.15 * cm, W - MARGIN, 1.15 * cm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUT)
    canvas.drawString(MARGIN, 0.8 * cm, "Diagnos Data App — Auditores internos")
    canvas.drawRightString(W - MARGIN, 0.8 * cm, f"Página {doc.page}")
    canvas.restoreState()

def code_block(text):
    return Preformatted(text, ST_ISSUE)

# ---------------------------------------------------------------- build
def build():
    donut, bars = build_charts()
    doc = BaseDocTemplate(PDF_PATH, pagesize=A4,
                          leftMargin=MARGIN, rightMargin=MARGIN,
                          topMargin=1.5 * cm, bottomMargin=1.5 * cm,
                          title="Relatório de Auditoria de Segurança — Diagnos Data App",
                          author="Rhema Data — Time de Engenharia")
    frame = Frame(MARGIN, 1.5 * cm, W - 2 * MARGIN, H - 3.0 * cm, id="main")
    doc.addPageTemplates([PageTemplate(id="page", frames=[frame], onPage=header_footer)])

    E = []
    # ---------------------------------------------------------- capa
    E.append(Spacer(1, 2.2 * cm))
    E.append(Paragraph("RELATÓRIO DE AUDITORIA", ST_SUB))
    E.append(Paragraph("de Segurança", ST_SUB))
    E.append(Spacer(1, 0.6 * cm))
    E.append(Paragraph("Diagnos Data App", ParagraphStyle(
        "big", parent=ST_TITLE, fontSize=30, leading=36)))
    E.append(Spacer(1, 0.9 * cm))
    E.append(Paragraph("Data: 01 de setembro de 2026", ST_SUB))
    E.append(Spacer(1, 0.4 * cm))
    E.append(Paragraph("Escopo: aplicação Next.js 14 · Supabase (PostgreSQL/RLS) · Resend · Vercel", ST_SUB))
    E.append(Spacer(1, 2.6 * cm))

    E.append(Table([[Paragraph(
        "<b>Nota metodológica.</b> A auditoria foi conduzida sobre o código-fonte real do repositório "
        "diagnos-data-app (branch atual). A stack detectada é: Next.js 14 (App Router) + TypeScript estrito; "
        "Supabase (PostgreSQL gerenciado com RLS) como datastore; Supabase Auth (JWT) para o painel admin; "
        "Resend para e-mail; @react-pdf/renderer para PDF; deploy na Vercel; fila pgmq com RPCs PL/pgSQL. "
        "Cada categoria foi mapeada à stack da seguinte forma: (1) <i>Banco sem trava</i> = análise de RLS e de "
        "políticas nas 12 migrations, ausência de filtro por usuário/tenant nas queries; (2) <i>Permissão no "
        "navegador</i> = cruzamento de cada gate de UI do painel admin com a validação equivalente no servidor "
        "(requireManager + INTERNAL_API_KEY) em todas as rotas; (3) <i>IDOR</i> = varredura exaustiva de todos "
        "os 13 handlers de rota de backend e 5 repositórios, verificando posse/tenant por objeto; (4) <i>Chaves "
        "expostas</i> = hardcode em código, config, migrations, histórico git (git log -p -S) e bundle do "
        "frontend, mais defaults de segredo que viram reais se não sobrescritos; (5) <i>Input sem tratamento</i> "
        "= varredura por dangerouslySetInnerHTML/innerHTML/eval no frontend e por entrada de usuário em HTML de "
        "e-mail, templates e prompts de LLM. Achados reportados apenas com evidência verificada (arquivo:linha).",
        ST_SMALL)]], colWidths=[W - 2 * MARGIN]))
    E.append(PageBreak())

    # ---------------------------------------------------------- executivo
    E.append(Paragraph("1. Resumo Executivo", ST_H1))
    E.append(Paragraph(
        "Foram auditados 13 handlers de API, 5 repositórios, 7 serviços, 12 migrations SQL e as páginas "
        "do frontend (landing, screener e painel admin). O projeto apresenta uma postura de segurança "
        "acima da média: RLS sem policies em todas as tabelas, comparações timing-safe, proxy com chave "
        "interna, rate limit nas rotas públicas e validação Zod em todas as fronteiras. Os achados de maior "
        "gravidade concentram-se em <b>configuração (fail-open do gate de gerente)</b> e em <b>defaults de "
        "configuração</b>, não em lógica de autorização nas rotas.", ST_BODY))
    E.append(Spacer(1, 0.2 * cm))

    sev = total_por_sev()
    cat = total_por_cat()
    n_crit = sev["critica"]; n_alt = sev["alta"]; n_med = sev["media"]
    n_bai = sev["baixa"]; n_info = sev["informativa"]

    stat_rows = [
        [Paragraph("Severidade", ST_CELL_B), Paragraph("Qtd", ST_CELL_B), Paragraph("Cor", ST_CELL_B)],
        ["Crítica", str(n_crit), "■"],
        ["Alta", str(n_alt), "■"],
        ["Média", str(n_med), "■"],
        ["Baixa", str(n_bai), "■"],
        ["Informativa", str(n_info), "■"],
        ["Total", str(len(FINDINGS)), "■"],
    ]
    t = Table(stat_rows, colWidths=[4 * cm, 2 * cm, 2 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEAD),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor(LIGHT)),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8F7FC")]),
        ("BACKGROUND", (0, 6), (-1, 6), colors.HexColor("#EFF6FF")),
        ("FONTNAME", (0, 6), (-1, 6), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
    ]))
    E.append(t)
    E.append(Spacer(1, 0.3 * cm))

    img_w = 6.4 * cm
    E.append(Image(donut, width=img_w, height=img_w * (3.4 / 3.4)))
    E.append(Paragraph("Distribuição por severidade", ST_SMALL))
    E.append(Spacer(1, 0.2 * cm))
    E.append(Image(bars, width=15.5 * cm, height=15.5 * cm * (2.5 / 6.9)))
    E.append(Paragraph("Achados por categoria", ST_SMALL))
    E.append(Spacer(1, 0.3 * cm))

    E.append(Paragraph("Classificação das categorias auditadas", ST_H2))
    for c in CATS:
        E.append(Paragraph(f"<b>{c}</b> — {cat[c]} achado(s).", ST_BODY))
    E.append(Paragraph(
        "<b>Observação importante:</b> um achado ('crítica') é a única vulnerabilidade real de alto impacto; "
        "é uma questão de configuração fail-open, não de ausência de verificação nas rotas. As demais são "
        "recomendações de hardening (média/baixa/informativa).", ST_BODY))
    E.append(PageBreak())

    # ---------------------------------------------------------- fortes e fracos
    E.append(Paragraph("2. Pontos Fortes (verificados)", ST_H1))
    for title, body in STRENGTHS:
        E.append(Paragraph(f"<b>• {title}.</b> {body}", ST_BODY))
    E.append(Spacer(1, 0.2 * cm))

    E.append(Paragraph("3. Pontos Fracos (riscos centrais)", ST_H1))
    E.append(Paragraph(
        "3.1 <b>Gate de gerente fail-open.</b> src/lib/auth/guard.ts:13 — com MANAGER_EMAILS vazio, qualquer "
        "usuário autenticado do Supabase acessa o painel. Único achado de severidade crítica.", ST_BODY))
    E.append(Paragraph(
        "3.2 <b>Defaults de configuração com domínio real.</b> analysis-service.ts:149 e send-report.ts:22 "
        "usam 'comercial@rhemadata.com' como fallback de e-mail de relatório (PII) e remetente; env.ts não "
        "valida esses segredos em startup (fail-fast ausente).", ST_BODY))
    E.append(Paragraph(
        "3.3 <b>Escape manual de HTML no e-mail.</b> analysis-service.ts:155 — funciona para os campos atuais, "
        "mas sem biblioteca de sanitização o risco de XSS reaparece em qualquer campo novo refletido em HTML.", ST_BODY))
    E.append(Paragraph(
        "3.4 <b>Rate limit por IP dependente do upstream.</b> middleware.ts:49-58 — correto na Vercel; fora dela, "
        "pode ser burlado por XFF forjado.", ST_BODY))
    E.append(PageBreak())

    # ---------------------------------------------------------- tabela de achados
    E.append(Paragraph("4. Achados Detalhados por Categoria", ST_H1))
    E.append(Paragraph(
        "Severidade | Arquivo:linha | Descrição e evidência. Legenda: <b>Crítica</b> = exploração remota sem "
        "pré-requisitos; <b>Alta</b> = requer autenticação mas impacto alto; <b>Média</b> = condicional a "
        "configuração; <b>Baixa</b> = hardening; <b>Informativa</b> = sem exploração real, registro de cobertura.", ST_SMALL))
    E.append(Spacer(1, 0.2 * cm))

    for f in FINDINGS:
        fid, cat, sev_key, ref, title, desc, exploit, impact, fix = f
        chip_tbl = severity_colored(sev_key)
        head = Table([[chip_tbl, Paragraph(
            f"<b>{fid} · {cat}</b> — {title}<br/><font size=7.5 color='#6B7280'>{ref}</font>",
            ParagraphStyle("rowhead", fontName="Helvetica", fontSize=10, leading=13, textColor=INK))]],
            colWidths=[2.2 * cm, W - 2 * MARGIN - 2.2 * cm])
        head.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        body = Paragraph(
            f"<b>Descrição:</b> {desc}<br/><b>Explorável:</b> {exploit}<br/><b>Impacto:</b> {impact}<br/>"
            f"<b>Correção:</b> {fix}", ST_CELL)
        E.append(KeepTogether([head, body]))
        E.append(Spacer(1, 0.25 * cm))

    E.append(PageBreak())

    # ---------------------------------------------------------- recomendações
    E.append(Paragraph("5. Recomendações Priorizadas", ST_H1))
    for prio, title, body in RECS:
        E.append(Paragraph(f"<b>{prio} — {title}.</b> {body}", ST_BODY))
    E.append(Spacer(1, 0.3 * cm))
    E.append(Paragraph(
        "Ordem sugerida: P1 (crítica, fail-open) → P2 (defaults reais) → P3 (fail-fast de env) → P4 (sanitização). "
        "P1 bloqueia o risco de vazamento de dados; P2/P3 evitam defaults silenciosos; P4 endurece o e-mail.", ST_BODY))
    E.append(PageBreak())

    # ---------------------------------------------------------- issues github
    E.append(Paragraph("6. Issues para o GitHub", ST_H1))
    E.append(Paragraph(
        "Issues prontas para copiar e colar. Labels sugeridas: <b>security</b> + severidade correspondente. "
        "Achados triviais relacionados foram agrupados por tema para evitar spam.", ST_SMALL))
    E.append(Spacer(1, 0.2 * cm))

    for i, (title, labels, body) in enumerate(ISSUES, start=1):
        sep = f"--- ISSUE {i} ---"
        end = f"--- FIM ISSUE {i} ---"
        content = sep + "\n" + title + "\nLabels: " + ", ".join(labels) + "\n\n" + body + "\n" + end
        block = code_block(content)
        E.append(block)
        E.append(Spacer(1, 0.35 * cm))

    doc.build(E)
    print(f"OK -> {PDF_PATH}")
    print(f"Páginas esperadas: ~{len(E)} itens, verificar com leitor.")

if __name__ == "__main__":
    build()
