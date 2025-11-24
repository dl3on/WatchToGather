import {
  EClientToServerEvents,
  EServerToClientEvents,
  Message,
  MessageType,
  Response,
  ResponseType,
} from "../../common/types.js";
import { SignalManager } from "./signal-manager.js";

type WebRTCManagerOptions = {
  peerId: string;
  stunServer?: string;
  verbose?: boolean;
};

type PeerConnectionData = {
  [peerId: string]: {
    peerConnection: RTCPeerConnection;
    dataChannel?: RTCDataChannel;
  };
};

enum EConnectionType {
  Offerer,
  Acceptor,
}

export class WebRTCManager {
  private static _instance: WebRTCManager | null;
  _peerId: string;
  _roomId: string | null = null;
  _host: boolean = false;
  _verbose: boolean;
  _stunServerUrl: string;
  _connections: PeerConnectionData = {};
  _signalManager: SignalManager;
  _connectionCount = 0;
  private constructor(
    signalManager: SignalManager,
    opts: WebRTCManagerOptions
  ) {
    const {
      peerId,
      verbose = false,
      stunServer: stunServerUrl = "stun:stun.cloudflare.com:3478",
    } = opts;
    this._peerId = peerId;
    this._verbose = verbose;
    this._stunServerUrl = stunServerUrl;
    this._signalManager = signalManager;
    this._signalManager.connect();
    this._configureSignalManager();
  }

  public static getInstance(
    signalManager: SignalManager,
    opts: WebRTCManagerOptions
  ) {
    if (WebRTCManager._instance) {
      return WebRTCManager._instance;
    } else {
      const newInstance = new WebRTCManager(signalManager, opts);
      WebRTCManager._instance = newInstance;
      return newInstance;
    }
  }

  private _checkJoinStatus(): boolean {
    return this._connectionCount === Object.keys(this._connections).length;
  }

  private _configureSignalManager() {
    this._signalManager.setListener(EServerToClientEvents.ICERelay, (msg) =>
      this._handleIncomingIce(msg)
    );

    this._signalManager.setListener(EServerToClientEvents.OfferRelay, (msg) =>
      this._handleOfferRelay(msg)
    );
  }

  private async _handleAnswer(msg: Message<MessageType.Answer>) {
    const { fromPeerId, answer } = msg;
    this._log(
      `Received answer from: ${fromPeerId}: ${JSON.stringify(answer, null, 2)}`
    );

    if (!(fromPeerId in this._connections)) {
      this._log(
        `Dropping answer from ${fromPeerId} as it is no longer connected to the client.`
      );
      return;
    }

    await this._connections[fromPeerId].peerConnection.setRemoteDescription(
      answer
    );
  }

  private _log(msg: string) {
    if (this._verbose) console.log(`[WebRTC Manager] ${msg}`);
  }

  private async _handleJoinResponse(
    this: WebRTCManager,
    msg: Response<ResponseType.Join>
  ) {
    if (msg.success) {
      const offers = await this._createOffers(
        msg.body.peers.map((pd) => pd.peerId)
      );

      this._log(`Created offers: ${JSON.stringify(offers, null, 2)}`);
      this._signalManager.sendOffers(offers);
      this._signalManager.setListener(
        EServerToClientEvents.AnswerRelay,
        (msg) => this._handleAnswer(msg)
      );
    } else {
      throw new Error(
        `[WebRTC Manager] Failed to receive peer information from server:\n${msg.errMsg}`
      );
    }
  }

  private async _handleOutgoingIce(
    e: RTCPeerConnectionIceEvent,
    targetPeerId: string
  ) {
    if (e.candidate) {
      this._log(`Found ICE candidate: ${JSON.stringify(e.candidate, null, 2)}`);
    } else {
      this._log("Null ICE candidate.");
    }

    if (e.candidate) {
      this._log(`Sending ICE candidate to peer ${targetPeerId}`);
      this._signalManager.emit(EClientToServerEvents.ICECandidate, {
        fromPeerId: this._peerId,
        toPeerId: targetPeerId,
        candidate: e.candidate,
      });
    }
  }

