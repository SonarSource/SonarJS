const date = "01/02";

const datePattern = /(?<month>[0-9]{2})\/(?<year>[0-9]{2})/;
const dateMatched = date.match(datePattern);

if (dateMatched !== null) {
  checkValidity(dateMatched[1], dateMatched[2]); // Noncompliant - numbers instead of names of groups are used
  checkValidity(dateMatched.groups.day); // Noncompliant - there is no group called "day"
}

// ...

const score = "14:1";

const scorePattern = /(?<player1>[0-9]+):(?<player2>[0-9]+)/; // Noncompliant - named groups are never used
const scoreMatched = score.match(scorePattern);

if (scoreMatched !== null) {
  checkScore(score);
}
