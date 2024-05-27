'use strict';

function addTrack(track, ...streams) {
  if (streams) {
    streams.forEach(stream => {
      if (!this._localStreams) {
        this._localStreams = [stream];
      } else if (!this._localStreams.includes(stream)) {
        this._localStreams.push(stream);
      }
    });
  }
  return _addTrack.apply(this, arguments);
}

function _addTrack(track) {
  // ...
}

addTrack('track', 'stream');
