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
webrtc.join("1933272a-0cfe-4be1-9b21-b5e5fa574469");
