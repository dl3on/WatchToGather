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
  msg: PeerMessage
): msg is PeerTimeMessage {
  return (
    msg.type === PeerMessageType.Pause ||
    msg.type === PeerMessageType.Play ||
    msg.type === PeerMessageType.Seek
  );
}
