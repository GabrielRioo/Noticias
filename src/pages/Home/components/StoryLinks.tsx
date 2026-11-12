import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import type { NewsItem } from '../../../types/news';

type StoryLinksProps = {
  item: NewsItem;
  read: boolean;
  onRead: (item: NewsItem) => void;
};

export function primarySource(item: NewsItem): { outlet: string; url: string } | undefined {
  return item.sources[0];
}

export function StoryLinks({ item, read, onRead }: StoryLinksProps) {
  const main = primarySource(item);
  const extras = item.sources.slice(1);

  return (
    <Stack spacing={0.75} sx={{ mt: 2 }}>
      {main ? (
        <Button
          component="a"
          href={main.url}
          target="_blank"
          rel="noreferrer"
          variant="outlined"
          size="small"
          sx={{ alignSelf: 'flex-start' }}
        >
          Ler a notícia completa na {main.outlet}
        </Button>
      ) : null}
      {extras.length > 0 ? (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {extras.map((source) => (
            <Link
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              variant="caption"
              underline="hover"
            >
              Também na {source.outlet}
            </Link>
          ))}
        </Stack>
      ) : null}
      <Button size="small" sx={{ px: 0, alignSelf: 'flex-start' }} onClick={() => onRead(item)} disabled={read}>
        {read ? 'Lida' : 'Marcar como lida'}
      </Button>
    </Stack>
  );
}
