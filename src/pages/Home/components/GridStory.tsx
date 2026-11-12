import Box from '@mui/material/Box';
import type { NewsItem } from '../../../types/news';
import { StoryCopy } from './StoryCopy';
import { StoryHeadline } from './StoryHeadline';
import { StoryLinks } from './StoryLinks';
import { StoryMeta } from './StoryMeta';

type GridStoryProps = {
  item: NewsItem;
  read: boolean;
  onRead: (item: NewsItem) => void;
};

export function GridStory({ item, read, onRead }: GridStoryProps) {
  return (
    <Box component="article" sx={{ height: '100%', pr: { md: 3 }, pb: 3, opacity: read ? 0.72 : 1 }}>
      <StoryMeta item={item} />
      <StoryHeadline item={item} variant="h6" component="h3" sx={{ mt: 1, mb: 0.5, lineHeight: 1.28 }} />
      <StoryCopy item={item} compact />
      <StoryLinks item={item} read={read} onRead={onRead} />
    </Box>
  );
}
