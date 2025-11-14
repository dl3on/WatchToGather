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
webrtc.join("a74fd242-489d-497e-9c3d-ba23fdbb9ba6");
