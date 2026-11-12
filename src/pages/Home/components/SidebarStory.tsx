import Box from '@mui/material/Box';
import type { NewsItem } from '../../../types/news';
import { StoryCopy } from './StoryCopy';
import { StoryHeadline } from './StoryHeadline';
import { StoryLinks } from './StoryLinks';
import { StoryMeta } from './StoryMeta';

type SidebarStoryProps = {
  item: NewsItem;
  read: boolean;
  onRead: (id: string) => void;
};

export function SidebarStory({ item, read, onRead }: SidebarStoryProps) {
  return (
    <Box
      component="article"
      sx={{
        py: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        opacity: read ? 0.72 : 1,
        '&:first-of-type': { pt: 0 },
        '&:last-of-type': { borderBottom: 0, pb: 0 },
      }}
    >
      <StoryMeta item={item} />
      <StoryHeadline item={item} variant="h6" component="h3" sx={{ mt: 1, mb: 0.5, lineHeight: 1.25 }} />
      <StoryCopy item={item} compact />
      <StoryLinks item={item} read={read} onRead={onRead} />
    </Box>
  );
}
