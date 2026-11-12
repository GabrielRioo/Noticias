import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { NewsItem } from '../../../types/news';
import { TOPIC_LABELS } from '../topicLabels';

type StoryMetaProps = {
  item: NewsItem;
};

function formatWhen(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export function StoryMeta({ item }: StoryMetaProps) {
  const outlets = [...new Set(item.sources.map((source) => source.outlet))].join(' · ');

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
      <Typography
        variant="overline"
        sx={{ color: 'primary.main', letterSpacing: '0.16em' }}
      >
        {TOPIC_LABELS[item.topic]}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {outlets} · {formatWhen(item.publishedAt)}
      </Typography>
    </Stack>
  );
}
