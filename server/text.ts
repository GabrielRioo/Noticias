import { decodeHTML } from 'entities';

const NOISE_PATTERNS = [
  /(?:✅|📲|➡️)?\s*(?:Clique aqui para )?seguir o canal do g1[^\n.!?]{0,80}?(?:WhatsApp|Telegram)\.?\s*/gi,
  /(?:✅|📲)\s*Siga o canal[^\n.!?]{0,120}?(?:WhatsApp|Telegram|Instagram|Facebook)\s*(?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ' -]{1,50}:)?/gi,
  /Siga o canal de notícias[^\n.!?]{0,100}?(?:WhatsApp|Telegram)\s*(?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ' -]{1,50}:)?/gi,
  /Clique aqui e entre no grupo do WhatsApp[\s\S]*/gi,
  /LEIA MAIS:[\s\S]*/gi,
  /➡️\s*VEJA O EDITAL COMPLETO[\s\S]*/gi,
  /Leia mais[\s\S]*/gi,
  /Veja mais notícias[\s\S]*/gi,
  /Assista aos vídeos[\s\S]*/gi,
  /📲[\s\S]*/g,
];

export function hasBrokenEncoding(value: string): boolean {
  return value.includes('\uFFFD');
}

export function stripHtml(value: string): string {
  return decodeHTML(
    value
      .replace(/\uFFFD+/g, ' ')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<img[\s\S]*?>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\uFFFD+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanArticleText(value: string): string {
  let text = stripHtml(value);
  for (const pattern of NOISE_PATTERNS) {
    text = text.replace(pattern, ' ');
  }
  return text.replace(/\uFFFD+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function extractLeadNumbers(text: string): string[] {
  const lead = text.slice(0, 800);
  const matches = lead.match(/\d+(?:[.,]\d+)?%?/g) ?? [];
  const unique = new Set(matches.map((item) => item.replace(/\.$/, '')));
  return [...unique].filter((item) => item.length >= 2 || Number(item) >= 10);
}

export function missingNumbers(leadNumbers: string[], summaryText: string): string[] {
  const normalizedSummary = summaryText.replace(/\s+/g, ' ');
  return leadNumbers.filter((number) => !normalizedSummary.includes(number));
}

const STOPWORDS = new Set([
  'a', 'o', 'os', 'as', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na',
  'nos', 'nas', 'e', 'ou', 'para', 'por', 'com', 'sem', 'ao', 'aos', 'the', 'and',
  'of', 'in', 'on', 'to', 'for', 'after', 'over', 'new', 'says',
]);

export function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2 && !STOPWORDS.has(token)),
  );
}

export function titleSimilarity(left: string, right: string): number {
  const a = titleTokens(left);
  const b = titleTokens(right);
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) {
      overlap += 1;
    }
  }

  const union = new Set([...a, ...b]).size;
  return overlap / union;
}
