// Captures raw microphone audio (independent of the Web Speech API captions)
// so it can be sent to an AI model for a more accurate, code-switch-aware
// transcription once the person is done talking.

export interface AudioCaptureHandle {
  stop: () => Promise<{ blob: Blob; mimeType: string } | null>;
  cancel: () => void;
}

function pickMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return undefined;
}

export async function startAudioCapture(): Promise<AudioCaptureHandle | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return null;
  if (typeof MediaRecorder === "undefined") return null;

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch {
    return null;
  }

  const mimeType = pickMimeType();
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  try {
    recorder.start();
  } catch {
    stream.getTracks().forEach((t) => t.stop());
    return null;
  }

  function releaseStream() {
    stream.getTracks().forEach((t) => t.stop());
  }

  return {
    stop: () =>
      new Promise((resolve) => {
        if (recorder.state === "inactive") {
          releaseStream();
          resolve(null);
          return;
        }
        recorder.onstop = () => {
          releaseStream();
          if (chunks.length === 0) {
            resolve(null);
            return;
          }
          resolve({ blob: new Blob(chunks, { type: mimeType ?? "audio/webm" }), mimeType: mimeType ?? "audio/webm" });
        };
        try {
          recorder.stop();
        } catch {
          releaseStream();
          resolve(null);
        }
      }),
    cancel: () => {
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        /* ignore */
      }
      releaseStream();
    },
  };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the "data:<mime>;base64," prefix — we send raw base64.
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
