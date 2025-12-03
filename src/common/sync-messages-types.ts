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

export type LocalVideoEvent =
  | {
      type: PeerMessageType.Pause;
      time: number;
    }
  | {
      type: PeerMessageType.Play;
      time: number;
    }
  | {
      type: PeerMessageType.Seek;
      time: number;
    }
  | {
      type: PeerMessageType.NextVideo;
      url: string;
    };

export type VCActions = {
  type: "VIDEO_ACTIONS";
  payload: PeerMessage;
};
