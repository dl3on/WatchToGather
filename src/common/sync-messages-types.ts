export enum PeerMessageType {
  Pause = "pause",
  Play = "play",
  Seek = "seek",
  NextVideo = "next_video",
}

type PeerMessageBase = {
  mid: string;
  fromPeerId: string;
};

export type PeerTimeMessage =
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
    });

export type PeerNextVideoMessage = PeerMessageBase & {
  type: PeerMessageType.NextVideo;
  url: string;
  fromHost?: boolean;
};

export type PeerMessage = PeerTimeMessage | PeerNextVideoMessage;

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
  payload: PeerTimeMessage;
};

export type HostInitialUrl = {
  type: "HOST_INITIAL_URL";
  url: string;
};

export type LocalUrlChange = {
  type: "LOCAL_URL_CHANGE";
  url: string;
};
