import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import type { NewsTopic } from '../../../types/news';
import { TOPIC_LABELS } from '../topicLabels';

type TopicFilterProps = {
  topics: readonly NewsTopic[];
  value: NewsTopic | 'all';
  onTopicChange: (topic: NewsTopic | 'all') => void;
};

export function TopicFilter({ topics, value, onTopicChange }: TopicFilterProps) {
  const options: Array<NewsTopic | 'all'> = ['all', ...topics];

  return (
    <Box
      component="nav"
      aria-label="Editorias"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: { xs: 'flex-start', md: 'center' },
        columnGap: { xs: 0.5, md: 1 },
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {options.map((option) => {
        const selected = value === option;
        return (
          <Button
            key={option}
            type="button"
            onClick={() => onTopicChange(option)}
            sx={{
              minWidth: 0,
              px: { xs: 1.25, md: 1.75 },
              py: 1.25,
              color: selected ? 'primary.main' : 'text.primary',
              borderBottom: '2px solid',
              borderColor: selected ? 'primary.main' : 'transparent',
              borderRadius: 0,
              fontSize: '0.78rem',
            }}
          >
            {TOPIC_LABELS[option]}
          </Button>
        );
      })}
    </Box>
  );
}
