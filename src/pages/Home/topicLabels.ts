import type { NewsTopic } from '../../types/news';

export const TOPIC_LABELS: Record<NewsTopic | 'all', string> = {
  all: 'Capa',
  politica: 'Política',
  conflitos: 'Conflitos',
  economia: 'Economia',
  tecnologia: 'Tecnologia',
  ciencia: 'Ciência',
  mundo: 'Mundo',
  btc: 'BTC',
  fiis: 'FIIs',
};
