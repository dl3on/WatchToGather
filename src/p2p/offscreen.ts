import { SignalManager } from "./lib/signal-manager";
import { WebRTCManager } from "./lib/webrtc-manager";

const signalManager = new SignalManager({
  peerId: "test",
  serverUrl: "ws://localhost:6767/",
  verbose: true,
  socketOptions: {
    transports: ["websocket"],
  },
});

const webrtc = new WebRTCManager(signalManager, {
  peerId: "test",
  verbose: true,
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "ROOM_ID") {
    const roomId = msg.roomId;
    signalManager.connect();
    webrtc.join(roomId);
  }
});
