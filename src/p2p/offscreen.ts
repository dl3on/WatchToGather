import {
  LocalVideoEvent,
  PeerMessageType,
} from "../common/sync-messages-types";
import { ChromeMsg } from "../common/types";
import { MessageManager } from "./lib/message-manager";
import { SignalManager } from "./lib/signal-manager";
import { WebRTCManager } from "./lib/webrtc-manager";

let signalManager: SignalManager | null = null;
let webrtc: WebRTCManager | null = null;
let messageManager: MessageManager | null = null;

chrome.runtime.onMessage.addListener((msg: ChromeMsg | LocalVideoEvent) => {
  if (isChromeMsg(msg)) {
    const { type, id, email } = msg;

    signalManager = SignalManager.getInstance({
      peerId: email,
      serverUrl: "wss://signal.coronne.io/",
      verbose: true,
      socketOptions: {
        transports: ["websocket"],
      },
    });

    webrtc = WebRTCManager.getInstance(signalManager, {
      peerId: email,
      verbose: true,
    });

    messageManager = MessageManager.getInstance(email, webrtc);

    if (type === "JOIN") {
      const roomId = msg.roomId;
      signalManager.connect();
      webrtc.join(roomId);
    } else if (type === "HOST") {
      const roomName = msg.roomName;
      webrtc.host(roomName);
    }
  } else if (isLocalVideoEvent(msg)) {
    if (!webrtc || !messageManager) {
      console.log(
        "[WARN] Dropped Message: Received LocalVideoEvent before initialization"
      );
      return;
    }

    if (msg.type == PeerMessageType.NextVideo) {
      messageManager.sendToAll(msg.type, undefined, msg.url);
    } else {
      messageManager.sendToAll(msg.type, msg.time, undefined);
    }
  }
});

function isChromeMsg(msg: any): msg is ChromeMsg {
  return msg.type === "JOIN" || msg.type === "HOST";
}

function isLocalVideoEvent(msg: any): msg is LocalVideoEvent {
  return !isChromeMsg(msg);
}
