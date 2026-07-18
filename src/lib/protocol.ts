const CHUNK_SIZE = 12_000; // conservative, well under typical DataChannel message limits

type Frame = { seq: number; total: number; chunk: string };

export function sendPayload(channel: RTCDataChannel, payload: unknown) {
  const json = JSON.stringify(payload);
  const total = Math.max(1, Math.ceil(json.length / CHUNK_SIZE));
  for (let i = 0; i < total; i++) {
    const frame: Frame = {
      seq: i,
      total,
      chunk: json.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
    };
    channel.send(JSON.stringify(frame));
  }
}

export function receivePayload<T>(channel: RTCDataChannel, onDone: (data: T) => void, onProgress?: (pct: number) => void) {
  const parts: string[] = [];
  let expectedTotal = 0;

  const handler = (ev: MessageEvent) => {
    try {
      const frame = JSON.parse(ev.data as string) as Frame;
      expectedTotal = frame.total;
      parts[frame.seq] = frame.chunk;
      onProgress?.(Math.round((parts.filter(Boolean).length / expectedTotal) * 100));
      if (parts.filter(Boolean).length === expectedTotal) {
        channel.removeEventListener("message", handler);
        const full = parts.join("");
        onDone(JSON.parse(full) as T);
      }
    } catch {
      /* ignore malformed frames */
    }
  };
  channel.addEventListener("message", handler);
  return () => channel.removeEventListener("message", handler);
}
