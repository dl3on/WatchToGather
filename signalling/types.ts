export type Connection = {
  hostname: string;
  ip: string;
  action: "host" | "joining";
};

export type JoinMessage = {
  peerId: string;
  roomId: string;
};

export type JoinResponse =
  | {
      success: true;
      roomId: string;
      body: string;
    }
  | { success: false; roomId: string; errMsg: string };

export interface ClientToServerEvents {
  join: (msg: JoinMessage) => void;
}

export interface ServerToClientEvents {
  response: (msg: JoinResponse) => void;
}
