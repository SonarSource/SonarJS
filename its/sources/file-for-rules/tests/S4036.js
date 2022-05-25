const cp = require('child_process');
cp.exec('file.exe'); // Sensitive

cp.exec('/usr/bin/file.exe'); // Compliant