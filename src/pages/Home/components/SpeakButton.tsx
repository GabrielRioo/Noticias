import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import VolumeOffOutlinedIcon from '@mui/icons-material/VolumeOffOutlined';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';
import { useEffect, useState } from 'react';
import type { NewsItem } from '../../../types/news';
import {
  getActiveSpeechId,
  isSpeechSupported,
  stopSpeech,
  subscribeSpeech,
  toggleSpeech,
} from '../../../utils/speech';
import { storyBriefing } from './StoryCopy';

type SpeakButtonProps = {
  item: NewsItem;
};

function buildSpeechText(item: NewsItem): string {
  const briefing = storyBriefing(item).trim();
  const why = item.whyItMatters.trim();
  const bullets = item.bullets.map((bullet) => `• ${bullet}`).join('\n');
  const parts = [
    item.title,
    briefing,
    bullets,
    why && why !== briefing ? why : '',
  ].filter((part) => part.trim().length > 0);
  return parts.join('\n\n');
}

export function SpeakButton({ item }: SpeakButtonProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const supported = isSpeechSupported();
  const speaking = activeId === item.id;

  useEffect(() => {
    const unsubscribe = subscribeSpeech(setActiveId);
    return () => {
      unsubscribe();
      if (getActiveSpeechId() === item.id) {
        stopSpeech();
      }
    };
  }, [item.id]);

  if (!supported) {
    return null;
  }

  return (
    <Tooltip title={speaking ? 'Parar leitura' : 'Ouvir notícia'}>
      <IconButton
        size="small"
        aria-label={speaking ? 'Parar leitura' : 'Ouvir notícia'}
        aria-pressed={speaking}
        onClick={() => toggleSpeech(item.id, buildSpeechText(item))}
        sx={{
          ml: 0.25,
          color: speaking ? 'primary.main' : 'text.secondary',
        }}
      >
        {speaking ? (
          <VolumeOffOutlinedIcon fontSize="inherit" />
        ) : (
          <VolumeUpOutlinedIcon fontSize="inherit" />
        )}
      </IconButton>
    </Tooltip>
  );
}
