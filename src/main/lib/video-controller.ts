import { PeerMessage, PeerMessageType } from "../../common/peer-messages-types";

export class VideoController {
  _video: HTMLVideoElement;
  constructor(videoElement: HTMLVideoElement) {
    this._video = videoElement;

    this._video.addEventListener("pause", () => this.onPause());
    this._video.addEventListener("play", () => this.onPlay());
    this._video.addEventListener("seek", () => this.onSeek());
    // TODO: listen to incoming msg from message manager
  }

  onPause() {
    // TODO:
    chrome.runtime.sendMessage({
      type: PeerMessageType.Pause,
      time: this._video.currentTime,
    });
  }

  onPlay() {}

  onSeek() {}

  onRemoteEvent(msg: PeerMessage) {
    console.log(msg);
  }
}
