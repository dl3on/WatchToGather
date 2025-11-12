import { io, SocketOptions, ManagerOptions, Socket } from "socket.io-client";
import {
  ClientToServerEvents,
  EServerToClientEvents,
  Response,
  ServerToClientEvents,
  ResponseType,
  EClientToServerEvents,
} from "../../common/types";

type SignalManagerOptions = {
  peerId: string;
  serverUrl: string;
  socketOptions?: Omit<Partial<ManagerOptions & SocketOptions>, "autoConnect">;
  verbose?: boolean;
};
export class SignalManager {
  _peerId: string;
  _socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  _verbose: boolean;
  constructor(opts: SignalManagerOptions) {
    const { peerId, serverUrl, socketOptions, verbose = false } = opts;
    this._peerId = peerId;
    this._socket = io(serverUrl, { ...socketOptions, autoConnect: false });
    this._verbose = verbose;
  }

  public connect() {
    this._socket.connect();
    this.updateListeners();
  }

  public join(roomId: string) {
    this._socket.emit(EClientToServerEvents.Join, {
      peerId: this._peerId,
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

  private onConnect() {
    if (this._verbose)
      console.log(
        `Connected to signalling server.\nSocket ID: ${this._socket.id}`
      );
  }

  private onJoinResponse(res: Response<ResponseType.Join>) {
    if (this._verbose) {
      if (res.success) {
        console.log(`Received response from server: ${res.body}`);
      } else {
        console.log(`Failed to join room ${res.roomId}:`, res.errMsg);
      }
    }
  }

  private onHostResponse(res: Response<ResponseType.Host>) {
    if (this._verbose) {
      if (res.success) {
        console.log(`Successfully created Room ${res.roomId}`);
      } else {
        console.log(`Failed to create room:`, res.errMsg);
      }
    }
  }

  private updateListeners() {
    if (this._socket) {
      this._socket.on("connect", this.onConnect);
      this._socket.on(EServerToClientEvents.JoinResponse, this.onJoinResponse);
      this._socket.on(EServerToClientEvents.HostResponse, this.onHostResponse);
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
