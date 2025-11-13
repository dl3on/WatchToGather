export type PeerData = {
  peerId: string;
  socketId: string;
  host: boolean;
};

export enum MessageType {
  Join,
  Host,
}

export enum ResponseType {
  Join,
  Host,
}

export type Message<T extends MessageType> = T extends MessageType.Join
  ? { peerId: string; roomId: string; offer: RTCSessionDescription }
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
}

export enum EServerToClientEvents {
  JoinResponse = "joinResponse",
  HostResponse = "hostResponse",
}

export interface ClientToServerEvents {
  join: (msg: Message<MessageType.Join>) => void;
  host: (msg: Message<MessageType.Host>) => void;
}

export interface ServerToClientEvents {
  joinResponse: (msg: Response<ResponseType.Join>) => void;
  hostResponse: (msg: Response<ResponseType.Host>) => void;
}
