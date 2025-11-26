import {
  LocalVideoEvent,
  PeerMessageType,
} from "../common/sync-messages-types";
import { ChromeMsg } from "../common/types";
import { MessageManager } from "./lib/message-manager";
import { SignalManager } from "./lib/signal-manager";
import { WebRTCManager } from "./lib/webrtc-manager";

chrome.runtime.onMessage.addListener((msg: ChromeMsg | LocalVideoEvent) => {
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

  const messageManager = MessageManager.getInstance(email, webrtc);

  if (type === "JOIN") {
    const roomId = msg.roomId;
    signalManager.connect();
    webrtc.join(roomId);
  } else if (type === "HOST") {
    const roomName = msg.roomName;
    webrtc.host(roomName);
  } else if (Object.values(PeerMessageType).includes(type)) {
    if (msg.type == PeerMessageType.NextVideo) {
      messageManager.sendToAll(msg.type, undefined, msg.url);
    } else {
      messageManager.sendToAll(msg.type, msg.time, undefined);
    }
  }
});
