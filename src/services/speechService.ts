export async function fetchSpeakAudio(text: string): Promise<Blob> {
  const response = await fetch('/api/news/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? 'Não foi possível gerar o áudio');
  }

  return response.blob();
}
