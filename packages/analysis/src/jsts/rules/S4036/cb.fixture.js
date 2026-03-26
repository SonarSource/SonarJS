const cp = require('child_process');
cp.exec('file.exe');  // Noncompliant {{Make sure the "PATH" variable only contains fixed, unwriteable directories.}}
//      ^^^^^^^^^^
cp.execSync('file.exe');  // Noncompliant {{Make sure the "PATH" variable only contains fixed, unwriteable directories.}}
//          ^^^^^^^^^^
cp.spawn('file.exe');  // Noncompliant {{Make sure the "PATH" variable only contains fixed, unwriteable directories.}}
//       ^^^^^^^^^^
cp.spawnSync('file.exe');  // Noncompliant {{Make sure the "PATH" variable only contains fixed, unwriteable directories.}}
//           ^^^^^^^^^^
cp.execFile('file.exe');  // Noncompliant {{Make sure the "PATH" variable only contains fixed, unwriteable directories.}}
//          ^^^^^^^^^^
cp.execFileSync('file.exe');  // Noncompliant {{Make sure the "PATH" variable only contains fixed, unwriteable directories.}}
//              ^^^^^^^^^^

const { exec, execSync, spawn, spawnSync, execFile, execFileSync } = require('child_process');
exec('file.exe');  // Noncompliant {{Make sure the "PATH" variable only contains fixed, unwriteable directories.}}
//   ^^^^^^^^^^
execSync('file.exe');  // Noncompliant {{Make sure the "PATH" variable only contains fixed, unwriteable directories.}}
//       ^^^^^^^^^^
spawn('file.exe');  // Noncompliant {{Make sure the "PATH" variable only contains fixed, unwriteable directories.}}
//    ^^^^^^^^^^
spawnSync('file.exe');  // Noncompliant {{Make sure the "PATH" variable only contains fixed, unwriteable directories.}}
//        ^^^^^^^^^^
execFile('file.exe');  // Noncompliant {{Make sure the "PATH" variable only contains fixed, unwriteable directories.}}
//       ^^^^^^^^^^
execFileSync('file.exe');  // Noncompliant {{Make sure the "PATH" variable only contains fixed, unwriteable directories.}}
//           ^^^^^^^^^^

const command = 'file.exe';
exec(command);  // Noncompliant {{Make sure the "PATH" variable only contains fixed, unwriteable directories.}}
//   ^^^^^^^

cp.exec('./usr/bin/file.exe');
cp.execSync('.\\usr\\bin\\file.exe');
cp.spawn('../usr/bin/file.exe');
cp.spawnSync('..\\usr\\bin\\file.exe');
cp.execFile('/usr/bin/file.exe');
cp.execFileSync('\\usr\\bin\\file.exe');
cp.exec('C:\\usr\\bin\\file.exe');
cp.exec();
cp.exec(12);

const someObject = {
    exec: () => {}
};
someObject.exec('file.exe');

function someFunctionWithScope() {
    function exec() {}
    exec();
}
someFunctionWithScope();

const cleanCommand = './file.exe';
exec(cleanCommand);
