import {
  EClientToServerEvents,
  EServerToClientEvents,
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
  }

  async _createOffers(peers: string[]): Promise<{
    [targetPeerId: string]: RTCSessionDescription;
  }> {
    const offerDetails = await Promise.all(
      peers.map(async (p) => {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: this._stunServerUrl }],
        });

        const dc = pc.createDataChannel(`data-${p}`);
        // attach listeners to DC here

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        return [p, offer, pc] as [
          string,
          RTCSessionDescription,
          RTCPeerConnection
        ];
      })
    );

    const offerEntries = offerDetails.map((d) => [d[0], d[1]]);
    const connectionEntries = offerDetails.map((d) => [
      d[0],
      { peerConnection: d[2] },
    ]);

    const connectionMap: PeerConnectionData =
      Object.fromEntries(connectionEntries);
    this._connections = connectionMap;

    const peerMap: { [peerId: string]: RTCSessionDescription } =
      Object.fromEntries(offerEntries);
    return peerMap;
  }

  public async join(roomId: string) {
    this._signalManager.setListener(
      EServerToClientEvents.JoinResponse,
      async (res) => {
        if (res.success) {
          const offers = await this._createOffers(
            res.body.map((pd) => pd.peerId)
          );

          if (this._verbose)
            console.log(`[WebRTC Manager] Created offers: ${offers}`);

          this._signalManager.sendOffers(offers);
        } else {
          throw new Error(
            `Failed to receive peer information from server:\n${res.errMsg}`
          );
        }
      },
      true
    );

    this._signalManager.join(roomId);
  }

  public async host() {
    this._signalManager.setListener(
      EServerToClientEvents.OfferRelay,
      async (res) => {
        if (this._verbose)
          console.log(`[WebRTC Manager] Received offer: ${res}`);
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: this._stunServerUrl }],
        });

        await pc.setRemoteDescription(new RTCSessionDescription(res.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (this._verbose)
          console.log(
            `[WebRTC Manager] Sent answer to offerer ${
              res.fromPeerId
            }: ${JSON.stringify(res.offer, null, 2)}`
          );

        this._connections[res.fromPeerId] = { peerConnection: pc };
        // send answer here
      }
    );

    this._signalManager.host();
  }
}
