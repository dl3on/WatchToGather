import { ChromeMsg } from "../common/types";
import { SignalManager } from "./lib/signal-manager";
import { WebRTCManager } from "./lib/webrtc-manager";
chrome.runtime.onMessage.addListener((msg: ChromeMsg) => {
  const { type, id, email } = msg;

  const signalManager = new SignalManager({
    peerId: email,
    serverUrl: "ws://localhost:6767/",
    verbose: true,
    socketOptions: {
      transports: ["websocket"],
    },
  });

  const webrtc = new WebRTCManager(signalManager, {
    peerId: email,
    verbose: true,
  });

  if (msg.type === "JOIN") {
    const roomId = msg.roomId;
    signalManager.connect();
    webrtc.join(roomId);
  } else if (msg.type === "HOST") {
    webrtc.host();
  }
});
