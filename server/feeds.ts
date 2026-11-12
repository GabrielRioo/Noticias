import type { NewsTopic } from '../src/types/news.ts';

export type FeedConfig = {
  id: string;
  outlet: string;
  topic: NewsTopic;
  urls: string[];
  minTextLength?: number;
  opensEdition?: boolean;
};

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
      'https://news.google.com/rss/search?q=tarifas+OR+sanções+OR+retaliação+OR+%22guerra+comercial%22+EUA+when:90d&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    ],
  },
];
