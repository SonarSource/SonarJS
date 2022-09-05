exports.hello = function(name) {
  console.log('Starting...');;
  setTimeout(() => {
    console.log(`Hello, ${name.toUpperCase()}!`);
    setTimeout(() => console.log('Stopped!'), 100);
  }, sleep);
}
