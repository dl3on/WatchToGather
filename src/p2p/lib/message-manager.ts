import {
  PeerMessage,
  PeerMessageType,
  PeerNextVideoAckMessage,
  PeerNextVideoMessage,
  PeerNextVideoNackMessage,
  PeerReadyStateMessage,
  PeerTimeMessage,
} from "../../common/sync-messages-types";
import {
  forwardRemotePeerMsg,
  notifyNextVideo,
  updatePeerReadinessUI,
} from "./chrome";
import type { WebRTCManager } from "./webrtc-manager";

export class MessageManager {
  private static _instance: MessageManager | null;
  _peerId: string;
  _webrtcManager!: WebRTCManager;
  _seenMessages: Set<string>;
  _peerReadinessMap: Record<string, boolean>;
  constructor(peerId: string) {
    this._peerId = peerId;
    this._seenMessages = new Set();
    this._peerReadinessMap = {};
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

  public setWebRTCManager(wrtcm: WebRTCManager) {
    this._webrtcManager = wrtcm;
  }

  public getPeerReadinessMap(): Record<string, boolean> {
    return this._peerReadinessMap;
  }

  public handleMessage(msg: PeerMessage) {
    if (this._seenMessages.has(msg.mid)) return;

    this._seenMessages.add(msg.mid);
    if (msg.type === PeerMessageType.NextVideo) {
      notifyNextVideo(msg);
    } else if (msg.type === PeerMessageType.NextVideoAck) {
      this.updatePeerReadinessMap(msg.fromPeerId, true);
      console.log(`[MM] Host received Ack from ${msg.fromPeerId}`);
      return;
    } else if (msg.type === PeerMessageType.NextVideoNack) {
      this.updatePeerReadinessMap(msg.fromPeerId, false);
      console.log(`[MM] Host received Nack from ${msg.fromPeerId}`);
      return;
    } else if (msg.type === PeerMessageType.ReadyStateUpdate) {
      this._peerReadinessMap = msg.readinessMap;
      console.log(`[MM] Received Map update from host ${msg.fromPeerId}`);
      updatePeerReadinessUI(this.getPeerReadinessMap());
    } else {
      forwardRemotePeerMsg(msg);
    }

    // Relay received msg to ensure every peer receives it
    this._webrtcManager.broadcastPeerMessage(msg, true);
  }

  // TODO: Peers send to Host and Host handles ordering & broadcasting
  public sendToAll(
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

  public sendNextVideo(eventType: PeerMessageType.NextVideo, url: string) {
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

  public nextVideoAck(url: string, isHost: boolean) {
    if (isHost) {
      this.updatePeerReadinessMap(this._peerId, true);
      return;
    }

    let ackMsg: PeerNextVideoAckMessage;
    ackMsg = {
      mid: crypto.randomUUID(),
      fromPeerId: this._peerId,
      type: PeerMessageType.NextVideoAck,
      url,
    };
    this._webrtcManager.sendToHost(ackMsg);
  }

  public nextVideoNack(url: string, isHost: boolean) {
    if (isHost) {
      this.updatePeerReadinessMap(this._peerId, false);
      return;
    }

    let nackMsg: PeerNextVideoNackMessage;
    nackMsg = {
      mid: crypto.randomUUID(),
      fromPeerId: this._peerId,
      type: PeerMessageType.NextVideoNack,
      url,
    };
    this._webrtcManager.sendToHost(nackMsg);
  }

  private updatePeerReadinessMap(peerId: string, isReady: boolean) {
    // Host-only function
    this._peerReadinessMap[peerId] = isReady;
    updatePeerReadinessUI(this.getPeerReadinessMap());

    let mapUpdateMsg: PeerReadyStateMessage;
    mapUpdateMsg = {
      mid: crypto.randomUUID(),
      fromPeerId: this._peerId,
      type: PeerMessageType.ReadyStateUpdate,
      readinessMap: this._peerReadinessMap,
    };

    this._webrtcManager.broadcastPeerMessage(mapUpdateMsg, false);
  }

  public resetPeerReadiness() {
    // Host-only function
    for (const peerId in this._peerReadinessMap) {
      this._peerReadinessMap[peerId] = false;
    }
  }

  // TODO: handle peer leaving room
  public deletePeerFromMap(peerId: string) {}

  // TODO: Implement clearing seen messages
  clearSeenMessages() {}
}
