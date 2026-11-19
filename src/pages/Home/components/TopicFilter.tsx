import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import type { NewsTopic } from '../../../types/news';
import { TOPIC_LABELS } from '../topicLabels';

type TopicFilterProps = {
  topics: readonly NewsTopic[];
  value: NewsTopic | 'all';
  refreshing: null | 'all' | NewsTopic;
  onTopicChange: (topic: NewsTopic | 'all') => void;
  onRefreshTopic: (topic: NewsTopic) => void;
};

export function TopicFilter({
  topics,
  value,
  refreshing,
  onTopicChange,
  onRefreshTopic,
}: TopicFilterProps) {
  const options: Array<NewsTopic | 'all'> = ['all', ...topics];
  const topicRefreshing = value !== 'all' && refreshing === value;
  const busy = refreshing !== null;

  return (
    <Box>
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

      {value !== 'all' ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: { xs: 'flex-start', md: 'center' },
            pt: 1.5,
            pb: 0.5,
          }}
        >
          <Button
            type="button"
            size="small"
            variant="outlined"
            disabled={busy}
            onClick={() => onRefreshTopic(value)}
          >
            {topicRefreshing
              ? `Atualizando ${TOPIC_LABELS[value]}…`
              : `Atualizar ${TOPIC_LABELS[value]}`}
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}
