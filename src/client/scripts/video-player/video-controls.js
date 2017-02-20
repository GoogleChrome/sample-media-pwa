/**
 *
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

import Utils from '../helpers/utils';
import DownloadProgress from './download-progress';

class VideoControls {

  static get OFFLINE_BUTTON_SELECTOR () {
    return 'js-offline-button';
  }

  static get HIDE_TIMEOUT () {
    return 500;
  }

  constructor (videoControls) {
    this._videoControls = videoControls;
    this._playPauseBig =
        this._videoControls.querySelector('.js-play-pause-big');
    this._playPauseStandard =
        this._videoControls.querySelector('.js-play-pause-standard');
    this._fullscreen = this._videoControls.querySelector('.js-fullscreen');
    this._chromecast = this._videoControls.querySelector('.js-chromecast');
    this._volume = this._videoControls.querySelector('.js-volume');
    this._timeTrack = this._videoControls.querySelector('.js-time-track');
    this._timeUsed = this._videoControls.querySelector('.js-time-used');
    this._playhead = this._videoControls.querySelector('.js-playhead');
    this._duration = this._videoControls.querySelector('.js-duration');
    this._replay = document.querySelector('.js-replay');
    this._offline = document.querySelectorAll('.js-offline');

    this._enabled = false;
    this._pendingHide = undefined;
    this._castConnected = false;
    this._trackDrag = false;
    this._trackBCR = null;

    this.toggleControls = this.toggleControls.bind(this);
    this.showControls = this.showControls.bind(this);
    this.hideControls = this.hideControls.bind(this);
    this.updateTimeTrack = this.updateTimeTrack.bind(this);

    this._onClick = this._onClick.bind(this);
    this._onFullscreenChange = this._onFullscreenChange.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onInputDown = this._onInputDown.bind(this);
    this._onInputMove = this._onInputMove.bind(this);
    this._onInputUp = this._onInputUp.bind(this);
    this._onResize = this._onResize.bind(this);

    this._addEventListeners();
  }

  get castConnected () {
    return this._castConnected;
  }

  set castConnected (_castConnected) {
    const connectedClass = 'player__controls-standard-chromecast--connected';

    this._castConnected = _castConnected;
    this._chromecast.classList.toggle(connectedClass, _castConnected);
  }

  get enabled () {
    return this._enabled;
  }

  set enabled (_enabled) {
    this._enabled = _enabled;

    if (!this._enabled) {
      this.hideControls(0);
      this._videoControls.classList.remove('player__controls--active');
      return;
    }

    this._videoControls.classList.add('player__controls--active');
  }

  showChromecastButton () {
    this._chromecast.hidden = false;
  }

  hideChromecastButton () {
    this._chromecast.hidden = true;
  }

  _toggleChromecastButtonVisibility (isVisible) {
    const chromeCastButton = this._videoControls
        .querySelector('.player__controls-standard-chromecast');

    chromeCastButton.hidden = isVisible;
  }

  _addEventListeners () {
    this._videoControls.addEventListener('mousemove', _ => this.showControls());
    this._videoControls.addEventListener('mouseout', _ => this.hideControls());

    this._videoControls.addEventListener('mousedown', this._onInputDown);
    this._videoControls.addEventListener('mousemove', this._onInputMove);
    this._videoControls.addEventListener('mouseup', this._onInputUp);
    this._videoControls.addEventListener('touchstart', this._onInputDown, {
      passive: false
    });
    this._videoControls.addEventListener('touchmove', this._onInputMove, {
      passive: false
    });
    this._videoControls.addEventListener('touchend', this._onInputUp, {
      passive: false
    });

    this._videoControls.addEventListener('click', this._onClick);
    this._replay.addEventListener('click', this._onClick);

    Array.from(this._offline).forEach(offline => {
      offline.addEventListener('click', this._onClick);
    });

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('fullscreenchange', this._onFullscreenChange);
    document.addEventListener('webkitfullscreenchange',
        this._onFullscreenChange);

    window.addEventListener('resize', this._onResize);
  }

  _cancelPendingHide () {
    if (!this._pendingHide) {
      return;
    }

    clearTimeout(this._pendingHide);
    this._pendingHide = undefined;
  }

  showControls (cancelHide=false) {
    this._cancelPendingHide();

    if (!this._enabled) {
      return;
    }

    this._videoControls.classList.add('player__controls--visible');

    if (cancelHide) {
      return;
    }

    this.hideControls(VideoControls.HIDE_TIMEOUT * 5);
  }

  hideControls (timeout=VideoControls.HIDE_TIMEOUT) {
    if (!Number.isFinite(timeout)) {
      timeout = VideoControls.HIDE_TIMEOUT;
    }

    this._cancelPendingHide();
    this._pendingHide = setTimeout(_ => {
      this._videoControls.classList.remove('player__controls--visible');
    }, timeout);
  }

  toggleControls () {
    if (this._videoControls.classList.contains('player__controls--visible')) {
      this.hideControls();
      return;
    }

    this.showControls();
  }

  updateTimeTrack (time, duration) {
    if (this._trackDrag) {
      return;
    }

    if (Number.isNaN(duration)) {
      duration = 1;
    }

    const normalizedTime = time / duration;
    this._setTimeTrackPosition(normalizedTime);
  }

  updateOfflineProgress (percentage) {
    Array.from(this._offline).forEach(offline => {
      DownloadProgress.update(offline, percentage);
    });
  }

  update (state) {
    const pausedBigClass = 'player__controls-big-play-pause--paused';
    const pausedStandardClass = 'player__controls-standard-play-pause--paused';
    const fsClass = 'player__controls-standard-toggle-fullscreen--active';
    const volumeClass = 'player__controls-standard-toggle-volume--muted';
    const offlineHiddenClass =
        'player__controls-standard-toggle-offline--hidden';
    const offlineClass = 'offline--available';

    this._videoControls.dataset.title = state.title;
    this._playPauseBig.classList.toggle(pausedBigClass, state.paused);
    this._playPauseStandard.classList.toggle(pausedStandardClass, state.paused);
    this._fullscreen.classList.toggle(fsClass, state.fullscreen);
    this._volume.classList.toggle(volumeClass, state.volume === 0);
    this._duration.textContent = this._formatDuration(state.duration);
    this.updateTimeTrack(state.currentTime, state.duration);

    Array.from(this._offline).forEach(offline => {
      if (!state.offlineSupported) {
        offline.classList.add(offlineHiddenClass);
        return;
      }

      offline.classList.toggle(offlineClass, state.offline);
      offline.classList.add('fade-in');
    });
  }

  _setTimeTrackPosition (normalizedPosition) {
    this._timeUsed.style.transform = `
      translate(-50%, -50%)
      scaleX(${normalizedPosition})
    `;

    this._playhead.style.transform =
        `translateX(${(normalizedPosition - 1) * 100}%)`;
  }

  _formatDuration (secs) {
    if (Number.isNaN(secs)) {
      return '00:00';
    }

    const lPad = num => {
      return (num < 10 ? '0' : '') + num.toString();
    };

    const hours = Math.floor(secs / 3600);
    secs -= hours * 3600;

    const mins = Math.floor(secs / 60);
    secs -= mins * 60;

    secs = Math.floor(secs);

    return `${(hours > 0 ? hours + ':' : '')}${lPad(mins)}:${lPad(secs)}`;
  }

  _onClick (evt) {
    const type = evt.target.dataset.type;
    const detail = {};

    evt.stopImmediatePropagation();

    if (!type) {
      this.showControls();
      return;
    }

    for (const data in evt.target.dataset) {
      if (!data.startsWith('detail')) {
        continue;
      }

      if (data === 'detail') {
        detail.value = evt.target.dataset.detail;
        continue;
      }

      let detailName = data.replace(/^detail/, '');
      detailName = detailName.substr(0, 1).toLowerCase() +
          detailName.substr(1);

      detail[detailName] = evt.target.dataset[data];
    }

    // Fire off whatever the button says as a custom event, which the player
    // can pick up and use to control the playback.
    Utils.fire(this._videoControls, type, detail);
  }

  _onFullscreenChange () {
    const isFullscreen = (document.fullscreenElement ||
        document.webkitFullscreenElement);
    const fsClass = 'player__controls-standard-toggle-fullscreen--active';

    this._fullscreen.classList.toggle(fsClass, isFullscreen);
  }

  _onKeyDown (evt) {
    switch (evt.keyCode) {
      case 9:
        this.showControls(true);
        return;

      case 32:
        Utils.fire(this._videoControls, 'play-pause');
        return;
    }
  }

  _onInputDown (evt) {
    const controlsVisible =
        this._videoControls.classList.contains('player__controls--visible');

    if (!controlsVisible) {
      evt.preventDefault();
      this.showControls();
      return;
    }

    this._trackDrag = ('timeTrack' in evt.target.dataset);

    if (!this._trackDrag) {
      return;
    }

    if (this._trackBCR) {
      this._evtToTrackPosition(evt);
      return;
    }

    // Get a read on the target element's dimensions.
    this._trackBCR = evt.target.getBoundingClientRect();
    this._evtToTrackPosition(evt);
  }

  _onInputMove (evt) {
    if (!this._trackDrag) {
      return;
    }

    evt.preventDefault();
    this.showControls(true);
    this._evtToTrackPosition(evt);
  }

  _onInputUp (evt) {
    if (!this._trackDrag) {
      return;
    }

    this._trackDrag = false;
    const newTime = this._evtToTrackPosition(evt);

    Utils.fire(this._videoControls, 'seek', {newTime});
    this.hideControls();
  }

  _evtToTrackPosition (evt) {
    const findCandidate = evt => {
      if (evt.touches && evt.touches.length) {
        return evt.touches[0];
      }

      if (evt.changedTouches && evt.changedTouches.length) {
        return evt.changedTouches[0];
      }

      return evt;
    };

    const absX = findCandidate(evt).pageX;
    const normalizedPosition = Utils.clamp(
        (absX - this._trackBCR.left) / this._trackBCR.width,
        0,
        1);

    this._setTimeTrackPosition(normalizedPosition);
    return normalizedPosition;
  }

  _onResize () {
    this._trackBCR = null;
  }
}

export default VideoControls;
