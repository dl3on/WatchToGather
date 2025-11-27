import { io, SocketOptions, ManagerOptions, Socket } from "socket.io-client";
import {
  ClientToServerEvents,
  EServerToClientEvents,
  ServerToClientEvents,
  EClientToServerEvents,
} from "../../common/types.js";
import {
  onJoinResponse,
  onHostResponse,
  onConnect,
} from "./handlers/signal-handlers.js";

type SignalManagerOptions = {
  peerId: string;
  serverUrl: string;
  socketOptions?: Omit<Partial<ManagerOptions & SocketOptions>, "autoConnect">;
  verbose?: boolean;
  query?: Record<string, string>;
};
export class SignalManager {
  private static _instance: SignalManager | null;
  _peerId: string;
  _socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  _verbose: boolean;
  private constructor(opts: SignalManagerOptions) {
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
      query: { ...query, peerId },
    });
    this._verbose = verbose;
  }

  public static getInstance(opts: SignalManagerOptions): SignalManager;

  public static getInstance(opts?: undefined): SignalManager | null;

  public static getInstance(opts?: SignalManagerOptions): SignalManager | null {
    if (!SignalManager._instance && opts) {
      const newInstance = new SignalManager(opts);
      SignalManager._instance = newInstance;
      return newInstance;
    } else if (SignalManager._instance) {
      return SignalManager._instance;
    } else {
      return null;
    }
  }

  public connect() {
    this.initalizeListeners();
    this._socket.connect();
  }

  public sendOffers(offerMap: { [peerId: string]: RTCSessionDescription }) {
    this._socket.emit(EClientToServerEvents.Offer, offerMap);
  }

  public emit<T extends keyof ClientToServerEvents>(
    event: T,
    ...args: Parameters<ClientToServerEvents[T]>
  ) {
    this._socket.emit(event, ...args);
  }

  public disconnect() {
    this._socket.disconnect();
  }

  public setListener<T extends EServerToClientEvents>(
    event: T,
    listener: ServerToClientEvents[T],
    once: boolean = false
  ) {
    if (once) {
      this._socket.once(event, listener as any);
    } else {
      this._socket.on(event, listener as any);
    }
  }

  private initalizeListeners() {
    if (this._socket) {
      this._socket.on("connect", () =>
        onConnect(this._peerId, this._socket.id, this._verbose)
      );
      this._socket.on("connect_error", (msg) => {
        if (this._verbose) console.log(`[SignalManager] [ERROR] ${msg}`);
      });
      this._socket.on(EServerToClientEvents.JoinResponse, (res) =>
        onJoinResponse(res, this._verbose)
      );
      this._socket.on(EServerToClientEvents.HostResponse, (res) =>
        onHostResponse(res, this._verbose)
      );
      this._socket.on(EServerToClientEvents.OfferRelay, (res) => {
        console.log(`[SignalManager] ${JSON.stringify(res, null, 2)}`);
      });
      this._socket.on(EServerToClientEvents.Error, (err) => {
        if (this._verbose) console.log(`[SignalManager] [ERROR] ${err.msg}`);
      });
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
