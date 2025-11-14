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

export class WebRTCManager {
  _peerId: string;
  _verbose: boolean;
  _stunServerUrl: string;
  _connections: { [peerId: string]: RTCPeerConnection } = {};
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
  }

  async _createOffers(peers: string[]): Promise<{
    [targetPeerId: string]: RTCSessionDescription;
  }> {
    const offerDetails = await Promise.all(
      peers.map(async (p) => {
        const rtc = new RTCPeerConnection({
          iceServers: [{ urls: this._stunServerUrl }],
        });

        const offer = await rtc.createOffer();
        await rtc.setLocalDescription(offer);

        return [p, offer, rtc] as [
          string,
          RTCSessionDescription,
          RTCPeerConnection
        ];
      })
    );

    const offerEntries = offerDetails.map((d) => [d[0], d[1]]);
    const connectionEntries = offerDetails.map((d) => [d[0], d[2]]);
    const peerMap = Object.fromEntries(offerEntries);
    const connectionMap = Object.fromEntries(connectionEntries);
    this._connections = connectionMap;
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
}
