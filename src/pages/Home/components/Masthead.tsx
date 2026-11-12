import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { SearchField, SearchToggle } from './NewsSearch';
import { ThemeMenu } from '../../../components/ThemeMenu';

type MastheadProps = {
  updatedAt: string | null;
  refreshing: boolean;
  searching: boolean;
  activeQuery: string;
  onRefresh: () => void;
  onSearch: (query: string) => void;
  onClearSearch: () => void;
};

function formatEditionDate(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

function formatUpdatedAt(value: string | null): string {
  if (!value) {
    return 'Edição ainda não fechada';
  }
  return `Fechada às ${new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))}`;
}

export function Masthead({
  updatedAt,
  refreshing,
  searching,
  activeQuery,
  onRefresh,
  onSearch,
  onClearSearch,
}: MastheadProps) {
  const [fieldOpen, setFieldOpen] = useState(false);
  const showField = fieldOpen || activeQuery.length > 0;

  function clearSearch(): void {
    setFieldOpen(false);
    onClearSearch();
  }

  return (
    <Box component="header">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'text.primary',
        }}
      >
        <Typography variant="overline" color="text.secondary">
          {formatEditionDate()}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            Uso pessoal · Brasil e mundo
          </Typography>
          <ThemeMenu />
        </Box>
      </Box>

      <Box sx={{ textAlign: 'center', py: { xs: 3, md: 4.5 } }}>
        <Typography
          variant="overline"
          sx={{ color: 'primary.main', display: 'block', mb: 1 }}
        >
          O essencial, sem ruído
        </Typography>
        <Typography
          variant="h1"
          component="p"
          sx={{ fontSize: { xs: '2.6rem', md: '4.4rem' }, lineHeight: 0.9 }}
        >
          O Briefing
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5, fontStyle: 'italic' }}>
          O que importa agora — inclusive guerras e crises que já duram semanas.
        </Typography>
      </Box>

      <Box
        sx={{
          py: 1,
          borderTop: '3px solid',
          borderBottom: '1px solid',
          borderColor: 'text.primary',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {formatUpdatedAt(updatedAt)}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <SearchToggle expanded={showField} onOpen={() => setFieldOpen(true)} />
            <Button size="small" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? 'Fechando edição…' : 'Atualizar edição'}
            </Button>
          </Box>
        </Box>
        {showField ? (
          <SearchField
            key={activeQuery}
            initialQuery={activeQuery}
            searching={searching}
            autoFocus={fieldOpen && activeQuery.length === 0}
            onSearch={onSearch}
            onClear={clearSearch}
          />
        ) : null}
      </Box>
    </Box>
  );
}
