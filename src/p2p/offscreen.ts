import { ChromeMsg } from "../common/types";
import { SignalManager } from "./lib/signal-manager";
import { WebRTCManager } from "./lib/webrtc-manager";
chrome.runtime.onMessage.addListener((msg: ChromeMsg) => {
  const { type, id, email } = msg;

  const signalManager = new SignalManager({
    peerId: email,
    serverUrl: "ws://signal.coronne.io/",
    verbose: true,
    socketOptions: {
      transports: ["websocket"],
    },
  });

  const webrtc = new WebRTCManager(signalManager, {
    peerId: email,
    verbose: true,
  });

  if (type === "JOIN") {
    const roomId = msg.roomId;
    signalManager.connect();
    webrtc.join(roomId);
  } else if (type === "HOST") {
    const roomName = msg.roomName;
    webrtc.host(roomName);
  }
});
