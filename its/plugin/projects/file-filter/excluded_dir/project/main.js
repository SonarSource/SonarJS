// issues in this file are detected even if parent path contains directory excluded by sonar.javascript.exclusions
// because property is applied on relative path from the base directory
// project base dir is "project" directory
if (cond) {
  foo();
} else {
  foo();
}
