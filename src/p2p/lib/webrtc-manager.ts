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
  };
};

export class WebRTCManager {
  _peerId: string;
  _verbose: boolean;
  _stunServerUrl: string;
  _connections: PeerConnectionData = {};
  _signalManager: SignalManager;
  constructor(signalManager: SignalManager, opts: WebRTCManagerOptions) {
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
    this._signalManager.setListener(EServerToClientEvents.ICERelay, (msg) =>
      this._handleIncomingIce(msg)
    );
  }

  private async _handleAnswer(
    this: WebRTCManager,
    msg: Message<MessageType.Answer>
  ) {
    const { fromPeerId, answer } = msg;
    if (this._verbose)
      console.log(
        `[WebRTC Manager] Received answer from: ${fromPeerId}: ${JSON.stringify(
          answer,
          null,
          2
        )}`
      );

    if (!(fromPeerId in this._connections)) {
      if (this._verbose)
        console.log(
          `[WebRTC Manager] Dropping answer from ${fromPeerId} as it is no longer connected to the client.`
        );

      return;
    }

    await this._connections[fromPeerId].peerConnection.setRemoteDescription(
      answer
    );
  }

  private async _handleJoinResponse(
    this: WebRTCManager,
    msg: Response<ResponseType.Join>
  ) {
    if (msg.success) {
      const offers = await this._createOffers(
        msg.body.peers.map((pd) => pd.peerId)
      );

      if (this._verbose)
        console.log(
          `[WebRTC Manager] Created offers: ${JSON.stringify(offers, null, 2)}`
        );

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
    if (this._verbose) {
      if (e.candidate) {
        console.log(
          `[WebRTC Manager] Found ICE candidate: ${JSON.stringify(
            e.candidate,
            null,
            2
          )}`
        );
      } else {
        console.log("[WebRTC Manager] Null ICE candidate.");
      }
    }

    if (e.candidate) {
      if (this._verbose)
        console.log(
          `[WebRTC Manager] Sending ICE candidate to peer ${targetPeerId}`
        );
      this._signalManager.emit(EClientToServerEvents.ICECandidate, {
        fromPeerId: this._peerId,
        toPeerId: targetPeerId,
        candidate: e.candidate,
      });
    }
  }

  private async _handleIncomingIce(msg: Message<MessageType.ICE>) {
    const { fromPeerId, candidate } = msg;
    if (this._verbose)
      console.log(
        `[WebRTC Manager] Received ICE candidate from ${fromPeerId}: ${JSON.stringify(
          candidate,
          null,
          2
        )}`
      );

    const connection = this._connections[fromPeerId]?.peerConnection;
    if (!connection) {
      if (this._verbose)
        console.log(
          `[WebRTC Manager] Connectiont to ${fromPeerId} no longer exists. Dropping ICE candidate.`
        );
      return;
    }

    await connection.addIceCandidate(candidate);
  }

  private async _handleOfferRelay(msg: Message<MessageType.OfferRelay>) {
    if (this._verbose)
      console.log(
        `[WebRTC Manager] Received offer: ${JSON.stringify(msg, null, 2)}`
      );

    const pc = this._createPeerConnection(msg.fromPeerId, "HOST");

    await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    if (!pc.localDescription)
      throw new Error(
        "[WebRTC Manager] Error setting answer as local description."
      );

    if (this._verbose)
      console.log(
        `[WebRTC Manager] Sent answer to offerer ${
          msg.fromPeerId
        }: ${JSON.stringify(pc.localDescription, null, 2)}`
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
    mode: "JOIN"
  ): [RTCPeerConnection, RTCDataChannel];

  private _createPeerConnection(
    targetPeerId: string,
    mode: "HOST"
  ): RTCPeerConnection;

  private _createPeerConnection(
    targetPeerId: string,
    mode: "JOIN" | "HOST"
  ): [RTCPeerConnection, RTCDataChannel] | RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: this._stunServerUrl }],
    });

    pc.addEventListener("icecandidate", (e) =>
      this._handleOutgoingIce(e, targetPeerId)
    );

    if (mode === "JOIN") {
      const dc = pc.createDataChannel(`data-${targetPeerId}`);
      return [pc, dc];
    } else {
      return pc;
    }
  }

  private async _createOffers(peers: string[]): Promise<{
    [targetPeerId: string]: RTCSessionDescription;
  }> {
    const peerMap: Record<string, RTCSessionDescription> = {};

    await Promise.all(
      peers.map(async (peer) => {
        const [pc, dc] = this._createPeerConnection(peer, "JOIN");

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (!pc.localDescription) {
          if (this._verbose)
            console.log(
              `[WebRTC Manager] Failed to create SDP offer for peer ${peer}.`
            );
          return;
        }

        peerMap[peer] = pc.localDescription;
        this._connections[peer] = { peerConnection: pc };
      })
    );

    return peerMap;
  }

  public async join(roomId: string) {
    this._signalManager.setListener(
      EServerToClientEvents.JoinResponse,
      (msg) => this._handleJoinResponse(msg),
      true
    );

    this._signalManager.emit(EClientToServerEvents.Join, { roomId });
  }

  public async host(roomName: string) {
    this._signalManager.setListener(EServerToClientEvents.OfferRelay, (msg) =>
      this._handleOfferRelay(msg)
    );

    this._signalManager.emit(EClientToServerEvents.Host, { roomName });
  }
}
