import { io, SocketOptions, ManagerOptions, Socket } from "socket.io-client";
import {
  ClientToServerEvents,
  EServerToClientEvents,
  ServerToClientEvents,
  EClientToServerEvents,
  Response,
} from "../../common/types";
import {
  onJoinResponse,
  onHostResponse,
  onConnect,
} from "./handlers/signal-handlers";

type SignalManagerOptions = {
  peerId: string;
  serverUrl: string;
  socketOptions?: Omit<Partial<ManagerOptions & SocketOptions>, "autoConnect">;
  verbose?: boolean;
  query?: Record<string, string>;
};
export class SignalManager {
  _peerId: string;
  _socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  _verbose: boolean;
  constructor(opts: SignalManagerOptions) {
    const {
      peerId,
      serverUrl,
      socketOptions,
      verbose = false,
      query = {},
    } = opts;
    this._peerId = peerId;
    this._socket = io(serverUrl, {
      ...socketOptions,
      autoConnect: false,
      query: { peerId: this._peerId, ...query },
    });
    this._verbose = verbose;
  }

  public connect() {
    this.updateListeners();
    this._socket.connect();
  }

  public join(roomId: string) {
    this._socket.emit(EClientToServerEvents.Join, {
      roomId,
    });
  }

  public host() {
    this._socket.emit(EClientToServerEvents.Host, {
      peerId: this._peerId,
    });
  }

  public disconnect() {
    this._socket.disconnect();
  }

  private updateListeners() {
    if (this._socket) {
      this._socket.on("connect", () =>
        onConnect(this._socket.id, this._verbose)
      );
      this._socket.on(EServerToClientEvents.JoinResponse, (res) =>
        onJoinResponse(res, this._verbose)
      );
      this._socket.on(EServerToClientEvents.HostResponse, (res) =>
        onHostResponse(res, this._verbose)
      );
    }
  }

  resetListeners() {
    if (this._socket) {
      this._socket.off("connect");
      this._socket.off(EServerToClientEvents.JoinResponse);
      this._socket.off(EServerToClientEvents.HostResponse);
    }
  }
}
