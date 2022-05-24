const cp = require('child_process');

cp.exec('file.exe');  // Noncompliant {{Call this 'fail' assertion.}}
// ^^^^
cp.execSync('file.exe');  // Noncompliant
// ^^^^^^^^
cp.spawn('file.exe');  // Noncompliant
// ^^^^^
cp.spawnSync('file.exe');  // Noncompliant
// ^^^^^^^^^
cp.execFile('file.exe');  // Noncompliant
// ^^^^^^^^
cp.execFileSync('file.exe');  // Noncompliant
// ^^^^^^^^^^^^

cp.exec('./usr/bin/file.exe');
cp.execSync('.\\usr\\bin\\file.exe');
cp.spawn('../usr/bin/file.exe');
cp.spawnSync('..\\usr\\bin\\file.exe');
cp.execFile('/usr/bin/file.exe');
cp.execFileSync('\\usr\\bin\\file.exe');
cp.exec('C:\\usr\\bin\\file.exe');