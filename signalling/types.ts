export type Connection = {
  hostname: string;
  ip: string;
  action: "host" | "joining";
};

export type JoinMessage = {
  peerId: string;
  roomId: string;
};
