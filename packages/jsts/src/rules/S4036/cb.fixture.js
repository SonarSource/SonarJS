const cp = require('child_process');
cp.exec('file.exe');  // Noncompliant {{Make sure the "PATH" used to find this command includes only what you intend.}}
//      ^^^^^^^^^^
cp.execSync('file.exe');  // Noncompliant {{Make sure the "PATH" used to find this command includes only what you intend.}}
//          ^^^^^^^^^^
cp.spawn('file.exe');  // Noncompliant {{Make sure the "PATH" used to find this command includes only what you intend.}}
//       ^^^^^^^^^^
cp.spawnSync('file.exe');  // Noncompliant {{Make sure the "PATH" used to find this command includes only what you intend.}}
//           ^^^^^^^^^^
cp.execFile('file.exe');  // Noncompliant {{Make sure the "PATH" used to find this command includes only what you intend.}}
//          ^^^^^^^^^^
cp.execFileSync('file.exe');  // Noncompliant {{Make sure the "PATH" used to find this command includes only what you intend.}}
//              ^^^^^^^^^^

const { exec, execSync, spawn, spawnSync, execFile, execFileSync } = require('child_process');
exec('file.exe');  // Noncompliant {{Make sure the "PATH" used to find this command includes only what you intend.}}
//   ^^^^^^^^^^
execSync('file.exe');  // Noncompliant {{Make sure the "PATH" used to find this command includes only what you intend.}}
//       ^^^^^^^^^^
spawn('file.exe');  // Noncompliant {{Make sure the "PATH" used to find this command includes only what you intend.}}
//    ^^^^^^^^^^
spawnSync('file.exe');  // Noncompliant {{Make sure the "PATH" used to find this command includes only what you intend.}}
//        ^^^^^^^^^^
execFile('file.exe');  // Noncompliant {{Make sure the "PATH" used to find this command includes only what you intend.}}
//       ^^^^^^^^^^
execFileSync('file.exe');  // Noncompliant {{Make sure the "PATH" used to find this command includes only what you intend.}}
//           ^^^^^^^^^^

const command = 'file.exe';
exec(command);  // Noncompliant {{Make sure the "PATH" used to find this command includes only what you intend.}}
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
