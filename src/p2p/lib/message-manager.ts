import { PeerMessage, PeerMessageType } from "../../common/sync-messages-types";
import type { WebRTCManager } from "./webrtc-manager";

export class MessageManager {
  private static _instance: MessageManager | null;
  _peerId: string;
  _webrtcManager!: WebRTCManager;
  constructor(peerId: string) {
    this._peerId = peerId;
  }

  public static getInstance(peerId: string): MessageManager {
    if (!MessageManager._instance) {
      const newInstance = new MessageManager(peerId);
      MessageManager._instance = newInstance;
      return newInstance;
    } else {
      return MessageManager._instance;
    }
  }

  setWebRTCManager(wrtcm: WebRTCManager) {
    this._webrtcManager = wrtcm;
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
