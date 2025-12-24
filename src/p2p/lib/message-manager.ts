import {
  PeerMessage,
  PeerMessageType,
  PeerNextVideoMessage,
  PeerTimeMessage,
} from "../../common/sync-messages-types";
import { forwardRemotePeerMsg, notifyNextVideo } from "./chrome";
import type { WebRTCManager } from "./webrtc-manager";

export class MessageManager {
  private static _instance: MessageManager | null;
  _peerId: string;
  _webrtcManager!: WebRTCManager;
  _seenMessages: Set<string>;
  constructor(peerId: string) {
    this._peerId = peerId;
    this._seenMessages = new Set();
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

  // TODO: Peers send to Host and Host handles ordering & broadcasting
  sendToAll(
    eventType:
      | PeerMessageType.Pause
      | PeerMessageType.Play
      | PeerMessageType.Seek,
    time: number
  ) {
    let msg: PeerTimeMessage;
    msg = {
      mid: crypto.randomUUID(),
      fromPeerId: this._peerId,
      type: eventType,
      time,
    };
    this._seenMessages.add(msg.mid);
    this._webrtcManager.broadcastPeerMessage(msg, false);
  }

  sendNextVideo(eventType: PeerMessageType.NextVideo, url: string) {
    let msg: PeerNextVideoMessage;
    msg = {
      mid: crypto.randomUUID(),
      fromPeerId: this._peerId,
      type: eventType,
      url,
    };
    this._seenMessages.add(msg.mid);
    this._webrtcManager.sendNextVideoMessage(msg);
  }

  handleMessage(msg: PeerMessage) {
    if (this._seenMessages.has(msg.mid)) return;

    this._seenMessages.add(msg.mid);
    if (msg.type !== PeerMessageType.NextVideo) {
      forwardRemotePeerMsg(msg);
    } else {
      this._webrtcManager.updateCurrentVideoUrl(msg.url);
      notifyNextVideo(msg);
    }

    // Relay received msg to ensure every peer receives it
    this._webrtcManager.broadcastPeerMessage(msg, true);
  }

  // TODO: Implement clearing seen messages
  clearSeenMessages() {}
}
