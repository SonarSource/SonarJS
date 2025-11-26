function MyVideo() {
  return <video {...props} />; // Noncompliant {{Media elements such as <audio> and <video> must have a <track> for captions.}}
//        ^^^^^
}

// False positive: video with child component that may contain track elements
function VideoWithComponent() {
  return (
    <video>
      <CAVVideoSubtitles />
    </video>
  );
}

// False positive: video with multiple child components
function VideoWithMultipleComponents() {
  return (
    <video>
      <Source src="video.mp4" />
      <Subtitles />
    </video>
  );
}

// False positive: audio with child component
function AudioWithComponent() {
  return (
    <audio>
      <AudioSubtitles />
    </audio>
  );
}

// Still a violation: video with no children
function VideoNoChildren() {
  return <video src="video.mp4" />; // Noncompliant {{Media elements such as <audio> and <video> must have a <track> for captions.}}
//        ^^^^^
}

// Still a violation: video with only text children
function VideoWithText() {
  return <video>Some text</video>; // Noncompliant {{Media elements such as <audio> and <video> must have a <track> for captions.}}
//        ^^^^^
}

// Compliant: video with explicit track element
function VideoWithTrack() {
  return (
    <video>
      <track kind="captions" src="captions.vtt" />
    </video>
  );
}

// Still a violation: video with conditional track elements via map
// The underlying rule should catch this since tracks are not guaranteed
function VideoWithConditionalTracks() {
  const subtitles = [];
  return (
    <video> {/* Noncompliant {{Media elements such as <audio> and <video> must have a <track> for captions.}} */}
      <source src="video.mp4" />
      {subtitles?.map((sub, i) => <track key={i} kind="captions" />)}
    </video>
  );
}

// Compliant: video with track-related component that handles captions
function VideoWithTrackComponent() {
  return (
    <video>
      <source src="video.mp4" />
      <TrackComponent />
    </video>
  );
}
