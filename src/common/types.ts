export type RoomInfo = {
  roomName: string;
  peers: PeerData[];
};

export type PeerData = {
  peerId: string;
  username: string;
  host: boolean;
};

export enum MessageType {
  Join,
  Host,
  Offer,
  Answer,
  OfferRelay,
  ICE,
  Error,
  Leave,
  Disband,
}

export enum ResponseType {
  Join,
  Host,
}

type MessagePayloads = {
  [MessageType.Join]: { roomId: string };
  [MessageType.Offer]: { [targetPeerId: string]: RTCSessionDescription };
  [MessageType.Answer]: {
    fromPeerId: string;
    toPeerId: string;
    answer: RTCSessionDescription;
  };
  [MessageType.OfferRelay]: {
    fromPeerId: string;
    offer: RTCSessionDescription;
  };
  [MessageType.ICE]: {
    fromPeerId: string;
    toPeerId: string;
    candidate: RTCIceCandidate;
  };
  [MessageType.Host]: { roomName: string };
  [MessageType.Error]: { msg: string };
  [MessageType.Leave]: { roomId: string };
  [MessageType.Disband]: { roomId: string };
};

export type Message<T extends keyof MessagePayloads> = MessagePayloads[T];

export type Response<T extends ResponseType> =
  | {
      success: true;
      roomId: string;
      body: RoomInfo;
      type: T;
    }
  | { success: false; roomId: string; errMsg: string };

export enum EClientToServerEvents {
  Join = "join",
  Host = "host",
  Offer = "offer",
  Answer = "answer",
  ICECandidate = "iceCandidate",
  JoinSuccess = "joinSuccess",
  Leave = "leave",
  Disband = "disband",
}

export enum EServerToClientEvents {
  JoinResponse = "joinResponse",
  HostResponse = "hostResponse",
  OfferRelay = "offerRelay",
  AnswerRelay = "answerRelay",
  ICERelay = "iceRelay",
  Error = "error",
}

export interface ClientToServerEvents {
  join: (msg: Message<MessageType.Join>) => void;
  host: (msg: Message<MessageType.Host>) => void;
  offer: (msg: Message<MessageType.Offer>) => void;
  answer: (msg: Message<MessageType.Answer>) => void;
  iceCandidate: (msg: Message<MessageType.ICE>) => void;
  joinSuccess: (msg: Message<MessageType.Join>) => void;
  leave: (msg: Message<MessageType.Leave>) => void;
  disband: (msg: Message<MessageType.Disband>) => void;
}

export interface ServerToClientEvents {
  joinResponse: (msg: Response<ResponseType.Join>) => void;
  hostResponse: (msg: Response<ResponseType.Host>) => void;
  offerRelay: (msg: Message<MessageType.OfferRelay>) => void;
  answerRelay: (msg: Message<MessageType.Answer>) => void;
  iceRelay: (msg: Message<MessageType.ICE>) => void;
  error: (msg: Message<MessageType.Error>) => void;
}

type ChromeMsgBase = { peerId: string; username: string };

export type ChromeMsg =
  | ({
      type: "JOIN";
      roomId: string;
    } & ChromeMsgBase)
  | ({
      type: "HOST";
      roomName: string;
      currentUrl: string;
    } & ChromeMsgBase);

/** Stored locally */
export interface RoomDetails {
  roomId: string;
  roomName: string;
  participantsCount: number;
  host: boolean;
}

export interface RoomUrl {
  url: string;
}

export enum LeaveType {
  Disband = "DISBAND",
  Leave = "LEAVE",
}

export type LeaveMsg =
  | {
      type: "REQUEST_LEAVE";
      reason: LeaveType;
    }
  | {
      type: "INITIATE_LEAVE";
    }
  | {
      type: "LEFT_ROOM";
    };
