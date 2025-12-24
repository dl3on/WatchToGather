import {
  HostInitialUrl,
  PeerMessage,
  PeerMessageType,
  PeerNextVideoMessage,
} from "../../common/sync-messages-types.js";
import {
  EClientToServerEvents,
  EServerToClientEvents,
  Message,
  MessageType,
  Response,
  ResponseType,
} from "../../common/types.js";
import { SignalManager } from "./signal-manager.js";
import type { MessageManager } from "./message-manager.js";
import { loadRoomUrl, saveRoomUrl } from "./chrome.js";

type WebRTCManagerOptions = {
  peerId: string;
  stunServer?: string;
  verbose?: boolean;
};

type PeerConnectionData = {
  [peerId: string]: {
    peerConnection: RTCPeerConnection;
    isHost: boolean;
    dataChannel?: RTCDataChannel;
  };
};

enum EConnectionType {
  Offerer,
  Acceptor,
}

export class WebRTCManager {
  private static _instance: WebRTCManager | null;
  _messageManager!: MessageManager;
  _peerId: string;
  _roomId: string | null = null;
  _currentVideoUrl: string | null = null;
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
  ): WebRTCManager;

  public static getInstance(
    signalManager: SignalManager,
    opts?: undefined
  ): WebRTCManager | null;

  public static getInstance(
    signalManager: SignalManager,
    opts?: WebRTCManagerOptions
  ) {
    if (WebRTCManager._instance) {
      return WebRTCManager._instance;
    } else if (opts) {
      const newInstance = new WebRTCManager(signalManager, opts);
      WebRTCManager._instance = newInstance;
      return newInstance;
    } else {
      return null;
    }
  }

  setMessageManager(mm: MessageManager) {
    this._messageManager = mm;
  }

  public isHost(): boolean {
    return this._host;
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
      const hostId = msg.body.peers.find((pd) => pd.host)?.peerId;
      if (!hostId) {
        throw new Error(
          `[WebRTC Manager] No host found in room ${msg.roomId}.`
        );
      }

      const offers = await this._createOffers(
        msg.body.peers.map((pd) => pd.peerId),
        hostId
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

    this._connections[msg.fromPeerId] = {
      peerConnection: pc,
      isHost: false,
    };
    pc.addEventListener("datachannel", (e) => {
      this._registerDataChannel(msg.fromPeerId, e.channel);
    });

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
      return pc;
    }
  }

  private _registerDataChannel(targetPeerId: string, dc: RTCDataChannel) {
    this._log(`Registered data channel from peer ${targetPeerId}`);
    this._connections[targetPeerId].dataChannel = dc;

    dc.addEventListener("open", () => {
      console.log(`[DC] Open with ${targetPeerId}`);

      if (this._host) {
        this.sendInitialUrlToPeer(dc);
      }
    });
    dc.addEventListener("message", (e) => {
      console.log(`[DC] Message from ${targetPeerId}:`, e.data);
      const msg = JSON.parse(e.data);

      if (msg.type === "HOST_INITIAL_URL") {
        this._log(`Received initial URL from host: ${msg.url}`);
        this._currentVideoUrl = msg.url;
        return;
      }

      this._messageManager.handleMessage(msg);
    });
    dc.addEventListener("close", () => {
      console.log(`[DC] Channel closed for ${targetPeerId}`);
    });
  }

  private async _createOffers(
    peers: string[],
    hostId: string
  ): Promise<{
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
        this._connections[peer] = {
          peerConnection: pc,
          isHost: peer === hostId,
        };
        this._registerDataChannel(peer, dc);
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

  public host(roomName: string, currentUrl: string) {
    this._signalManager.setListener(
      EServerToClientEvents.HostResponse,
      (msg) => {
        if (msg.success) {
          this._roomId = msg.roomId;
        }
      },
      true
    );

    this._currentVideoUrl = currentUrl;
    this._host = true;
    this._signalManager.emit(EClientToServerEvents.Host, {
      roomName,
      currentUrl,
    });
  }

  // TODO: Peers send to Host and Host handles ordering & broadcasting
  public broadcastPeerMessage(msg: PeerMessage, relayed: boolean) {
    // Host don't relay NextVideo messages
    if (msg.type === PeerMessageType.NextVideo && this._host && relayed) return;

    const msgJson = JSON.stringify(msg);
    for (const { dataChannel } of Object.values(this._connections)) {
      if (!dataChannel) continue;

      dataChannel.send(msgJson);
    }
  }

  public sendNextVideoMessage(msg: PeerNextVideoMessage) {
    if (this._host) {
      this.updateCurrentVideoUrl(msg.url);
      const stampedMsg = { ...msg, fromHost: true };
      this.broadcastPeerMessage(stampedMsg, false);
    } else {
      const stampedMsg = { ...msg, fromHost: false };
      const msgJson = JSON.stringify(stampedMsg);
      const hostConn = Object.entries(this._connections).find(
        ([_, conn]) => conn.isHost
      );

      if (!hostConn || !hostConn[1].dataChannel) {
        throw new Error(
          `[WebRTC Manager] No datachannel found with host ${hostConn?.[0]}.`
        );
      }

      hostConn[1].dataChannel.send(msgJson);
    }
  }

  private sendInitialUrlToPeer(dc: RTCDataChannel) {
    let initMsg: HostInitialUrl = {
      type: "HOST_INITIAL_URL",
      url: this._currentVideoUrl!,
    };
    dc.send(JSON.stringify(initMsg));
  }

  public updateCurrentVideoUrl(url: string) {
    this._currentVideoUrl = url;
  }
}
