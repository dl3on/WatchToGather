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

signalManager.connect();
webrtc.join("c794412a-879c-4aea-b89e-7087600e8380");
