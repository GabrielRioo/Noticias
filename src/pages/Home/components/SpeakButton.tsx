import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import VolumeOffOutlinedIcon from '@mui/icons-material/VolumeOffOutlined';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';
import { useEffect, useState } from 'react';
import type { NewsItem } from '../../../types/news';
import {
  getActiveSpeechId,
  getLoadingSpeechId,
  isSpeechSupported,
  stopSpeech,
  subscribeSpeech,
  toggleSpeech,
} from '../../../utils/speech';
import { storyBriefing } from './StoryCopy';

type SpeakButtonProps = {
  item: NewsItem;
};

type SpeechUi = {
  activeId: string | null;
  loadingId: string | null;
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
  const [speech, setSpeech] = useState<SpeechUi>({
    activeId: null,
    loadingId: null,
  });
  const supported = isSpeechSupported();
  const speaking = speech.activeId === item.id;
  const loading = speech.loadingId === item.id;

  useEffect(() => {
    const unsubscribe = subscribeSpeech(setSpeech);
    return () => {
      unsubscribe();
      if (getActiveSpeechId() === item.id || getLoadingSpeechId() === item.id) {
        stopSpeech();
      }
    };
  }, [item.id]);

  if (!supported) {
    return null;
  }

  const label = loading
    ? 'Preparando áudio'
    : speaking
      ? 'Parar leitura'
      : 'Ouvir notícia';

  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        aria-label={label}
        aria-pressed={speaking}
        aria-busy={loading}
        onClick={() => {
          void toggleSpeech(item.id, buildSpeechText(item));
        }}
        sx={{
          ml: 0.25,
          color: speaking || loading ? 'primary.main' : 'text.secondary',
        }}
      >
        {loading ? (
          <CircularProgress size={14} thickness={5} color="inherit" />
        ) : speaking ? (
          <VolumeOffOutlinedIcon fontSize="inherit" />
        ) : (
          <VolumeUpOutlinedIcon fontSize="inherit" />
        )}
      </IconButton>
    </Tooltip>
  );
}
