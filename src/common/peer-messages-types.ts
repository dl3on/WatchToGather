export enum PeerMessageType {
  Play = "play",
  Pause = "pause",
  Seek = "seek",
  NextVideo = "next_video",
}

export type PeerMessage =
  | { id: string; type: PeerMessageType.Play; time: number; fromPeerId: string }
  | {
      id: string;
      type: PeerMessageType.Pause;
      time: number;
      fromPeerId: string;
    }
  | { id: string; type: PeerMessageType.Seek; time: number; fromPeerId: string }
  | {
      id: string;
      type: PeerMessageType.NextVideo;
      videoUrl?: string;
      fromPeerId: string;
    };
