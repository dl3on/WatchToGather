export type PeerData = {
  peerId: string;
  host: boolean;
};

export enum MessageType {
  Join,
  Host,
  Offer,
  OfferRelay,
}

export enum ResponseType {
  Join,
  Host,
}

export type Message<T extends MessageType> = T extends MessageType.Join
  ? { roomId: string }
  : T extends MessageType.Offer
  ? { targetPeerId: string; offer: RTCSessionDescription }
  : T extends MessageType.OfferRelay
  ? {}
  : { peerId: string };

export type Response<T extends ResponseType> =
  | {
      success: true;
      roomId: string;
      body: T extends ResponseType.Join ? Omit<PeerData, "socketId">[] : string;
      type: T;
    }
  | { success: false; roomId: string; errMsg: string };

export enum EClientToServerEvents {
  Join = "join",
  Host = "host",
  Offer = "offer",
}

export enum EServerToClientEvents {
  JoinResponse = "joinResponse",
  HostResponse = "hostResponse",
  OfferRelay = "offerRelay",
}

export interface ClientToServerEvents {
  join: (msg: Message<MessageType.Join>) => void;
  host: (msg: Message<MessageType.Host>) => void;
  offer: (msg: Message<MessageType.Offer>) => void;
}

export interface ServerToClientEvents {
  joinResponse: (msg: Response<ResponseType.Join>) => void;
  hostResponse: (msg: Response<ResponseType.Host>) => void;
}
