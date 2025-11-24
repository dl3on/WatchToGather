import { randomUUID } from "node:crypto";
import { PeerMessage, PeerMessageType } from "../../common/peer-messages-types";

export class MessageManager {
  _peerId: string;
  _peersChannel: RTCDataChannel[];
  constructor(peerId: string, peersChannel: RTCDataChannel[]) {
    this._peerId = peerId;
    this._peersChannel = peersChannel;
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
    // send message to video controller
  }
}
