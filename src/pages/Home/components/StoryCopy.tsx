import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { NewsItem } from '../../../types/news';
import { ExplainedText } from './ExplainedText';

type StoryCopyProps = {
  item: NewsItem;
  compact?: boolean;
};

export function storyBriefing(item: NewsItem): string {
  const briefing = item.briefing?.trim();
  if (briefing) {
    return briefing;
  }
  return item.whyItMatters;
}

export function StoryCopy({ item, compact = false }: StoryCopyProps) {
  const paragraphs = storyBriefing(item)
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const bullets = compact ? item.bullets.slice(0, 5) : item.bullets;

  return (
    <>
      {paragraphs.map((paragraph) => (
        <Typography
          key={paragraph.slice(0, 48)}
          variant={compact ? 'body2' : 'body1'}
          sx={{ mt: 1.5, lineHeight: 1.65 }}
        >
          <ExplainedText text={paragraph} extraTerms={item.terms} />
        </Typography>
      ))}
      <Box
        component="ul"
        sx={{
          m: 0,
          mt: 2,
          pl: 2.25,
          borderLeft: compact ? '2px solid' : '3px solid',
          borderColor: 'primary.main',
        }}
      >
        {bullets.map((bullet) => (
          <Typography
            key={bullet}
            component="li"
            variant={compact ? 'body2' : 'body1'}
            sx={{ mb: 0.85, lineHeight: 1.55 }}
          >
            <ExplainedText text={bullet} extraTerms={item.terms} />
          </Typography>
        ))}
      </Box>
      <Typography
        sx={{
          mt: 2,
          fontFamily: '"Newsreader", Georgia, serif',
          fontStyle: 'italic',
          fontSize: compact ? '0.98rem' : '1.12rem',
          lineHeight: 1.45,
        }}
      >
        <ExplainedText text={item.whyItMatters} extraTerms={item.terms} />
      </Typography>
      {item.numbersUnverified ? (
        <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
          Confira os números na fonte original.
        </Typography>
      ) : null}
    </>
  );
}
