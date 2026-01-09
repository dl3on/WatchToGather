export enum PeerMessageType {
  Pause = "pause",
  Play = "play",
  Seek = "seek",
  NextVideo = "next_video",
  NextVideoAck = "next_video_ack",
  NextVideoNack = "next_video_nack",
  ReadyStateUpdate = "peer_ready_state",
}

type PeerMessageBase = {
  mid: string;
  fromPeerId: string;
  lamport: number;
};

export type PeerTimeMessage =
  | (PeerMessageBase & {
      type: PeerMessageType.Pause;
      time: number;
      duration: number;
    })
  | (PeerMessageBase & {
      type: PeerMessageType.Play;
      time: number;
      duration: number;
    })
  | (PeerMessageBase & {
      type: PeerMessageType.Seek;
      time: number;
      duration: number;
    });

export type PeerNextVideoMessage = PeerMessageBase & {
  type: PeerMessageType.NextVideo;
  url: string;
  fromHost?: boolean;
};

export type PeerNextVideoAckMessage = PeerMessageBase & {
  type: PeerMessageType.NextVideoAck;
  url: string;
};

export type PeerNextVideoNackMessage = PeerMessageBase & {
  type: PeerMessageType.NextVideoNack;
  url: string;
};

export type PeerReadyStateMessage = PeerMessageBase & {
  type: PeerMessageType.ReadyStateUpdate;
  readinessMap: Record<string, boolean>;
};

export type PeerMessage =
  | PeerTimeMessage
  | PeerNextVideoMessage
  | PeerNextVideoAckMessage
  | PeerNextVideoNackMessage
  | PeerReadyStateMessage;

export type LocalVideoEvent =
  | {
      type: PeerMessageType.Pause;
      time: number;
      duration: number;
    }
  | {
      type: PeerMessageType.Play;
      time: number;
      duration: number;
    }
  | {
      type: PeerMessageType.Seek;
      time: number;
      duration: number;
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

export type NotifyAckNack = {
  type: "ACK_OR_NACK";
  url: string;
};

export type ReadinessUIUpdate = {
  type: "READINESS_UPDATE";
  readinessMap: Record<string, boolean>;
};

export type NavStates = {
  navId: number;
  urlValue: string | null;
  urlChange: boolean;
};
