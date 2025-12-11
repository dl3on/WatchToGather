import {
  LocalVideoEvent,
  PeerMessageType,
} from "../common/sync-messages-types";
import { ChromeMsg } from "../common/types";
import { MessageManager } from "./lib/message-manager";
import { SignalManager } from "./lib/signal-manager";
import { WebRTCManager } from "./lib/webrtc-manager";

chrome.runtime.onMessage.addListener((msg: ChromeMsg | LocalVideoEvent) => {
  if (isChromeMsg(msg)) {
    const { type, id, email } = msg;

    const signalManager = SignalManager.getInstance({
      peerId: email,
      serverUrl: "wss://signal.coronne.io/",
      verbose: true,
      socketOptions: {
        transports: ["websocket"],
      },
    });

    const webrtc = WebRTCManager.getInstance(signalManager, {
      peerId: email,
      verbose: true,
    });

    const messageManager = MessageManager.getInstance(webrtc._peerId);
    webrtc.setMessageManager(messageManager);
    messageManager.setWebRTCManager(webrtc);

    if (type === "JOIN") {
      const roomId = msg.roomId;
      signalManager.connect();
      webrtc.join(roomId);
    } else if (type === "HOST") {
      const roomName = msg.roomName;
      const currentUrl = msg.currentUrl;
      webrtc.host(roomName, currentUrl);
    }
  } else if (isLocalVideoEvent(msg)) {
    const signalManager = SignalManager.getInstance();
    if (!signalManager) {
      console.log(
        "[WARN] Dropped Message: Received LocalVideoEvent before initialization"
      );
      return;
    }

    const webrtc = WebRTCManager.getInstance(signalManager);
    if (!webrtc) {
      console.log(
        "[WARN] Dropped Message: Received LocalVideoEvent before initialization"
      );
      return;
    }

    const messageManager = MessageManager.getInstance(webrtc._peerId);

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
  return (
    msg.type === PeerMessageType.Pause ||
    msg.type === PeerMessageType.Play ||
    msg.type === PeerMessageType.Seek ||
    msg.type === PeerMessageType.NextVideo
  );
}
