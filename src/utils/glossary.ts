import type { GlossaryTerm } from '../types/news';

export const BASE_GLOSSARY: GlossaryTerm[] = [
  {
    term: 'Selic',
    explanation: 'Taxa básica de juros do Brasil, definida pelo Banco Central. Quando sobe, o crédito fica mais caro.',
  },
  {
    term: 'Copom',
    explanation: 'Comitê de Política Monetária do Banco Central, que decide a Selic.',
  },
  {
    term: 'PIB',
    explanation: 'Produto Interno Bruto: soma do que o país produz em bens e serviços num período.',
  },
  {
    term: 'IPCA',
    explanation: 'Índice oficial de inflação no Brasil, o que mede a alta geral dos preços.',
  },
  {
    term: 'teto de gastos',
    explanation: 'Regra que limita quanto o governo pode aumentar suas despesas de um ano para o outro.',
  },
  {
    term: 'regra fiscal',
    explanation: 'Conjunto de limites para o governo gastar, endividar-se e perseguir metas de resultado.',
  },
  {
    term: 'Tesouro',
    explanation: 'Área do governo que administra a dívida pública e o caixa da União.',
  },
  {
    term: 'Fed',
    explanation: 'Banco central dos Estados Unidos. Suas taxas de juros afetam o dólar e o mundo.',
  },
  {
    term: 'BCE',
    explanation: 'Banco Central Europeu, que define os juros da zona do euro.',
  },
  {
    term: 'FMI',
    explanation: 'Fundo Monetário Internacional: empresta a países em crise e cobra ajustes econômicos.',
  },
  {
    term: 'STF',
    explanation: 'Supremo Tribunal Federal, a corte máxima do Brasil em temas constitucionais.',
  },
  {
    term: 'STJ',
    explanation: 'Superior Tribunal de Justiça, que uniformiza a interpretação da lei federal.',
  },
  {
    term: 'TSE',
    explanation: 'Tribunal Superior Eleitoral, que organiza e julga as eleições no Brasil.',
  },
  {
    term: 'Congresso',
    explanation: 'O Legislativo. No Brasil, Câmara e Senado; nos EUA, a Câmara (House) e o Senado juntos.',
  },
  {
    term: 'Senado',
    explanation: 'Casa legislativa com senadores. No Brasil são 81; nos EUA, 100, dois por estado.',
  },
  {
    term: 'Câmara',
    explanation: 'Casa dos deputados. No Brasil é proporcional à população; nos EUA é a House of Representatives.',
  },
  {
    term: 'medida provisória',
    explanation: 'Norma do presidente com força de lei imediata, que o Congresso precisa confirmar depois.',
  },
  {
    term: 'relator',
    explanation: 'Parlamentar ou juiz encarregado de analisar um texto e propor o voto ou o parecer.',
  },
  {
    term: 'quórum',
    explanation: 'Número mínimo de presentes para uma votação ser válida.',
  },
  {
    term: 'impeachment',
    explanation: 'Processo para afastar um presidente ou governador por crime de responsabilidade.',
  },
  {
    term: 'democrata',
    explanation: 'Membro ou apoiador do Partido Democrata dos EUA, em geral mais à esquerda no espectro americano.',
  },
  {
    term: 'democratas',
    explanation: 'Integrantes do Partido Democrata dos EUA.',
  },
  {
    term: 'republicano',
    explanation: 'Membro ou apoiador do Partido Republicano dos EUA, em geral mais à direita no espectro americano.',
  },
  {
    term: 'republicanos',
    explanation: 'Integrantes do Partido Republicano dos EUA.',
  },
  {
    term: 'OTAN',
    explanation: 'Aliança militar entre EUA, Canadá e vários países da Europa: um ataque a um é tratado como ataque a todos.',
  },
  {
    term: 'ONU',
    explanation: 'Organização das Nações Unidas, fórum mundial de diplomacia e de missões de paz.',
  },
  {
    term: 'cessar-fogo',
    explanation: 'Pausa combinada nos combates, em geral para negociar ou para passar ajuda humanitária.',
  },
  {
    term: 'sanção',
    explanation: 'Punição econômica ou diplomática contra um país, empresa ou pessoa, como bloquear bens ou comércio.',
  },
  {
    term: 'tarifas',
    explanation: 'Impostos cobrados na fronteira sobre produtos importados.',
  },
  {
    term: 'modelo de IA',
    explanation: 'Programa treinado com muitos dados para gerar texto, imagem ou decisão; não “entende” como uma pessoa.',
  },
  {
    term: 'modelos de IA',
    explanation: 'Programas de inteligência artificial treinados com grandes volumes de dados.',
  },
  {
    term: 'inteligência artificial',
    explanation: 'Sistemas que aprendem padrões em dados para classificar, prever ou gerar conteúdo.',
  },
  {
    term: 'LLM',
    explanation: 'Large Language Model: modelo de IA treinado para prever e gerar texto.',
  },
  {
    term: 'semicondutor',
    explanation: 'Chip, a peça que processa informação em celulares, computadores e data centers.',
  },
  {
    term: 'fase 3',
    explanation: 'Etapa avançada de teste de um medicamento em muitas pessoas, antes da aprovação regulatória.',
  },
  {
    term: 'Anvisa',
    explanation: 'Agência que regula medicamentos, vacinas e alimentos no Brasil.',
  },
];

export function mergeGlossary(extra: GlossaryTerm[] | undefined): GlossaryTerm[] {
  const byKey = new Map<string, GlossaryTerm>();
  for (const item of BASE_GLOSSARY) {
    byKey.set(item.term.toLocaleLowerCase('pt-BR'), item);
  }
  for (const item of extra ?? []) {
    const term = item.term.trim();
    const explanation = item.explanation.trim();
    if (term.length < 2 || explanation.length < 12) {
      continue;
    }
    byKey.set(term.toLocaleLowerCase('pt-BR'), { term, explanation });
  }
  return [...byKey.values()].sort((left, right) => right.term.length - left.term.length);
}

export type TextPiece = {
  text: string;
  explanation?: string;
};

export function splitExplainedText(value: string, terms: GlossaryTerm[]): TextPiece[] {
  if (!value) {
    return [];
  }

  const usable = terms.filter((item) => item.term.trim().length >= 2);
  if (usable.length === 0) {
    return [{ text: value }];
  }

  const pattern = usable
    .map((item) => item.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const lookup = new Map(usable.map((item) => [item.term.toLocaleLowerCase('pt-BR'), item.explanation]));
  const parts = value.split(regex);

  return parts
    .filter((part) => part.length > 0)
    .map((part) => {
      const explanation = lookup.get(part.toLocaleLowerCase('pt-BR'));
      return explanation ? { text: part, explanation } : { text: part };
    });
}
