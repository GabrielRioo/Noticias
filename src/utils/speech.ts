import { fetchSpeakAudio } from '../services/speechService';

type SpeechSnapshot = {
  activeId: string | null;
  loadingId: string | null;
};

type SpeechListener = (snapshot: SpeechSnapshot) => void;

const listeners = new Set<SpeechListener>();
const audioCache = new Map<string, string>();

let activeId: string | null = null;
let loadingId: string | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let generation = 0;
let editionWithoutAi = false;
let geminiTtsFailedThisSession = false;

function snapshot(): SpeechSnapshot {
  return { activeId, loadingId };
}

function notify(): void {
  const next = snapshot();
  for (const listener of listeners) {
    listener(next);
  }
}

function setActive(id: string | null): void {
  activeId = id;
  notify();
}

function setLoading(id: string | null): void {
  loadingId = id;
  notify();
}

function shouldUseBrowserSpeech(): boolean {
  return editionWithoutAi || geminiTtsFailedThisSession;
}

/** Prefer system voice when the edition already ran without Gemini. */
export function setEditionWithoutAi(withoutAi: boolean): void {
  editionWithoutAi = withoutAi;
}

function pickPortugueseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const scored = voices
    .filter((voice) => voice.lang.toLowerCase().startsWith('pt'))
    .map((voice) => {
      const name = voice.name.toLowerCase();
      let score = 0;
      if (voice.lang.toLowerCase() === 'pt-br') score += 10;
      if (/neural|natural|online|google|premium/.test(name)) score += 20;
      if (/maria|francisca|antonio|daniel|microsoft/.test(name)) score += 5;
      if (voice.localService) score -= 3;
      return { voice, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.voice;
}

function stopBrowserSpeech(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function stopAudioElement(): void {
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (currentObjectUrl && ![...audioCache.values()].includes(currentObjectUrl)) {
    URL.revokeObjectURL(currentObjectUrl);
  }
  currentObjectUrl = null;
}

export function getActiveSpeechId(): string | null {
  return activeId;
}

export function getLoadingSpeechId(): string | null {
  return loadingId;
}

export function subscribeSpeech(listener: SpeechListener): () => void {
  listeners.add(listener);
  listener(snapshot());
  return () => {
    listeners.delete(listener);
  };
}

export function stopSpeech(): void {
  generation += 1;
  stopBrowserSpeech();
  stopAudioElement();
  setActive(null);
  setLoading(null);
}

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('speechSynthesis' in window || typeof Audio !== 'undefined')
  );
}

function speakWithBrowser(id: string, text: string, token: number): void {
  if (!window.speechSynthesis) {
    if (generation === token) {
      setActive(null);
      setLoading(null);
    }
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 0.95;
  utterance.pitch = 1;
  const voice = pickPortugueseVoice();
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onend = () => {
    if (generation === token && activeId === id) {
      setActive(null);
    }
  };
  utterance.onerror = () => {
    if (generation === token && activeId === id) {
      setActive(null);
    }
  };

  setLoading(null);
  setActive(id);
  window.setTimeout(() => {
    if (generation !== token) {
      return;
    }
    window.speechSynthesis.speak(utterance);
  }, 40);
}

async function playGeminiAudio(id: string, text: string, token: number): Promise<void> {
  let objectUrl = audioCache.get(id);
  if (!objectUrl) {
    const blob = await fetchSpeakAudio(text);
    if (generation !== token) {
      return;
    }
    objectUrl = URL.createObjectURL(blob);
    const previous = audioCache.get(id);
    if (previous) {
      URL.revokeObjectURL(previous);
    }
    audioCache.set(id, objectUrl);
  }

  if (generation !== token) {
    return;
  }

  const audio = new Audio(objectUrl);
  currentAudio = audio;
  currentObjectUrl = objectUrl;

  audio.onended = () => {
    if (generation === token && activeId === id) {
      setActive(null);
    }
  };
  audio.onerror = () => {
    if (generation === token && activeId === id) {
      setActive(null);
    }
  };

  setLoading(null);
  setActive(id);
  await audio.play();
}

export async function toggleSpeech(id: string, text: string): Promise<void> {
  if (!isSpeechSupported()) {
    return;
  }

  if (activeId === id || loadingId === id) {
    stopSpeech();
    return;
  }

  stopSpeech();
  const token = generation;

  if (shouldUseBrowserSpeech()) {
    speakWithBrowser(id, text, token);
    return;
  }

  setLoading(id);

  try {
    await playGeminiAudio(id, text, token);
  } catch {
    geminiTtsFailedThisSession = true;
    if (generation !== token) {
      return;
    }
    speakWithBrowser(id, text, token);
  }
}
