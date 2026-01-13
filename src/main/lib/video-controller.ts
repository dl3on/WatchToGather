import {
  PeerMessageType,
  PeerTimeMessage,
} from "../../common/sync-messages-types";
import { sendVCMsg } from "./chrome";

export class VideoController {
  _video: HTMLVideoElement;

  private static readonly BUFFER_GRACE_MS = 1000;
  private static readonly SYNC_BEACON_INTERVAL_MS = 30_000;
  private static readonly MIN_DRIFT_THRESHOLD = 0.5;
  private static readonly MAX_DRIFT_THRESHOLD = 1.5;

  private _ignoreNextPause = false;
  private _ignoreNextPlay = false;
  private _ignoreSeekCount = 0;
  private _isSeeking = false;
  private _isBuffering = false;
  private _bufferingTimer?: number; // Grace window before sending a Pause due to "waiting"

  private _syncBeaconTimer?: number; // Fires at 30s intervals
  private _rateSmoothTimer?: number;
  private _rateResetTimer?: number;
  private _lastSyncBeaconAt = 0;

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

    this.startSyncBeacon();
  }

  // For initial sync between host and joiner
  sendVideoState(peerId: string) {
    sendVCMsg({
      type: PeerMessageType.SyncBeacon,
      time: this._video.currentTime,
      paused: this._video.paused,
      target: { kind: "peer", peerId },
      duration: this.getDuration(),
    });
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

    if (this._bufferingTimer) {
      clearTimeout(this._bufferingTimer);
      this._bufferingTimer = undefined;
    }

    if (this._rateResetTimer) {
      clearTimeout(this._rateResetTimer);
      this._rateResetTimer = undefined;
    }

    if (this._syncBeaconTimer) {
      clearInterval(this._syncBeaconTimer);
      this._syncBeaconTimer = undefined;
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

        const drift = msg.time - this._video.currentTime;
        const needsSeek = Math.abs(drift) > VideoController.MAX_DRIFT_THRESHOLD;

        this._ignoreNextPause = true;
        this._video.pause();

        if (needsSeek && this._ignoreSeekCount === 0) {
          this.applySeek(msg.time);
        }

        // TODO: show UI message depending on Pause type
        // eg playbackActionUI(msg.type)

        break;
      }

      case PeerMessageType.Play: {
        if (!this._video.paused) return;

        const drift = msg.time - this._video.currentTime;
        const absDrift = Math.abs(drift);
        const needsSeek = absDrift > VideoController.MAX_DRIFT_THRESHOLD;

        if (needsSeek && this._ignoreSeekCount === 0) {
          this.applySeek(msg.time);
        }

        this._ignoreNextPlay = true;
        this._video.play();

        if (!needsSeek && absDrift > VideoController.MIN_DRIFT_THRESHOLD) {
          this.maybeSendSyncBeacon();
        }

        break;
      }

      case PeerMessageType.Seek: {
        if (Math.abs(this._video.currentTime - msg.time) < 0.3) return;

        this.applySeek(msg.time);
        break;
      }

      case PeerMessageType.SyncBeacon: {
        const drift = msg.time - this._video.currentTime;
        const absDrift = Math.abs(drift);

        // Paused state: immediately sync timestamps
        if (this._video.paused || msg.paused) {
          if (msg.paused && !this._video.paused) {
            this._ignoreNextPause = true;
            this._video.pause();
          }

          if (absDrift > VideoController.MIN_DRIFT_THRESHOLD) {
            this.applySeek(msg.time);
          }

          if (!msg.paused && this._video.paused) {
            this._ignoreNextPlay = true;
            this._video.play();
          }

          return;
        }

        // Playing state
        // Small drift (> 0.5s & <= 1.5s) -> Temporary playbackRate correction
        if (absDrift <= VideoController.MAX_DRIFT_THRESHOLD) {
          if (absDrift <= VideoController.MIN_DRIFT_THRESHOLD) return;

          if (this._rateResetTimer) {
            clearTimeout(this._rateResetTimer);
            this._rateResetTimer = undefined;
          }

          if (this._rateSmoothTimer) {
            clearTimeout(this._rateSmoothTimer);
            this._rateSmoothTimer = undefined;
          }

          let slowBurst: number, fastBurst: number;
          let slowRate: number, fastRate: number;
          if (absDrift < 0.75) {
            slowBurst = 0.92;
            fastBurst = 1.08;

            slowRate = 0.97;
            fastRate = 1.03;
          } else if (absDrift < 1.0) {
            slowBurst = 0.88;
            fastBurst = 1.12;

            slowRate = 0.95;
            fastRate = 1.05;
          } else {
            // < 1.5s
            slowBurst = 0.85;
            fastBurst = 1.15;

            slowRate = 0.92;
            fastRate = 1.08;
          }

          // Short aggressive burst then smooth out rate
          this._video.playbackRate = drift > 0 ? fastBurst : slowBurst;

          this._rateSmoothTimer = window.setTimeout(() => {
            this._video.playbackRate = drift > 0 ? fastRate : slowRate;
            this._rateSmoothTimer = undefined;
          }, 350);

          this._rateResetTimer = window.setTimeout(() => {
            this._video.playbackRate = 1;
            this._rateResetTimer = undefined;
          }, 1500);
        } else {
          // Large drift (> 1.5s) -> Hard seek
          this.applySeek(msg.time);
        }

        break;
      }
    }
  }

  private applySeek(targetTime: number) {
    this._ignoreSeekCount++;

    this._video.addEventListener(
      "seeked",
      () => {
        this._ignoreSeekCount = Math.max(0, this._ignoreSeekCount - 1);
      },
      { once: true }
    );

    this._video.currentTime = targetTime;
  }

  private getDuration() {
    return this._video.duration;
  }

  private isDurationReady(d: number | undefined) {
    return typeof d === "number" && Number.isFinite(d);
  }

  // Only broadcasted by host
  private startSyncBeacon() {
    if (this._syncBeaconTimer) return;

    this._syncBeaconTimer = window.setInterval(() => {
      this.maybeSendSyncBeacon();
    }, VideoController.SYNC_BEACON_INTERVAL_MS);
  }

  private maybeSendSyncBeacon() {
    // 5s min gap between sync beacon messages
    const now = Date.now();
    if (now - this._lastSyncBeaconAt < 5000) return;

    this._lastSyncBeaconAt = now;

    sendVCMsg({
      type: PeerMessageType.SyncBeacon,
      time: this._video.currentTime,
      paused: this._video.paused,
      target: { kind: "broadcast" },
      duration: this.getDuration(),
    });
  }
}
