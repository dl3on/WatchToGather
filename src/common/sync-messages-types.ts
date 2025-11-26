export enum PeerMessageType {
  Play = "play",
  Pause = "pause",
  Seek = "seek",
  NextVideo = "next_video",
}

type PeerMessageBase = {
  mid: string;
  fromPeerId: string;
};

export type PeerMessage =
  | (PeerMessageBase & {
      type: PeerMessageType.Pause;
      time: number;
    })
  | (PeerMessageBase & {
      type: PeerMessageType.Play;
      time: number;
    })
  | (PeerMessageBase & {
      type: PeerMessageType.Seek;
      time: number;
    })
  | (PeerMessageBase & {
      type: PeerMessageType.NextVideo;
      url: string;
    });
