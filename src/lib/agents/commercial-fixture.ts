import { DIMENSION_IDS } from "@/lib/screener/contract";
import { OBJECTION_GROUP_IDS, SERVICE_IDS } from "@/lib/comercial/catalog";
import {
  ARSENAL_LIMITS,
  commercialArsenalSchema,
  type CommercialArsenal,
} from "./commercial-types";

function textAtLimit(max: number): string {
  let text = "dado";
  while (text.length < max) text += " dado";
  return text.slice(0, max).trimEnd().padEnd(max, "x");
}

export function makeMaxArsenal(): CommercialArsenal {
  const dimensoes = [...DIMENSION_IDS];
  const formatos = [
    "aberta",
    "aberta",
    "fechada",
    "aberta",
    "aberta",
    "fechada",
    "aberta",
    "aberta",
    "fechada",
    "fechada",
  ] as const;
  const etapas = [
    "situacao",
    "problema",
    "problema",
    "problema",
    "implicacao",
    "implicacao",
    "implicacao",
    "necessidade",
    "necessidade",
    "necessidade",
  ] as const;

  return commercialArsenalSchema.parse({
    pontos_chave: Array.from({ length: ARSENAL_LIMITS.pontosChave.max }, () => ({
      titulo: textAtLimit(ARSENAL_LIMITS.pontosChave.titulo),
      texto: textAtLimit(ARSENAL_LIMITS.pontosChave.texto),
      dimensao_ids: dimensoes,
    })),
    servico_recomendado: {
      servico_id: SERVICE_IDS[0],
      justificativa: textAtLimit(ARSENAL_LIMITS.servico.justificativa),
      dimensoes_atacadas: dimensoes,
      complementares: [SERVICE_IDS[1], SERVICE_IDS[2]],
    },
    objecoes: OBJECTION_GROUP_IDS.map((grupo) => ({
      grupo,
      objecao_provavel: textAtLimit(ARSENAL_LIMITS.objecoes.objecaoProvavel),
      contorno: textAtLimit(ARSENAL_LIMITS.objecoes.contorno),
      apoio: textAtLimit(ARSENAL_LIMITS.objecoes.apoio),
    })),
    perguntas: formatos.map((formato, index) => ({
      texto: textAtLimit(ARSENAL_LIMITS.perguntas.texto),
      formato,
      spin: etapas[index],
      objetivo: textAtLimit(ARSENAL_LIMITS.perguntas.objetivo),
    })),
  });
}

