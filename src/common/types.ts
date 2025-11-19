export type RoomInfo = {
  roomName: string;
  peers: PeerData[];
};

export type PeerData = {
  peerId: string;
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
}

export enum ResponseType {
  Join,
  Host,
}

export type Message<T extends MessageType> = T extends MessageType.Join
  ? { roomId: string }
  : T extends MessageType.Offer
  ? { [targetPeerId: string]: RTCSessionDescription }
  : T extends MessageType.OfferRelay
  ? { fromPeerId: string; offer: RTCSessionDescription }
  : T extends MessageType.Answer
  ? {
      fromPeerId: string;
      toPeerId: string;
      answer: RTCSessionDescription;
    }
  : T extends MessageType.ICE
  ? { fromPeerId: string; toPeerId: string; candidate: RTCIceCandidate }
  : T extends MessageType.Host
  ? { roomName: string }
  : { msg: string };

export type Response<T extends ResponseType> =
  | {
      success: true;
      roomId: string;
      body: T extends ResponseType.Join ? RoomInfo : string;
      type: T;
    }
  | { success: false; roomId: string; errMsg: string };

export enum EClientToServerEvents {
  Join = "join",
  Host = "host",
  Offer = "offer",
  Answer = "answer",
  ICECandidate = "iceCandidate",
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
}

export interface ServerToClientEvents {
  joinResponse: (msg: Response<ResponseType.Join>) => void;
  hostResponse: (msg: Response<ResponseType.Host>) => void;
  offerRelay: (msg: Message<MessageType.OfferRelay>) => void;
  answerRelay: (msg: Message<MessageType.Answer>) => void;
  iceRelay: (msg: Message<MessageType.ICE>) => void;
  error: (msg: Message<MessageType.Error>) => void;
}

type ChromeMsgBase = { id: string; email: string };

export type ChromeMsg =
  | ({
      type: "JOIN";
      roomId: string;
    } & ChromeMsgBase)
  | ({
      type: "HOST";
      roomName: string;
    } & ChromeMsgBase);

export interface RoomDetails {
  roomId: string;
  roomName: string;
  participantsCount: number;
  host: boolean;
}
