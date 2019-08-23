// absolute path to a snapshot file from SonarTS
const source = process.argv[2];
// absolute path to a file to create for ruling IT in SonarJS
const destination = process.argv[3];

const fs = require('fs');

const data  = fs.readFileSync(source).toString().trim();
const result = {};
data.split("\n").forEach(line => {
  const [filepath, lineNumbers] = line.split(":");
  var lineNumbersAsArray = lineNumbers.split(',').map(function(item) {
    return parseInt(item, 10);
  });
  result["ts-project:" + filepath.substring(4)] = lineNumbersAsArray;
});

const json = JSON.stringify(result, null, 2);
console.log(json);
fs.writeFileSync(destination, json);


