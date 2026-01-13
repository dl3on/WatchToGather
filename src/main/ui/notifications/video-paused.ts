import { PeerMessageType } from "../../../common/sync-messages-types";
import { hideVideoOverlay, showVideoOverlay } from "../overlays/video-overlay";

export function showUserPaused(
  video: HTMLVideoElement,
  type: PeerMessageType.Pause | PeerMessageType.PauseOnBuffering,
  peerName?: string
) {
  let text = "";

  switch (type) {
    case PeerMessageType.Pause:
      text = `${peerName} paused`;
      break;
    case PeerMessageType.PauseOnBuffering:
      text = `Waiting for ${peerName}...`;
      break;
  }

  showVideoOverlay(video, text);
}

export function hidePausedUI() {
  hideVideoOverlay();
}
