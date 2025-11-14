import { EServerToClientEvents } from "../../common/types.js";
import { SignalManager } from "./signal-manager.js";

type WebRTCManagerOptions = {
  peerId: string;
  stunServer?: string;
  verbose?: boolean;
};

type PeerConnectionData = {
  [peerId: string]: {
    offer: RTCSessionDescription;
    rtcConnection: RTCPeerConnection;
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
  }

  async _createOffers(peers: string[]) {
    const offerEntries = await Promise.all(
      peers.map(async (p) => {
        const rtc = new RTCPeerConnection({
          iceServers: [{ urls: this._stunServerUrl }],
        });

        const offer = await rtc.createOffer();
        await rtc.setLocalDescription(offer);

        return [p, { offer: offer, rtcConnection: rtc }] as [
          string,
          { offer: RTCSessionDescription; rtcConnection: RTCPeerConnection }
        ];
      })
    );

    const peerMap = Object.fromEntries(offerEntries);
    this._connections = peerMap;
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

          console.log(offers);
          // send back to server
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
