import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { NewsItem } from '../../../types/news';
import { StoryHeadline } from './StoryHeadline';
import { StoryMeta } from './StoryMeta';

type ReadHeadlineProps = {
  item: NewsItem;
  variant?: 'lead' | 'sidebar' | 'grid';
};

export function ReadHeadline({ item, variant = 'grid' }: ReadHeadlineProps) {
  const isLead = variant === 'lead';
  const isSidebar = variant === 'sidebar';

  return (
    <Box
      component="article"
      sx={{
        height: isSidebar ? undefined : '100%',
        pr: isLead ? { md: 4 } : isSidebar ? 0 : { md: 3 },
        pb: isSidebar ? 0 : 3,
        py: isSidebar ? 2 : 0,
        borderBottom: isSidebar ? '1px solid' : undefined,
        borderColor: isSidebar ? 'divider' : undefined,
        opacity: 0.78,
        '&:first-of-type': isSidebar ? { pt: 0 } : undefined,
        '&:last-of-type': isSidebar ? { borderBottom: 0, pb: 0 } : undefined,
      }}
    >
      <StoryMeta item={item} />
      <StoryHeadline
        item={item}
        variant={isLead ? 'h2' : 'h6'}
        component={isLead ? 'h2' : 'h3'}
        sx={{
          mt: isLead ? 1.5 : 1,
          mb: 0.5,
          fontSize: isLead ? { xs: '2rem', md: '3rem' } : undefined,
          lineHeight: isLead ? 1.12 : 1.28,
        }}
      />
      <Typography variant="caption" color="text.secondary">
        Já lida · clique na manchete para abrir
      </Typography>
    </Box>
  );
}
