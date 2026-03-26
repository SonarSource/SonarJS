function MyVideo() {
  return <video {...props} />; // Noncompliant {{Media elements such as <audio> and <video> must have a <track> for captions.}}
//        ^^^^^
}
