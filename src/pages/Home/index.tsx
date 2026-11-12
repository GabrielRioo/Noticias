import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import type { NewsItem, NewsTopic } from '../../types/news';
import { GridStory } from './components/GridStory';
import { LeadStory } from './components/LeadStory';
import { Masthead } from './components/Masthead';
import { SearchResults } from './components/SearchResults';
import { SidebarStory } from './components/SidebarStory';
import { TopicFilter } from './components/TopicFilter';
import { useHome } from './hooks/useHome';

export function HomePage() {
  const {
    topics,
    items,
    updatedAt,
    status,
    error,
    refreshing,
    readIds,
    load,
    refresh,
    markRead,
    searchQuery,
    hits,
    searchStatus,
    searchError,
    search,
    clearSearch,
  } = useHome();
  const [topic, setTopic] = useState<NewsTopic | 'all'>('all');
  const visibleItems = useMemo(() => {
    const unread = items.filter((item) => !readIds.has(item.id));
    return topic === 'all' ? unread : unread.filter((item) => item.topic === topic);
  }, [items, readIds, topic]);
  const lead: NewsItem | undefined = visibleItems[0];
  const others = visibleItems.filter((item) => item.id !== lead?.id);
  const sidebar = topic === 'all' ? others.slice(0, 3) : [];
  const rest = topic === 'all' ? others.slice(3) : others;
  const editionRead =
    status === 'success' && items.length > 0 && visibleItems.length === 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
        <Box
          sx={{
            bgcolor: 'background.paper',
            px: { xs: 2, md: 5 },
            py: { xs: 2, md: 3 },
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 18px 50px rgba(0, 0, 0, 0.45)'
                : '0 24px 60px rgba(28, 25, 23, 0.08)',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Masthead
            updatedAt={updatedAt}
            refreshing={refreshing}
            searching={searchStatus === 'loading'}
            activeQuery={searchQuery}
            onRefresh={() => void refresh()}
            onSearch={(query) => void search(query)}
            onClearSearch={clearSearch}
          />

          {searchStatus === 'idle' ? (
            <TopicFilter topics={topics} value={topic} onTopicChange={setTopic} />
          ) : (
            <SearchResults
              query={searchQuery}
              items={hits}
              status={searchStatus}
              error={searchError}
              onRetry={() => void search(searchQuery)}
            />
          )}

          {searchStatus === 'idle' && status === 'loading' ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress aria-label="Carregando edição" />
            </Box>
          ) : null}

          {searchStatus === 'idle' && status === 'error' && error ? (
            <Alert
              severity="error"
              sx={{ my: 4 }}
              action={
                <Button color="inherit" size="small" onClick={() => void load()}>
                  Tentar de novo
                </Button>
              }
            >
              {error}
            </Alert>
          ) : null}

          {searchStatus === 'idle' &&
          (status === 'empty' || (status === 'success' && visibleItems.length === 0)) ? (
            <Box sx={{ py: 10, textAlign: 'center', maxWidth: 520, mx: 'auto' }}>
              <Typography variant="overline" color="primary">
                Edição em branco
              </Typography>
              <Typography variant="h3" sx={{ mt: 1, mb: 1.5, fontSize: '2rem' }}>
                {editionRead ? 'Você já leu esta edição.' : 'Ainda não há o que ler neste recorte.'}
              </Typography>
              <Typography color="text.secondary">
                {editionRead
                  ? 'As matérias lidas saíram da página. Atualize a edição para puxar a próxima de cada editoria, se houver.'
                  : 'Atualize a edição para puxar a notícia mais recente de cada editoria.'}
              </Typography>
            </Box>
          ) : null}

          {searchStatus === 'idle' && status === 'success' && lead ? (
            <Box component="main" sx={{ pt: { xs: 3, md: 5 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Palavras com sublinhado pontilhado têm uma explicação curta ao passar o mouse ou tocar.
              </Typography>
              <Grid container spacing={0} sx={{ alignItems: 'flex-start' }}>
                <Grid size={{ xs: 12, md: sidebar.length > 0 ? 8 : 12 }}>
                  <LeadStory item={lead} read={readIds.has(lead.id)} onRead={markRead} />
                </Grid>
                {sidebar.length > 0 ? (
                  <Grid
                    size={{ xs: 12, md: 4 }}
                    sx={{
                      mt: { xs: 4, md: 0 },
                      pl: { md: 4 },
                      borderLeft: { md: '1px solid' },
                      borderTop: { xs: '1px solid', md: 0 },
                      borderColor: { xs: 'divider', md: 'divider' },
                      pt: { xs: 3, md: 0 },
                    }}
                  >
                    <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
                      Também nesta edição
                    </Typography>
                    {sidebar.map((item) => (
                      <SidebarStory
                        key={item.id}
                        item={item}
                        read={readIds.has(item.id)}
                        onRead={markRead}
                      />
                    ))}
                  </Grid>
                ) : null}
              </Grid>

              {rest.length > 0 ? (
                <Box sx={{ mt: 5, pt: 4, borderTop: '3px double', borderColor: 'text.primary' }}>
                  <Typography variant="overline" sx={{ display: 'block', mb: 3 }}>
                    Outras editorias
                  </Typography>
                  <Grid container spacing={0}>
                    {rest.map((item) => (
                      <Grid
                        key={item.id}
                        size={{ xs: 12, sm: 6, md: 4 }}
                        sx={{
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <GridStory item={item} read={readIds.has(item.id)} onRead={markRead} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ) : null}
            </Box>
          ) : null}

          <Box
            component="footer"
            sx={{
              mt: 6,
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'text.primary',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {searchStatus === 'idle'
                ? 'Resumo gerado a partir de feeds oficiais. Sempre confira a matéria original.'
                : 'Manchetes do Google Notícias. Sempre confira a matéria original.'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              O Briefing · edição local
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
