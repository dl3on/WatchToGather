import {
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
  }

  private async _handleIceCandidate(msg: Message<MessageType.IceCandidate>) {
    const { fromPeerId, candidate } = msg;
    if (this._verbose)
      console.log(
        `[WebRTC Manager] Received ICE candidate from: ${fromPeerId}: ${candidate}`
      );

    if (!(fromPeerId in this._connections)) {
      if (this._verbose)
        console.log(
          `[WebRTC Manager] Dropping ICE candidate from ${fromPeerId} as it is no longer connected to the client.`
        );

      return;
    }

    const pc = this._connections[fromPeerId].peerConnection;
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private async _handleAnswer(
    this: WebRTCManager,
    msg: Message<MessageType.Answer>
  ) {
    const { fromPeerId, answer } = msg;
    if (this._verbose)
      console.log(
        `[WebRTC Manager] Received answer from: ${fromPeerId}: ${answer}`
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
      this._signalManager.setListener(
        EServerToClientEvents.IceCandidateRelay,
        (msg) => this._handleIceCandidate(msg)
      );
    } else {
      throw new Error(
        `[WebRTC Manager] Failed to receive peer information from server:\n${msg.errMsg}`
      );
    }
  }

  private async _createOffers(peers: string[]): Promise<{
    [targetPeerId: string]: RTCSessionDescription;
  }> {
    const offerDetails = await Promise.all(
      peers.map(async (p) => {
        const pc = this._createPeerConnection(p);

        const dc = pc.createDataChannel(`data-${p}`);
        this._registerDataChannel(p, dc);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        return [p, offer] as [string, RTCSessionDescription];
      })
    );

    const peerMap: { [peerId: string]: RTCSessionDescription } = {};
    for (const [p, offer] of offerDetails) {
      peerMap[p] = offer;
    }

    return peerMap;
  }

  private _createPeerConnection(targetPeerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: this._stunServerUrl }],
    });
    this._connections[targetPeerId] = { peerConnection: pc };

    pc.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        this._signalManager.sendICECandidate({
          fromPeerId: this._peerId,
          toPeerId: targetPeerId,
          candidate: event.candidate,
        });
      }
    });

    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "connected") {
        console.log(`[WebRTC] Peer ${targetPeerId} connected`);
      }
      if (pc.connectionState === "disconnected") {
        console.log(`[WebRTC] Peer ${targetPeerId} disconnected`);
      }
    });

    // When answerer receives a data channel
    pc.addEventListener("datachannel", (event) => {
      const dc = event.channel;
      this._registerDataChannel(targetPeerId, dc);
    });
    return pc;
  }

  private _registerDataChannel(targetPeerId: string, dc: RTCDataChannel) {
    this._connections[targetPeerId].dataChannel = dc;

    dc.addEventListener("open", () => {
      console.log(`[DC] Open with ${targetPeerId}`);
    });
    dc.addEventListener("message", (e) => {
      console.log(`[DC] Message from ${targetPeerId}:`, e.data);
    });
    dc.addEventListener("close", () => {
      console.log(`[DC] Channel closed for ${targetPeerId}`);
    });
  }

  public async join(roomId: string) {
    this._signalManager.setListener(
      EServerToClientEvents.JoinResponse,
      (msg) => this._handleJoinResponse(msg),
      true
    );

    this._signalManager.join(roomId);
  }

  public async host(roomName: string) {
    this._signalManager.setListener(
      EServerToClientEvents.OfferRelay,
      async (res) => {
        if (this._verbose)
          console.log(`[WebRTC Manager] Received offer: ${res}`);
        const pc = this._createPeerConnection(res.fromPeerId);

        await pc.setRemoteDescription(new RTCSessionDescription(res.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (!pc.localDescription)
          throw new Error(
            "[WebRTC Manager] Error setting answer as local description."
          );

        if (this._verbose)
          console.log(
            `[WebRTC Manager] Sent answer to offerer ${
              res.fromPeerId
            }: ${JSON.stringify(pc.localDescription, null, 2)}`
          );

        this._signalManager.sendAnswer({
          fromPeerId: this._peerId,
          toPeerId: res.fromPeerId,
          answer: pc.localDescription,
        });
      }
    );
    this._signalManager.setListener(
      EServerToClientEvents.IceCandidateRelay,
      (msg) => this._handleIceCandidate(msg)
    );

    this._signalManager.host(roomName);
  }
}
