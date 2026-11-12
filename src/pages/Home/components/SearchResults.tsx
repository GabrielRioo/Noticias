import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import type { SearchHit } from '../../../types/news';
import type { SearchStatus } from '../hooks/useHome';

type SearchResultsProps = {
  query: string;
  items: SearchHit[];
  status: Exclude<SearchStatus, 'idle'>;
  error: string | null;
  onRetry: () => void;
};

function formatWhen(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export function SearchResults({ query, items, status, error, onRetry }: SearchResultsProps) {
  return (
    <Box component="main" aria-label="Resultados da busca" aria-busy={status === 'loading'} sx={{ pt: { xs: 3, md: 4 } }}>
      <Typography variant="overline" color="primary">
        Busca
      </Typography>
      <Typography variant="h3" sx={{ mt: 1, mb: 1, fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
        {query}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Manchetes dos últimos 30 dias. O texto completo está na fonte.
      </Typography>

      {status === 'loading' ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress aria-label="Buscando notícias" />
        </Box>
      ) : null}

      {status === 'error' && error ? (
        <Alert
          severity="error"
          sx={{ my: 3 }}
          action={
            <Button color="inherit" size="small" onClick={onRetry}>
              Tentar de novo
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}

      {status === 'empty' ? (
        <Box sx={{ py: 8, textAlign: 'center', maxWidth: 520, mx: 'auto' }}>
          <Typography variant="overline" color="primary">
            Nada recente
          </Typography>
          <Typography variant="h3" sx={{ mt: 1, mb: 1.5, fontSize: '2rem' }}>
            Nenhuma manchete para “{query}”.
          </Typography>
          <Typography color="text.secondary">
            Não encontrei notícias dos últimos 30 dias com esse assunto. Tente outro termo.
          </Typography>
        </Box>
      ) : null}

      {status === 'success' ? (
        <Box>
          {items.map((item) => (
            <Box
              key={item.id}
              component="article"
              sx={{ py: 2.5, borderTop: '1px solid', borderColor: 'divider' }}
            >
              <Typography variant="caption" color="text.secondary">
                {item.outlet} · {formatWhen(item.publishedAt)}
              </Typography>
              <Typography variant="h6" component="h2" sx={{ mt: 0.5, lineHeight: 1.3 }}>
                {item.title}
              </Typography>
              <Button
                component="a"
                href={item.url}
                target="_blank"
                rel="noreferrer"
                variant="outlined"
                size="small"
                sx={{ mt: 1.5 }}
              >
                Ler na {item.outlet}
              </Button>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
