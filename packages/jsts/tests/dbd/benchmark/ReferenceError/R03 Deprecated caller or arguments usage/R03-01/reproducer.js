'use strict';

function addTrack(track) {
  const stream = arguments[1];
  if (stream) {
    if (!this._localStreams) {
      // Noncompliant
      this._localStreams = [stream];
    } else if (!this._localStreams.includes(stream)) {
      this._localStreams.push(stream);
    }
  }
  return _addTrack.apply(this, arguments);
}

function _addTrack(track) {
  // ...
}

addTrack('track', 'stream');
