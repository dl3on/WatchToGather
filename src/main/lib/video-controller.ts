import {
  PeerMessageType,
  PeerTimeMessage,
} from "../../common/sync-messages-types";
import { sendVCMsg } from "./chrome";

export class VideoController {
  _video: HTMLVideoElement;

  private static readonly BUFFER_GRACE_MS = 1000;

  private _ignoreNextPause = false;
  private _ignoreNextPlay = false;
  private _ignoreSeekCount = 0;
  private _isSeeking = false;
  private _isBuffering = false;
  private _bufferingTimer?: number; // Grace window before sending a Pause due to "waiting"

  private _pauseHandler = () => this.onPause();
  private _playHandler = () => this.onPlay();
  private _seekingHandler = () => {
    this._isSeeking = true;
  };
  private _seekedHandler = () => this.onSeeked();
  private _waitingHandler = () => this.onWaiting(); // Buffering
  private _playingHandler = () => this.onPlaying();

  constructor(videoElement: HTMLVideoElement) {
    this._video = videoElement;

    /* https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement */
    this._video.addEventListener("pause", this._pauseHandler);
    this._video.addEventListener("play", this._playHandler);
    this._video.addEventListener("seeking", this._seekingHandler);
    this._video.addEventListener("seeked", this._seekedHandler);
    this._video.addEventListener("waiting", this._waitingHandler);
    this._video.addEventListener("playing", this._playingHandler);
  }

  destroy() {
    if (this._video) {
      this._video.removeEventListener("pause", this._pauseHandler);
      this._video.removeEventListener("play", this._playHandler);
      this._video.removeEventListener("seeking", this._seekingHandler);
      this._video.removeEventListener("seeked", this._seekedHandler);
      this._video.removeEventListener("waiting", this._waitingHandler);
      this._video.removeEventListener("playing", this._playingHandler);
      this._video = null as any;
    }
  }

  onPause() {
    if (this._ignoreNextPause) {
      this._ignoreNextPause = false;
      return;
    }

    sendVCMsg({
      type: PeerMessageType.Pause,
      time: this._video.currentTime,
      duration: this.getDuration(),
    });
  }

  onPlay() {
    if (this._ignoreNextPlay) {
      this._ignoreNextPlay = false;
      return;
    }

    sendVCMsg({
      type: PeerMessageType.Play,
      time: this._video.currentTime,
      duration: this.getDuration(),
    });
  }

  onSeeked() {
    this._isSeeking = false;
    if (this._ignoreSeekCount > 0) return;

    sendVCMsg({
      type: PeerMessageType.Seek,
      time: this._video.currentTime,
      duration: this.getDuration(),
    });
  }

  onWaiting() {
    if (this._isBuffering || this._bufferingTimer) return;

    const isLikelySeekBuffer = this._isSeeking;
    const currentTime = this._video.currentTime;

    // Debounce micro-bufferings
    this._bufferingTimer = window.setTimeout(() => {
      this._bufferingTimer = undefined;

      if (isLikelySeekBuffer && this._isSeeking === false) return;

      this._isBuffering = true;

      sendVCMsg({
        type: PeerMessageType.PauseOnBuffering,
        time: currentTime,
        duration: this.getDuration(),
      });
    }, VideoController.BUFFER_GRACE_MS);
  }

  onPlaying() {
    if (this._bufferingTimer) {
      clearTimeout(this._bufferingTimer);
      this._bufferingTimer = undefined;
    }

    if (!this._isBuffering) return;

    this._isBuffering = false;

    sendVCMsg({
      type: PeerMessageType.Play,
      time: this._video.currentTime,
      duration: this.getDuration(),
    });
  }

  onRemoteEvent(msg: PeerTimeMessage) {
    // Check peer's readiness: video.play() could be called before video finishes loading
    if (
      msg.type !== PeerMessageType.Pause &&
      !this.isDurationReady(msg.duration)
    ) {
      if (!this._video.paused) {
        this._ignoreNextPause = true;
        this._video.pause();
      }

      sendVCMsg({
        type: PeerMessageType.Pause,
        time: this._video.currentTime,
        duration: this.getDuration(),
      });

      return;
    }

    switch (msg.type) {
      case PeerMessageType.Pause:
      case PeerMessageType.PauseOnBuffering: {
        if (this._video.paused || this._isBuffering) return;

        const currentTime = this._video.currentTime;
        const needsSeek = Math.abs(currentTime - msg.time) >= 2.5;

        this._ignoreNextPause = true;
        this._video.pause();

        if (needsSeek && this._ignoreSeekCount === 0) {
          this._ignoreSeekCount++;
          this._video.currentTime = msg.time;

          this._video.addEventListener(
            "seeked",
            () => {
              this._ignoreSeekCount = Math.max(0, this._ignoreSeekCount - 1);
            },
            { once: true }
          );
        }

        // TODO: show UI message depending on Pause type
        // eg playbackActionUI(msg.type)

        break;
      }

      case PeerMessageType.Play: {
        if (!this._video.paused) return;

        const currentTime = this._video.currentTime;
        const needsSeek = Math.abs(currentTime - msg.time) >= 2.5;

        if (needsSeek && this._ignoreSeekCount === 0) {
          this._ignoreSeekCount++;
          this._video.currentTime = msg.time;

          this._video.addEventListener(
            "seeked",
            () => {
              this._ignoreSeekCount = Math.max(0, this._ignoreSeekCount - 1);
            },
            { once: true }
          );
        }

        this._ignoreNextPlay = true;
        this._video.play();
        break;
      }

      case PeerMessageType.Seek: {
        if (Math.abs(this._video.currentTime - msg.time) < 0.3) return;

        this._ignoreSeekCount++;
        this._video.currentTime = msg.time;

        this._video.addEventListener(
          "seeked",
          () => {
            this._ignoreSeekCount = Math.max(0, this._ignoreSeekCount - 1);
          },
          { once: true }
        );
        break;
      }
    }
  }

  private getDuration() {
    return this._video.duration;
  }

  private isDurationReady(d: number | undefined) {
    return typeof d === "number" && Number.isFinite(d);
  }
}
