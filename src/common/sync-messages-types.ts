export enum PeerMessageType {
  Pause = "pause",
  Play = "play",
  Seek = "seek",
  PauseOnBuffering = "buffering_pause",
  SyncBeacon = "sync_beacon",
  NextVideo = "next_video",
  NextVideoAck = "next_video_ack",
  NextVideoNack = "next_video_nack",
  ReadyStateUpdate = "peer_ready_state",
}

type PeerMessageBase = {
  mid: string;
  fromPeerId: string;
  username: string;
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
    })
  | (PeerMessageBase & {
      type: PeerMessageType.PauseOnBuffering;
      time: number;
      duration: number;
    })
  | (PeerMessageBase & {
      type: PeerMessageType.SyncBeacon;
      time: number;
      paused: boolean;
      target: SyncBeaconTarget;
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

export type PeerReadinessMap = Record<
  string,
  { username: string; ready: boolean }
>;

export type PeerReadyStateMessage = PeerMessageBase & {
  type: PeerMessageType.ReadyStateUpdate;
  readinessMap: PeerReadinessMap;
};

export type PeerMessage =
  | PeerTimeMessage
  | PeerNextVideoMessage
  | PeerNextVideoAckMessage
  | PeerNextVideoNackMessage
  | PeerReadyStateMessage;

type SyncBeaconTarget =
  | { kind: "peer"; peerId: string }
  | { kind: "broadcast" };

export type LocalVideoTimeEvent =
  | {
      type:
        | PeerMessageType.Pause
        | PeerMessageType.PauseOnBuffering
        | PeerMessageType.Play
        | PeerMessageType.Seek;
      time: number;
      duration: number;
    }
  | {
      type: PeerMessageType.SyncBeacon;
      time: number;
      paused: boolean;
      target: SyncBeaconTarget;
      duration: number;
    };

export type LocalNextVideoEvent = {
  type: PeerMessageType.NextVideo;
  url: string;
};

export type LocalVideoEvent = LocalVideoTimeEvent | LocalNextVideoEvent;

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
  readinessMap: PeerReadinessMap;
};

export type NavStates = {
  navId: number;
  urlValue: string | null;
  urlChange: boolean;
};

export type VideoStateRequest = {
  type: "SEND_VIDEO_STATE";
  target: string;
};
