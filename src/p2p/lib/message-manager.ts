import { PeerMessage, PeerMessageType } from "../../common/sync-messages-types";
import { WebRTCManager } from "./webrtc-manager";

export class MessageManager {
  private static _instance: MessageManager | null;
  _peerId: string;
  _webrtcManager: WebRTCManager;
  constructor(peerId: string, webrtc: WebRTCManager) {
    this._peerId = peerId;
    this._webrtcManager = webrtc;
  }

  public static getInstance(
    peerId: string,
    webrtc: WebRTCManager
  ): MessageManager {
    if (!MessageManager._instance) {
      const newInstance = new MessageManager(peerId, webrtc);
      MessageManager._instance = newInstance;
      return newInstance;
    } else {
      return MessageManager._instance;
    }
  }

  sendToAll(eventType: PeerMessageType, time?: number, url?: string) {
    let msg: PeerMessage;

    if (eventType === PeerMessageType.NextVideo) {
      if (!url) throw new Error("NextVideo requires a url");

      msg = {
        mid: crypto.randomUUID(),
        fromPeerId: this._peerId,
        type: eventType,
        url,
      };
    } else {
      if (time == null) throw new Error(`${eventType} requires a time`);

      msg = {
        mid: crypto.randomUUID(),
        fromPeerId: this._peerId,
        type: eventType,
        time,
      };
    }
    this._webrtcManager.broadcastPeerMessage(msg);
  }

  handleMessage(msg: PeerMessage) {
    // send pause/play/seek/nextVideo message to video controller
  }
}
