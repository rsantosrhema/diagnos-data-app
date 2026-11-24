import type { CommercialArsenal } from "./commercial-types";

export function makeArsenal(overrides: Partial<CommercialArsenal> = {}): CommercialArsenal {
  return {
    pontos_chave: [
      {
        titulo: "Governança sem dono claro trava decisões e expõe risco regulatório",
        texto:
          "A empresa reconhece a importância do tema, mas as decisões ainda dependem de conversas informais e pessoas específicas. Sem papéis definidos, cada área prioriza o próprio indicador e o comitê executivo recebe versões diferentes do mesmo número, o que atrasa decisões e aumenta retrabalho.",
        dimensao_ids: ["d01", "d02"],
      },
      {
        titulo: "Dados mestres duplicados corroem a confiança nos indicadores",
        texto:
          "Cadastros de clientes e produtos se repetem entre sistemas, e cada área mantém a sua versão. O resultado aparece na conciliação manual e em relatórios que nunca fecham, o que consome tempo do time e enfraquece a credibilidade da informação.",
        dimensao_ids: ["d04", "d06"],
      },
      {
        titulo: "Integrações manuais limitam a velocidade de novas entregas",
        texto:
          "Boa parte das integrações depende de planilhas e rotinas executadas por uma única pessoa. Qualquer mudança de escopo vira um projeto caro, e a empresa perde velocidade para testar novos produtos e responder ao mercado.",
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
        "O diagnóstico mostra que a empresa já investe em ferramentas e contrata analistas, mas as decisões sobre dados seguem sem dono, sem política e sem fórum de priorização. O retrabalho relatado pelas áreas nasce dessa ausência de papéis e regras. Antes de ampliar a plataforma, é preciso definir quem decide, como se resolve conflito de prioridade e qual instância sustenta o acordo. A frente de governança conecta patrocínio executivo, papéis operacionais e comitê de dados num ciclo único de decisão.",
      dimensoes_atacadas: ["d01", "d04"],
      complementares: ["qualidade-mestres"],
    },
    objecoes: [
      {
        grupo: "preco",
        objecao_provavel:
          "O orçamento deste ano já está comprometido com outros projetos e a diretoria pediu para revisar qualquer investimento novo apenas no próximo ciclo, quando o cenário estiver mais claro.",
        contorno:
          "Reconheça a restrição orçamentária e separe o custo de não decidir do custo do projeto. Use o diagnóstico para mostrar quanto retrabalho e quantas decisões atrasadas existem, e proponha um primeiro recorte ligado a uma dor que a diretoria reconhece. Deixe claro o que continua acontecendo se o tema esperar mais um ciclo e quais decisões ficam travadas nesse intervalo.",
        apoio:
          "O diagnóstico aponta governança e qualidade como dimensões de menor nível, com relatórios divergentes, cadastros repetidos e correção manual feita por poucas pessoas. Esse é o custo que já está sendo pago, mesmo sem projeto formal.",
      },
      {
        grupo: "timing",
        objecao_provavel: "Agora não é o momento; talvez no segundo semestre, depois do fechamento do ano.",
        contorno:
          "Pergunte o que precisa acontecer para o tema entrar na pauta e o que muda no negócio até lá. Se a resposta depender de outra área, proponha uma conversa conjunta; se depender de resultado, conecte o primeiro passo a um indicador que a empresa já acompanha.",
        apoio: "O diagnóstico já mostra decisões travadas por falta de dono e de fórum, o que tende a piorar com o crescimento.",
      },
      {
        grupo: "ja-temos",
        objecao_provavel: "Já temos um time de dados e uma ferramenta de BI contratada; não precisamos de ajuda externa.",
        contorno:
          "Valorize o que já existe e pergunte como o time decide prioridades e como as áreas acessam os indicadores. Em geral, a ferramenta resolve a visualização, mas não o acordo sobre regras, donos e qualidade. Posicione a frente como reforço ao time interno, não como substituta.",
        apoio: "Governança e qualidade aparecem como os menores níveis, mesmo com ferramenta e time já presentes.",
      },
      {
        grupo: "risco-dados",
        objecao_provavel: "Trazer um parceiro para mexer nos nossos dados aumenta o risco de exposição e de não conformidade com a LGPD.",
        contorno:
          "Traga o tema para o centro da conversa em vez de evitá-lo. Explique como o trabalho começa por classificação, base legal e controle de acesso, e proponha que a primeira entrega seja justamente o mapa de riscos e permissões. Envolva segurança e jurídico desde o início para que o aceite seja conjunto.",
        apoio: "Segurança aparece como dimensão intermediária, com acesso informal e LGPD tratada no papel, o que aumenta o risco atual.",
      },
    ],
    perguntas: [
      {
        texto:
          "Como as decisões sobre dados são tomadas hoje: existe um comitê, um dono formal ou cada área decide o que priorizar sem uma instância comum?",
        formato: "aberta",
        spin: "situacao",
        objetivo: "Mapear como a empresa decide hoje, identificar se existe uma instância formal de priorização e quem responde pelos dados críticos quando as áreas discordam.",
      },
      {
        texto:
          "Quando duas áreas apresentam números diferentes para o mesmo indicador, como vocês descobrem qual versão está correta e quem é acionado para resolver a divergência?",
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
