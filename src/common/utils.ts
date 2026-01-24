import {
  PeerMessage,
  PeerMessageType,
  PeerTimeMessage,
} from "./sync-messages-types";

export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Pause | Play | Seek */
export function isPlaybackControlMessage(
  msg: PeerMessage,
): msg is PeerTimeMessage {
  return (
    msg.type === PeerMessageType.Pause ||
    msg.type === PeerMessageType.PauseOnBuffering ||
    msg.type === PeerMessageType.Play ||
    msg.type === PeerMessageType.Seek ||
    msg.type === PeerMessageType.SyncBeacon
  );
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: number;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error("Timed out"));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}
