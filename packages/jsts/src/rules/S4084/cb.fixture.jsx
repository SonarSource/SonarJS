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

// Still a violation: video with component that doesn't provide tracks
function VideoWithUnrelatedComponent() {
  return (
    <video> {/* Noncompliant {{Media elements such as <audio> and <video> must have a <track> for captions.}} */}
      <source src="video.mp4" />
      <MyCustomComponent />
    </video>
  );
}

// Compliant: video with nested component containing track in name
function VideoWithNestedTrackComponent() {
  return (
    <video>
      <div>
        <CaptionProvider />
      </div>
    </video>
  );
}

// Still a violation: video with only lowercase elements (not components)
function VideoWithOnlyLowercaseElements() {
  return (
    <video> {/* Noncompliant {{Media elements such as <audio> and <video> must have a <track> for captions.}} */}
      <source src="video.mp4" />
      <div>Some content</div>
    </video>
  );
}

// Compliant: video with member expression component for track
function VideoWithMemberExpressionTrack() {
  return (
    <video>
      <Components.TrackProvider />
    </video>
  );
}

// Compliant: video with nested member expression component for captions
function VideoWithNestedMemberExpressionCaption() {
  return (
    <video>
      <UI.Components.CaptionProvider />
    </video>
  );
}

// Compliant: audio with member expression subtitle component
function AudioWithMemberExpressionSubtitle() {
  return (
    <audio>
      <Media.SubtitleProvider />
    </audio>
  );
}

// Still a violation: video with member expression but no track-related name
function VideoWithUnrelatedMemberExpression() {
  return (
    <video> {/* Noncompliant {{Media elements such as <audio> and <video> must have a <track> for captions.}} */}
      <Components.VideoPlayer />
    </video>
  );
}

// Compliant: video with direct track element not in expression
function VideoWithDirectTrack() {
  return (
    <video>
      <source src="video.mp4" />
      <track kind="captions" src="captions.vtt" />
    </video>
  );
}

// Still a violation: video with arrow function returning track
function VideoWithArrowFunctionTrack() {
  const getTrack = () => <track kind="captions" />;
  return (
    <video> {/* Noncompliant {{Media elements such as <audio> and <video> must have a <track> for captions.}} */}
      {getTrack()}
    </video>
  );
}

// Still a violation: video with filter returning tracks
function VideoWithFilteredTracks() {
  const tracks = [1, 2, 3];
  return (
    <video> {/* Noncompliant {{Media elements such as <audio> and <video> must have a <track> for captions.}} */}
      {tracks.filter(Boolean).map(() => <track />)}
    </video>
  );
}

// Compliant: video with caption component deeply nested
function VideoWithDeeplyNestedCaptionComponent() {
  return (
    <video>
      <div>
        <section>
          <CaptionComponent />
        </section>
      </div>
    </video>
  );
}

// Compliant: video with subtitle component in fragment
function VideoWithSubtitleInFragment() {
  return (
    <video>
      <>
        <SubtitleProvider />
      </>
    </video>
  );
}

// Compliant: audio with track-related component
function AudioWithTrackProvider() {
  return (
    <audio>
      <TrackProvider />
    </audio>
  );
}