export function makeArsenal(overrides: Partial<CommercialArsenal> = {}): CommercialArsenal {
  return {
    pontos_chave: [
      {
        titulo: "Governança sem dono claro trava decisões",
        texto:
          "A empresa reconhece o tema, mas decisões dependem de conversas informais e pessoas específicas. Sem papéis definidos, cada área prioriza seu indicador e o comitê recebe versões diferentes do número.",
        dimensao_ids: ["d01", "d02"],
      },
      {
        titulo: "Dados mestres duplicados corroem a confiança nos indicadores",
        texto:
          "Cadastros de clientes e produtos se repetem entre sistemas, e cada área mantém a sua versão. O resultado aparece na conciliação manual e em relatórios que nunca fecham.",
        dimensao_ids: ["d04", "d06"],
      },
      {
        titulo: "Integrações manuais limitam a velocidade de novas entregas",
        texto:
          "Boa parte das integrações depende de planilhas e rotinas de uma única pessoa. Qualquer mudança de escopo vira um projeto caro, e a empresa perde velocidade para testar novos produtos.",
        dimensao_ids: ["d03", "d05"],
      },
      {
        titulo: "Autonomia analítica ainda depende de poucas pessoas",
        texto:
          "As áreas até têm acesso a ferramentas, mas poucas pessoas sabem transformar dado em decisão. A dependência de um time central cria fila de pedidos e afasta o negócio da informação de que precisa.",
        dimensao_ids: ["d08", "d10"],
      },
    ],
    servico_recomendado: {
      servico_id: "governanca",
      justificativa:
        "O diagnóstico mostra que a empresa investe em ferramentas e analistas, mas as decisões sobre dados seguem sem dono, sem política e sem fórum de priorização. O retrabalho das áreas nasce dessa ausência de papéis e regras. Antes de ampliar a plataforma, defina quem decide e como se resolve conflito.",
      dimensoes_atacadas: ["d01", "d04"],
      complementares: ["qualidade-mestres"],
    },
    objecoes: [
      {
        grupo: "preco",
        objecao_provavel:
          "O orçamento deste ano já está comprometido e a diretoria pediu para revisar qualquer investimento novo apenas no próximo ciclo.",
        contorno:
          "Reconheça a restrição orçamentária e separe o custo de não decidir do custo do projeto. Use o diagnóstico para mostrar retrabalho e decisões atrasadas, e proponha um recorte ligado a uma dor que a diretoria reconhece.",
        apoio:
          "O diagnóstico aponta governança e qualidade nos menores níveis, com relatórios divergentes e correção manual.",
      },
      {
        grupo: "timing",
        objecao_provavel: "Agora não é o momento; talvez no segundo semestre, depois do fechamento do ano.",
        contorno:
          "Pergunte o que precisa acontecer para o tema entrar na pauta e o que muda até lá. Se depender de outra área, proponha uma conversa conjunta; se depender de resultado, conecte o passo a um indicador já acompanhado.",
        apoio: "O diagnóstico já mostra decisões travadas por falta de dono e de fórum, o que tende a piorar com o crescimento.",
      },
      {
        grupo: "ja-temos",
        objecao_provavel: "Já temos um time de dados e uma ferramenta de BI contratada; não precisamos de ajuda externa.",
        contorno:
          "Valorize o existente e pergunte como o time decide prioridades e como as áreas acessam indicadores. A ferramenta resolve a visualização, não o acordo sobre regras, donos e qualidade. Posicione-se como reforço ao time.",
        apoio: "Governança e qualidade aparecem como os menores níveis, mesmo com ferramenta e time já presentes.",
      },
      {
        grupo: "risco-dados",
        objecao_provavel: "Trazer um parceiro para mexer nos nossos dados aumenta o risco de exposição e de não conformidade com a LGPD.",
        contorno:
          "Traga o tema para o centro da conversa em vez de evitá-lo. Explique como o trabalho começa por classificação, base legal e controle de acesso, e proponha que a primeira entrega seja o mapa de riscos e permissões.",
        apoio: "Segurança aparece como dimensão intermediária, com acesso informal e LGPD tratada no papel, o que aumenta o risco atual.",
      },
    ],
    perguntas: [
      {
        texto:
          "Como as decisões sobre dados são tomadas hoje: existe um comitê, um dono formal ou cada área decide o que priorizar sem uma instância comum?",
        formato: "aberta",
        spin: "situacao",
        objetivo: "Mapear como a empresa decide hoje, se existe instância formal de priorização e quem responde pelos dados críticos.",
      },
      {
        texto:
          "Quando duas áreas apresentam números diferentes para o mesmo indicador, como vocês descobrem qual versão está correta e quem resolve a divergência?",
        formato: "aberta",
        spin: "problema",
        objetivo:
          "Fazer o cliente nomear a dor da divergência de indicadores e revelar quem responde pela correção hoje.",
      },
      {
        texto: "Vocês têm um responsável formal pelos dados críticos da empresa?",
        formato: "fechada",
        spin: "problema",
        objetivo: "Confirmar se existe dono formal ou se a responsabilidade é difusa entre as áreas.",
      },
      {
        texto:
          "Quanto tempo do time é consumido hoje para conciliar cadastros, corrigir relatórios e explicar por que os números não fecham entre as áreas?",
        formato: "aberta",
        spin: "problema",
        objetivo:
          "Quantificar o esforço manual gasto em correção e conciliação, tornando a dor visível para o patrocinador.",
      },
      {
        texto:
          "Se a divergência de números continuar no próximo ciclo, que decisões de investimento ou de contratação podem ser adiadas ou tomadas com informação errada?",
        formato: "aberta",
        spin: "implicacao",
        objetivo:
          "Levar a dor ao custo de decisão: mostrar quais escolhas ficam travadas ou erradas enquanto os dados não são confiáveis.",
      },
      {
        texto: "A diretoria já deixou de aprovar um projeto por falta de confiança nos números?",
        formato: "fechada",
        spin: "implicacao",
        objetivo: "Confirmar com um exemplo concreto o impacto da desconfiança nos números sobre a decisão executiva.",
      },
      {
        texto:
          "Quando uma área pede um indicador novo, quanto tempo leva até a informação chegar e quantas pessoas precisam se envolver para entregar?",
        formato: "aberta",
        spin: "implicacao",
        objetivo:
          "Expor o custo de oportunidade da dependência analítica e o efeito da fila de pedidos sobre o negócio.",
      },
      {
        texto:
          "Como seria para vocês ter um dono claro por domínio de dados, com regras acordadas e um fórum que resolva conflitos de prioridade em vez de escalar caso a caso?",
        formato: "aberta",
        spin: "necessidade",
        objetivo:
          "Fazer o cliente descrever o valor de uma governança ativa, sem que o vendedor apresente a solução antes.",
      },
      {
        texto: "Se a governança estivesse funcionando, a diretoria confiaria mais nos indicadores?",
        formato: "fechada",
        spin: "necessidade",
        objetivo: "Confirmar o valor percebido de uma instância de governança para a confiança da diretoria.",
      },
      {
        texto: "Faria sentido começar por um recorte de governança ligado à qualidade dos dados?",
        formato: "fechada",
        spin: "necessidade",
        objetivo: "Fechar o próximo passo com um recorte pequeno, conectado à dor que o cliente já reconheceu.",
      },
    ],
    ...overrides,
  };
}
