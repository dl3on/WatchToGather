export type Connection = {
  hostname: string;
  ip: string;
  action: "host" | "joining";
};

enum MessageType {
  Join,
  Host,
}

export type Message<T extends MessageType> = T extends MessageType.Join
  ? { peerId: string; roomId: string }
  : { peerId: string };

export type JoinResponse =
  | {
      success: true;
      roomId: string;
      body: string;
    }
  | { success: false; roomId: string; errMsg: string };

export interface ClientToServerEvents {
  join: (msg: Message<MessageType.Join>) => void;
  host: (msg: Message<MessageType.Host>) => void;
}

export interface ServerToClientEvents {
  response: (msg: JoinResponse) => void;
}
