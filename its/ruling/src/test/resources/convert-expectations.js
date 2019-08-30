// absolute path to a snapshot file from SonarTS
const source = process.argv[2];
// absolute path to a directory with expectation for TS projects
const destination = process.argv[3];

const ruleKey = process.argv[4];

const fs = require('fs');

const data  = fs.readFileSync(source).toString().trim();
const resultsByProject = {};
const projects = new Set();

data.split("\n").forEach(line => {
  const [filepath, lineNumbers] = line.split(":");
  var lineNumbersAsArray = lineNumbers.split(',').map(function(item) {
    return parseInt(item, 10);
  });
  const [ , projectKey] = filepath.split("/", 3);
  if (!resultsByProject[projectKey]) {
    resultsByProject[projectKey] = {};
  }
  const result = resultsByProject[projectKey];
  projects.add(projectKey);

  result[projectKey + ":" + filepath.substring(5 + projectKey.length)] = lineNumbersAsArray;
});

projects.forEach(projectKey => {
  const result = resultsByProject[projectKey];
  let json = JSON.stringify(result, null, 2);
  const dir = destination + projectKey;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  json = json.split(" ").join("");
  json = json.split("\"").join("'");
  json = json.split("\n]").join(",\n]");
  fs.writeFileSync(dir + "/typescript-" + ruleKey + ".json", json);
});
