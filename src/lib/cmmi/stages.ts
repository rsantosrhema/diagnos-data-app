export interface CmmiStage {
  rotulo: string;
  cor: string;
  range: { min: number; max: number };
  descricaoExecutiva: string;
  caracteristicas: string[];
  sinaisRisco: string[];
  comoSubir: string[];
}

const RHEMA_ROXO_INSTITUCIONAL = "#4A2C7D";
const RHEMA_ROXO_ESCURO = "#3B2366";

const FALLBACK_STAGE: Omit<CmmiStage, "rotulo"> = {
  cor: RHEMA_ROXO_ESCURO,
  range: { min: 0, max: 5 },
  descricaoExecutiva:
    "Não foi possível classificar a maturidade em um estágio específico. Revise o resultado do diagnóstico.",
  caracteristicas: [
    "Perfil de maturidade não classificado em um dos cinco estágios padrão.",
  ],
  sinaisRisco: [
    "Resultado do diagnóstico inconsistente com as faixas conhecidas.",
  ],
  comoSubir: [
    "Rode novamente o diagnóstico para obter uma classificação válida.",
  ],
};

const STAGES: Record<string, Omit<CmmiStage, "rotulo">> = {
  Inicial: {
    cor: RHEMA_ROXO_ESCURO,
    range: { min: 1.0, max: 1.8 },
    descricaoExecutiva:
      "Dados são tratados de forma reativa. Risco alto de decisão baseada em número errado.",
    caracteristicas: [
      "Planilhas soltas e relatórios manuais por área.",
      "Sem dono formal para os dados críticos.",
      "Iniciativas de dados aparecem só quando há incidente.",
    ],
    sinaisRisco: [
      "Decisões tomadas sobre números que divergem entre relatórios.",
      "Dependência total de pessoas específicas para reprocessar dados.",
      "Falhas de dados descobertas pelos clientes, não pela empresa.",
    ],
    comoSubir: [
      "Mapeie os dados críticos para o negócio e seus donos.",
      "Padronize os relatórios prioritários em uma fonte única.",
      "Defina pelo menos uma métrica de qualidade de dados.",
    ],
  },
  Emergente: {
    cor: RHEMA_ROXO_ESCURO,
    range: { min: 1.8, max: 2.6 },
    descricaoExecutiva:
      "Existem iniciativas isoladas, mas dependentes de pessoas específicas.",
    caracteristicas: [
      "Projetos de dados isolados por área ou por iniciativa pessoal.",
      "Ferramentas de BI presentes, mas sem padrão de uso.",
      "Conhecimento de dados concentrado em poucas pessoas.",
    ],
    sinaisRisco: [
      "Perda de capacidade quando o especialista sai ou entra de férias.",
      "SLAs de entrega de dados não cumpridos sem consequência.",
      "Investimentos em ferramenta sem processo que a sustente.",
    ],
    comoSubir: [
      "Documente os processos que hoje vivem na cabeça de poucos.",
      "Crie um comitê ou responsável por padronizar iniciativas.",
      "Priorize a integração entre as fontes mais usadas.",
    ],
  },
  Estruturado: {
    cor: RHEMA_ROXO_INSTITUCIONAL,
    range: { min: 2.6, max: 3.4 },
    descricaoExecutiva:
      "Base técnica existe. O gargalo costuma ser governança e processo, não tecnologia.",
    caracteristicas: [
      "Data warehouse ou lakehouse em operação.",
      "Processos de dados definidos, mas nem sempre seguidos.",
      "Papéis de dados formalizados ao menos parcialmente.",
    ],
    sinaisRisco: [
      "Governança formal não pauta as decisões do dia a dia.",
      "Duplicidade de definições de métrica entre áreas.",
      "Qualidade de dados monitorada, mas sem circuito de correção.",
    ],
    comoSubir: [
      "Formalize políticas de dados com executivos como donos.",
      "Implemente catálogo e linhagem para as áreas críticas.",
      "Estabeleça metas de qualidade com consequências de gestão.",
    ],
  },
  Gerenciado: {
    cor: RHEMA_ROXO_INSTITUCIONAL,
    range: { min: 3.4, max: 4.2 },
    descricaoExecutiva:
      "Dados são ativo gerenciado. Ganhos vêm de escala e automação.",
    caracteristicas: [
      "Governança ativa com métricas acompanhadas pela liderança.",
      "Pipeline de dados automatizado com monitoramento.",
      "Qualidade e metadados medidos de forma recorrente.",
    ],
    sinaisRisco: [
      "Custos de plataforma crescendo mais rápido que o valor gerado.",
      "Escala dependente de time central, sem autonomia do negócio.",
      "Casos avançados de IA travados por gargalos de operação.",
    ],
    comoSubir: [
      "Amplie self-service para múltiplas áreas com guardrails.",
      "Automatize correção e enriquecimento de dados recorrentes.",
      "Rode múltiplos casos de uso avançado com racional de valor.",
    ],
  },
  Otimizado: {
    cor: RHEMA_ROXO_INSTITUCIONAL,
    range: { min: 4.2, max: 5.0 },
    descricaoExecutiva:
      "Maturidade alta. Foco em melhoria contínua e casos avançados.",
    caracteristicas: [
      "Dados tratados como ativo de nível executivo.",
      "Autonomia analítica ampla com controles maduros.",
      "Experimentação e IA operando em produção.",
    ],
    sinaisRisco: [
      "Comodidade: melhoria contínua sem novos marcos de negócio.",
      "Complexidade de plataforma acima do necessário.",
      "Conformidade e ética de dados exigindo reforço constante.",
    ],
    comoSubir: [
      "Institucionalize otimização contínua com metas executivas.",
      "Avalie custo-benefício e simplificação da arquitetura.",
      "Lidere benchmark setorial em governança de dados e IA.",
    ],
  },
};

export const CMMI_BAND_LABELS = Object.keys(STAGES);

export function getStageByFaixa(rotulo: string): CmmiStage {
  const stage = STAGES[rotulo] ?? FALLBACK_STAGE;
  return { rotulo, ...stage };
}
