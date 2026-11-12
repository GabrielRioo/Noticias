import Box from '@mui/material/Box';
import type { NewsItem } from '../../../types/news';
import { StoryCopy } from './StoryCopy';
import { StoryHeadline } from './StoryHeadline';
import { StoryLinks } from './StoryLinks';
import { StoryMeta } from './StoryMeta';

type LeadStoryProps = {
  item: NewsItem;
  read: boolean;
  onRead: (id: string) => void;
};

export function LeadStory({ item, read, onRead }: LeadStoryProps) {
  return (
    <Box component="article" sx={{ pr: { md: 4 }, opacity: read ? 0.72 : 1 }}>
      <StoryMeta item={item} />
      <StoryHeadline
        item={item}
        variant="h2"
        component="h2"
        sx={{ mt: 1.5, mb: 1, fontSize: { xs: '2rem', md: '3rem' }, lineHeight: 1.12 }}
      />
      <StoryCopy item={item} />
      <StoryLinks item={item} read={read} onRead={onRead} />
    </Box>
  );
}
