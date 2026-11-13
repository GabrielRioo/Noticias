import type { NewsTopic } from '../src/types/news.js';

export type FeedConfig = {
  id: string;
  outlet: string;
  topic: NewsTopic;
  urls: string[];
  minTextLength?: number;
  opensEdition?: boolean;
};

/** Personal FII watchlist — news feeds match these tickers only. */
export const PORTFOLIO_FIIS = [
  'RECR11',
  'KNIP11',
  'URPR11',
  'XPML11',
  'HGRE11',
  'BTLG11',
  'MCRE11',
  'MXRF11',
  'VGIA11',
  'VGHF11',
  'BTHF11',
  'CPTS11',
  'VISC11',
  'GARE11',
  'BRCO11',
  'GGRC11',
  'RBRR11',
] as const;

function googleNewsSearch(query: string): string {
  const params = new URLSearchParams({
    q: query,
    hl: 'pt-BR',
    gl: 'BR',
    ceid: 'BR:pt-419',
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

export const FEEDS: FeedConfig[] = [
  {
    id: 'g1-politica',
    outlet: 'G1',
    topic: 'politica',
    urls: [
      'https://g1.globo.com/dynamo/politica/rss2.xml',
      'https://g1.globo.com/rss/g1/politica/',
    ],
  },
  {
    id: 'g1-economia',
    outlet: 'G1',
    topic: 'economia',
    urls: [
      'https://g1.globo.com/dynamo/economia/rss2.xml',
      'https://g1.globo.com/rss/g1/economia/',
    ],
  },
  {
    id: 'g1-mundo',
    outlet: 'G1',
    topic: 'mundo',
    urls: [
      'https://g1.globo.com/dynamo/mundo/rss2.xml',
      'https://g1.globo.com/rss/g1/mundo/',
    ],
  },
  {
    id: 'g1-tecnologia',
    outlet: 'G1',
    topic: 'tecnologia',
    urls: [
      'https://g1.globo.com/dynamo/tecnologia/rss2.xml',
      'https://g1.globo.com/rss/g1/tecnologia/',
    ],
  },
  {
    id: 'g1-ciencia',
    outlet: 'G1',
    topic: 'ciencia',
    urls: [
      'https://g1.globo.com/dynamo/ciencia-e-saude/rss2.xml',
      'https://g1.globo.com/rss/g1/ciencia-e-saude/',
    ],
  },
  {
    id: 'folha-poder',
    outlet: 'Folha',
    topic: 'politica',
    urls: ['https://feeds.folha.uol.com.br/poder/rss091.xml'],
  },
  {
    id: 'folha-mercado',
    outlet: 'Folha',
    topic: 'economia',
    urls: ['https://feeds.folha.uol.com.br/mercado/rss091.xml'],
  },
  {
    id: 'folha-mundo',
    outlet: 'Folha',
    topic: 'mundo',
    urls: ['https://feeds.folha.uol.com.br/mundo/rss091.xml'],
  },
  {
    id: 'folha-tec',
    outlet: 'Folha',
    topic: 'tecnologia',
    urls: ['https://feeds.folha.uol.com.br/tec/rss091.xml'],
  },
  {
    id: 'agencia-brasil',
    outlet: 'Agência Brasil',
    topic: 'politica',
    opensEdition: false,
    urls: ['https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml'],
  },
  {
    id: 'bbc-brasil',
    outlet: 'BBC News Brasil',
    topic: 'mundo',
    urls: ['https://feeds.bbci.co.uk/portuguese/rss.xml'],
  },
  {
    id: 'bbc-world',
    outlet: 'BBC',
    topic: 'mundo',
    urls: ['https://feeds.bbci.co.uk/news/world/rss.xml'],
  },
  {
    id: 'guardian-world',
    outlet: 'The Guardian',
    topic: 'mundo',
    urls: ['https://www.theguardian.com/world/rss'],
  },
  {
    id: 'bbc-middle-east',
    outlet: 'BBC',
    topic: 'conflitos',
    urls: ['https://feeds.bbci.co.uk/news/world/middle_east/rss.xml'],
  },
  {
    id: 'bbc-us',
    outlet: 'BBC',
    topic: 'mundo',
    urls: ['https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml'],
  },
  {
    id: 'bbc-europe',
    outlet: 'BBC',
    topic: 'mundo',
    urls: ['https://feeds.bbci.co.uk/news/world/europe/rss.xml'],
  },
  {
    id: 'bbc-asia',
    outlet: 'BBC',
    topic: 'mundo',
    urls: ['https://feeds.bbci.co.uk/news/world/asia/rss.xml'],
  },
  {
    id: 'guardian-middle-east',
    outlet: 'The Guardian',
    topic: 'conflitos',
    urls: ['https://www.theguardian.com/world/middleeast/rss'],
  },
  {
    id: 'guardian-us',
    outlet: 'The Guardian',
    topic: 'mundo',
    urls: ['https://www.theguardian.com/us-news/rss'],
  },
  {
    id: 'dossier-guerra',
    outlet: 'Google Notícias',
    topic: 'conflitos',
    minTextLength: 80,
    urls: [
      'https://news.google.com/rss/search?q=guerra+OR+conflito+OR+Ucrânia+OR+Gaza+OR+Irã+when:90d&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    ],
  },
  {
    id: 'dossier-retaliacao',
    outlet: 'Google Notícias',
    topic: 'economia',
    minTextLength: 80,
    urls: [
      googleNewsSearch('tarifas OR sanções OR retaliação OR "guerra comercial" EUA when:90d'),
    ],
  },
  {
    id: 'dossier-btc',
    outlet: 'Google Notícias',
    topic: 'btc',
    minTextLength: 80,
    urls: [
      googleNewsSearch('Bitcoin OR BTC OR "preço do bitcoin" OR ETF bitcoin when:14d'),
    ],
  },
  {
    id: 'dossier-btc-mercado',
    outlet: 'Google Notícias',
    topic: 'btc',
    minTextLength: 80,
    urls: [
      googleNewsSearch('Bitcoin (halving OR mineração OR "reserva estratégica" OR criptomoeda) when:30d'),
    ],
  },
  {
    id: 'dossier-fiis',
    outlet: 'Google Notícias',
    topic: 'fiis',
    minTextLength: 60,
    urls: [
      googleNewsSearch(`${PORTFOLIO_FIIS.join(' OR ')} when:30d`),
    ],
  },
  {
    id: 'dossier-fiis-renda',
    outlet: 'Google Notícias',
    topic: 'fiis',
    minTextLength: 60,
    urls: [
      googleNewsSearch(
        `(${PORTFOLIO_FIIS.join(' OR ')}) (dividendo OR rendimento OR cotação OR FII) when:45d`,
      ),
    ],
  },
];
