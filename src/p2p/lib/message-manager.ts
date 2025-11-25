import { randomUUID } from "node:crypto";
import { PeerMessage, PeerMessageType } from "../../common/peer-messages-types";

export class MessageManager {
  private static _instance: MessageManager | null;
  _peerId: string;
  _peersChannel: RTCDataChannel[];
  constructor(peerId: string, peersChannel: RTCDataChannel[]) {
    this._peerId = peerId;
    this._peersChannel = peersChannel;
  }

  public static getInstance(
    peerId: string,
    peersChannel: RTCDataChannel[]
  ): MessageManager {
    if (!MessageManager._instance) {
      const newInstance = new MessageManager(peerId, peersChannel);
      MessageManager._instance = newInstance;
      return newInstance;
    } else {
      return MessageManager._instance;
    }
  }

  sendToAll(eventType: PeerMessageType, time: number) {
    const msg: PeerMessage = {
      id: randomUUID(),
      type: eventType,
      time: time,
      fromPeerId: this._peerId,
    };
    console.log(msg);
    // send to all
  }

  handleMessage(msg: PeerMessage) {
    // send pause/play/seek/nextVideo message to video controller
  }
}
