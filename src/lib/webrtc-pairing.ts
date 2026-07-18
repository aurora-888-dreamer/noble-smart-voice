// Serverless WebRTC pairing between two Noble instances on the same account.
//
// Why manual code exchange instead of a live signaling server: Noble is
// deployed on Cloudflare Workers, which has no durable in-memory state across
// requests — a "waiting room" signaling server would need its own persistent
// backend (KV / Durable Objects / a database), which isn't provisioned yet.
// Until that exists, we gather full ICE candidates up front (no trickle) and
// pack the whole offer/answer into one code, so pairing needs only two
// manual code exchanges and zero servers.

const STUN_SERVERS = [{ urls: ["stun:stun.l.google.com:19302"] }];

function encodeDescription(desc: RTCSessionDescriptionInit): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify({ t: desc.type, s: desc.sdp }))));
}

function decodeDescription(code: string): RTCSessionDescriptionInit {
  const raw = JSON.parse(decodeURIComponent(escape(atob(code.trim())))) as { t: RTCSdpType; s: string };
  return { type: raw.t, sdp: raw.s };
}

function waitForIceGatheringComplete(pc: RTCPeerConnection, timeoutMs = 4000): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timer);
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
  });
}

export interface HostHandle {
  pc: RTCPeerConnection;
  code: string;
  /** Call once you've pasted in the other device's answer code. */
  completeWithAnswer: (answerCode: string) => Promise<void>;
  /** Resolves with the open data channel once the other side connects. */
  channel: Promise<RTCDataChannel>;
  close: () => void;
}

export async function startHost(): Promise<HostHandle> {
  const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
  const dc = pc.createDataChannel("noble-sync");
  const channel = new Promise<RTCDataChannel>((resolve) => {
    dc.addEventListener("open", () => resolve(dc), { once: true });
  });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceGatheringComplete(pc);
  const code = encodeDescription(pc.localDescription!);

  return {
    pc,
    code,
    channel,
    completeWithAnswer: async (answerCode: string) => {
      await pc.setRemoteDescription(decodeDescription(answerCode));
    },
    close: () => pc.close(),
  };
}

export interface JoinHandle {
  pc: RTCPeerConnection;
  answerCode: string;
  channel: Promise<RTCDataChannel>;
  close: () => void;
}

export async function joinWithHostCode(hostCode: string): Promise<JoinHandle> {
  const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
  const channel = new Promise<RTCDataChannel>((resolve) => {
    pc.addEventListener(
      "datachannel",
      (ev) => {
        ev.channel.addEventListener("open", () => resolve(ev.channel), { once: true });
      },
      { once: true },
    );
  });

  await pc.setRemoteDescription(decodeDescription(hostCode));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForIceGatheringComplete(pc);
  const answerCode = encodeDescription(pc.localDescription!);

  return { pc, answerCode, channel, close: () => pc.close() };
}