  private async _handleIncomingIce(msg: Message<MessageType.ICE>) {
    const { fromPeerId, candidate } = msg;
    this._log(
      `Received ICE candidate from ${fromPeerId}: ${JSON.stringify(
        candidate,
        null,
        2
      )}`
    );

    const connection = this._connections[fromPeerId]?.peerConnection;
    if (!connection) {
      this._log(
        `Connection to ${fromPeerId} no longer exists. Dropping ICE candidate.`
      );
      return;
    }

    await connection.addIceCandidate(candidate);
  }

  private async _handleOfferRelay(msg: Message<MessageType.OfferRelay>) {
    this._log(
      `Received offer from peer ${msg.fromPeerId}: ${JSON.stringify(
        msg,
        null,
        2
      )}`
    );

    const pc = this._createPeerConnection(
      msg.fromPeerId,
      EConnectionType.Acceptor
    );

    await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    if (!pc.localDescription)
      throw new Error(
        "[WebRTC Manager] Error setting answer as local description."
      );

    this._log(
      `Sent answer to offerer ${msg.fromPeerId}: ${JSON.stringify(
        pc.localDescription,
        null,
        2
      )}`
    );

    this._connections[msg.fromPeerId] = { peerConnection: pc };
    this._signalManager.emit(EClientToServerEvents.Answer, {
      fromPeerId: this._peerId,
      toPeerId: msg.fromPeerId,
      answer: pc.localDescription,
    });
  }

  private _createPeerConnection(
    targetPeerId: string,
    mode: EConnectionType.Offerer
  ): [RTCPeerConnection, RTCDataChannel];

  private _createPeerConnection(
    targetPeerId: string,
    mode: EConnectionType.Acceptor
  ): RTCPeerConnection;

  private _createPeerConnection(
    targetPeerId: string,
    mode: EConnectionType
  ): [RTCPeerConnection, RTCDataChannel] | RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: this._stunServerUrl }],
    });

    pc.addEventListener("icecandidate", (e) =>
      this._handleOutgoingIce(e, targetPeerId)
    );

    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "connected") {
        this._log(
          `Successfully established connection to peer ${targetPeerId}`
        );
        this._connectionCount += 1;

        if (!this._host) {
          if (this._checkJoinStatus() && this._roomId)
            this._signalManager.emit(EClientToServerEvents.JoinSuccess, {
              roomId: this._roomId,
            });
        }
      } else if (pc.connectionState === "connecting") {
        this._log(`Attempting to establish connection to peer ${targetPeerId}`);
      } else if (pc.connectionState === "failed") {
        this._log(`ICE exchange with peer ${targetPeerId} failed.`);
      } else if (pc.connectionState === "disconnected") {
        this._log(`Failed to establish connection to peer ${targetPeerId}`);
        this._connectionCount -= 1;
      } else if (pc.connectionState === "closed") {
        this._log(`Disconnected form peer ${targetPeerId}`);
        this._connectionCount -= 1;
      }
    });

    if (mode === EConnectionType.Offerer) {
      const dc = pc.createDataChannel(`data-${targetPeerId}`);
      return [pc, dc];
    } else {
      pc.addEventListener("datachannel", (e) => {
        this._connections[targetPeerId].dataChannel = e.channel;
      });
      
      return pc;
    }
  }

  private async _createOffers(peers: string[]): Promise<{
    [targetPeerId: string]: RTCSessionDescription;
  }> {
    const peerMap: Record<string, RTCSessionDescription> = {};

    await Promise.all(
      peers.map(async (peer) => {
        const [pc, dc] = this._createPeerConnection(
          peer,
          EConnectionType.Offerer
        );

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (!pc.localDescription) {
          this._log(`Failed to create SDP offer for peer ${peer}`);
          return;
        } else {
          this._log(`Successfully created SDP offer for peer ${peer}`);
        }

        peerMap[peer] = pc.localDescription;
        this._connections[peer] = { peerConnection: pc, dataChannel: dc };
      })
    );

    return peerMap;
  }

  public join(roomId: string) {
    this._signalManager.setListener(
      EServerToClientEvents.JoinResponse,
      (msg) => this._handleJoinResponse(msg),
      true
    );

    this._signalManager.emit(EClientToServerEvents.Join, { roomId });
  }

  public host(roomName: string) {
    this._signalManager.setListener(
      EServerToClientEvents.HostResponse,
      (msg) => {
        if (msg.success) {
          this._roomId = msg.roomId;
        }
      },
      true
    );

    this._host = true;
    this._signalManager.emit(EClientToServerEvents.Host, { roomName });
  }
}
