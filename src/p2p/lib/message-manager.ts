import {
  LocalNextVideoEvent,
  LocalVideoTimeEvent,
  PeerMessage,
  PeerMessageType,
  PeerNextVideoAckMessage,
  PeerNextVideoMessage,
  PeerNextVideoNackMessage,
  PeerReadinessMap,
  PeerReadyStateMessage,
  PeerTimeMessage,
} from "../../common/sync-messages-types";
import { isPlaybackControlMessage } from "../../common/utils";
import {
  forwardRemotePeerMsg,
  notifyNextVideo,
  sendCurrentVideoState,
  updatePeerReadinessUI,
} from "./chrome";
import type { WebRTCManager } from "./webrtc-manager";

export class MessageManager {
  private static _instance: MessageManager | null;
  _peerId: string;
  _username: string;
  _webrtcManager!: WebRTCManager;

  _lamportClock = 0;
  _lastAppliedLamport = 0;

  _seenMessages: Set<string>;
  _peerReadinessMap: PeerReadinessMap;
  constructor(peerId: string, username: string) {
    this._peerId = peerId;
    this._username = username;
    this._seenMessages = new Set();
    this._peerReadinessMap = {};
  }

  public static getInstance(peerId: string, username: string): MessageManager;

  public static getInstance(): MessageManager | null;

  public static getInstance(
    peerId?: string,
    username?: string,
  ): MessageManager | null {
    if (!MessageManager._instance && peerId && username) {
      const newInstance = new MessageManager(peerId, username);
      MessageManager._instance = newInstance;
      return newInstance;
    }

    return MessageManager._instance;
  }

  public destroy() {
    this._webrtcManager = null as any;

    this._seenMessages.clear();
    this._peerReadinessMap = {};
    this._lamportClock = 0;
    this._lastAppliedLamport = 0;

    if (MessageManager._instance === this) {
      MessageManager._instance = null;
    }
  }

  public setWebRTCManager(wrtcm: WebRTCManager) {
    this._webrtcManager = wrtcm;
  }

  public getPeerReadinessMap(): PeerReadinessMap {
    return this._peerReadinessMap;
  }

  public handleMessage(msg: PeerMessage) {
    if (this._seenMessages.has(msg.mid)) return;
    this._seenMessages.add(msg.mid);

    this._lamportClock = Math.max(this._lamportClock, msg.lamport) + 1;

    if (msg.type === PeerMessageType.NextVideo) {
      notifyNextVideo(msg);
    } else if (msg.type === PeerMessageType.NextVideoAck) {
      this.updatePeerReadinessMap(msg.fromPeerId, msg.username, true);

      // Now that peer is ready, send a sync beacon to start syncing
      sendCurrentVideoState(msg.fromPeerId);
      return;
    } else if (msg.type === PeerMessageType.NextVideoNack) {
      this.updatePeerReadinessMap(msg.fromPeerId, msg.username, false);
      return;
    } else if (msg.type === PeerMessageType.ReadyStateUpdate) {
      this._peerReadinessMap = msg.readinessMap;
      updatePeerReadinessUI(this.getPeerReadinessMap());
    } else if (isPlaybackControlMessage(msg)) {
      // Drops late playback messages
      if (msg.lamport < this._lastAppliedLamport) return;
      this._lastAppliedLamport = msg.lamport;

      forwardRemotePeerMsg(msg);

      if (
        msg.type === PeerMessageType.SyncBeacon &&
        msg.target.kind === "peer"
      ) {
        // Do not broadcast to other peers
        return;
      }
    }

    // Relay received msg to ensure every peer receives it
    this._webrtcManager.broadcastPeerMessage(msg, true);
  }

  public sendMessage(msg: LocalVideoTimeEvent) {
    let msgToSend: PeerTimeMessage;

    if (msg.type === PeerMessageType.SyncBeacon) {
      msgToSend = {
        mid: crypto.randomUUID(),
        fromPeerId: this._peerId,
        username: this._username,
        lamport: ++this._lamportClock,
        type: msg.type,
        time: msg.time,
        paused: msg.paused,
        target: msg.target,
        duration: msg.duration,
      };

      if (msg.target.kind !== "broadcast") {
        this._seenMessages.add(msgToSend.mid);
        this._webrtcManager.sendMessageToPeer(msgToSend, msg.target.peerId);
        return;
      }
    } else {
      msgToSend = {
        mid: crypto.randomUUID(),
        fromPeerId: this._peerId,
        username: this._username,
        lamport: ++this._lamportClock,
        type: msg.type,
        time: msg.time,
        duration: msg.duration,
      };
    }

    this._seenMessages.add(msgToSend.mid);
    this._webrtcManager.sendMessage(msgToSend);
  }

  public sendNextVideo(msg: LocalNextVideoEvent) {
    let msgToSend: PeerNextVideoMessage;
    msgToSend = {
      mid: crypto.randomUUID(),
      fromPeerId: this._peerId,
      username: this._username,
      lamport: ++this._lamportClock,
      type: msg.type,
      url: msg.url,
    };
    this._seenMessages.add(msgToSend.mid);
    this._webrtcManager.sendNextVideoMessage(msgToSend);
  }

  public nextVideoAck(url: string, isHost: boolean) {
    if (isHost) {
      this.updatePeerReadinessMap(this._peerId, this._username, true);
      return;
    }

    let ackMsg: PeerNextVideoAckMessage;
    ackMsg = {
      mid: crypto.randomUUID(),
      fromPeerId: this._peerId,
      username: this._username,
      lamport: ++this._lamportClock,
      type: PeerMessageType.NextVideoAck,
      url,
    };
    this._webrtcManager.sendMessage(ackMsg);
  }

  public nextVideoNack(url: string, isHost: boolean) {
    if (isHost) {
      this.updatePeerReadinessMap(this._peerId, this._username, false);
      return;
    }

    let nackMsg: PeerNextVideoNackMessage;
    nackMsg = {
      mid: crypto.randomUUID(),
      fromPeerId: this._peerId,
      username: this._username,
      lamport: ++this._lamportClock,
      type: PeerMessageType.NextVideoNack,
      url,
    };
    this._webrtcManager.sendMessage(nackMsg);
  }

  /**
   * Host-only functions
   */

  private getOrCreateReadinessMapEntry(
    peerId: string,
    username: string,
  ): PeerReadinessMap[string] {
    if (!this._peerReadinessMap[peerId]) {
      this._peerReadinessMap[peerId] = { username, ready: false };
    }
    return this._peerReadinessMap[peerId];
  }

  private updatePeerReadinessMap(
    peerId: string,
    username: string,
    isReady: boolean,
  ) {
    this.getOrCreateReadinessMapEntry(peerId, username).ready = isReady;
    this.sendPeerReadinessUpdate();
  }

  public resetPeerReadiness() {
    for (const peerId in this._peerReadinessMap) {
      this._peerReadinessMap[peerId].ready = false;
    }
  }

  public deletePeerFromMap(peerId: string) {
    delete this._peerReadinessMap[peerId];
    this.sendPeerReadinessUpdate();
  }

  private sendPeerReadinessUpdate() {
    updatePeerReadinessUI(this.getPeerReadinessMap());

    let mapUpdateMsg: PeerReadyStateMessage;
    mapUpdateMsg = {
      mid: crypto.randomUUID(),
      fromPeerId: this._peerId,
      username: this._username,
      lamport: ++this._lamportClock,
      type: PeerMessageType.ReadyStateUpdate,
      readinessMap: this._peerReadinessMap,
    };

    this._webrtcManager.broadcastPeerMessage(mapUpdateMsg, false);
  }
}
