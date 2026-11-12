import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ElementType } from 'react';
import type { NewsItem } from '../../../types/news';
import { ExplainedText } from './ExplainedText';
import { primarySource } from './StoryLinks';

type StoryHeadlineProps = {
  item: NewsItem;
  variant: 'h2' | 'h6';
  component: ElementType;
  sx?: object;
};

export function StoryHeadline({ item, variant, component, sx }: StoryHeadlineProps) {
  const source = primarySource(item);
  const title = (
    <Typography variant={variant} component={component} sx={sx}>
      <ExplainedText text={item.title} extraTerms={item.terms} />
    </Typography>
  );

  if (!source) {
    return title;
  }

  return (
    <Link
      href={source.url}
      target="_blank"
      rel="noreferrer"
      underline="hover"
      color="inherit"
      sx={{ display: 'block' }}
    >
      {title}
    </Link>
  );
}
