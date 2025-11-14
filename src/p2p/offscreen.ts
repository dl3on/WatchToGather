import { SignalManager } from "./lib/signal-manager";
import { WebRTCManager } from "./lib/webrtc-manager";
chrome.runtime.onMessage.addListener((msg) => {
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

  switch (type) {
    case "JOIN":
      const roomId = msg.roomId;
      signalManager.connect();
      webrtc.join(roomId);
      break;
    case "HOST":
      webrtc.host();
    default:
  }
});
