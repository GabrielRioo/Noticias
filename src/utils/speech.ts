type SpeechListener = (activeId: string | null) => void;

const listeners = new Set<SpeechListener>();
let activeId: string | null = null;

function notify(): void {
  for (const listener of listeners) {
    listener(activeId);
  }
}

function setActive(id: string | null): void {
  activeId = id;
  notify();
}

function pickPortugueseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang === 'pt-BR') ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith('pt'))
  );
}

export function getActiveSpeechId(): string | null {
  return activeId;
}

export function subscribeSpeech(listener: SpeechListener): () => void {
  listeners.add(listener);
  listener(activeId);
  return () => {
    listeners.delete(listener);
  };
}

export function stopSpeech(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return;
  }
  window.speechSynthesis.cancel();
  setActive(null);
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function toggleSpeech(id: string, text: string): void {
  if (!isSpeechSupported()) {
    return;
  }

  if (activeId === id) {
    stopSpeech();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 1;
  const voice = pickPortugueseVoice();
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onend = () => {
    if (activeId === id) {
      setActive(null);
    }
  };
  utterance.onerror = () => {
    if (activeId === id) {
      setActive(null);
    }
  };

  setActive(id);
  // Chrome sometimes drops the first speak() right after cancel().
  window.setTimeout(() => {
    if (activeId !== id) {
      return;
    }
    window.speechSynthesis.speak(utterance);
  }, 40);
}
