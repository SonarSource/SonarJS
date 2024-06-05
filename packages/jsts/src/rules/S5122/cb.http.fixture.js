const http = require('http');

function listener(req, res) {
  res.writeHead(200, { 'Access-Control-Allow-Origin': '*' }); // Noncompliant
  res.end('ok');
}

http.createServer(listener);

http.createServer((_, res) => {
  res.writeHead(200, { 'Access-Control-Allow-Origin': '*' }); // Noncompliant
  res.end('ok');
});

http.createServer((_, res) => {
  const header = { 'Access-Control-Allow-Origin': '*' };
//                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Sensitive configuration}}
  res.writeHead(200, header); // Noncompliant {{Make sure that enabling CORS is safe here.}}
//^^^^^^^^^^^^^
  res.end('ok');
});

http.createServer((_, res) => {
  const access = '*';
  const header = { 'Access-Control-Allow-Origin': access };
  res.writeHead(200, header); // Noncompliant
  res.end('ok');
});

http.createServer();
http.createServer(undefined);
http.createServer('listener');
http.createServer(_ => {});
http.createServer((req, res) => {});
http.createServer((_, res) => {
  res.end('ok');
});
http.createServer((_, res) => {
  res.writeHead(200, 'header');
});
http.createServer((_, res) => {
  res.writeHead(200, {});
});
http.createServer((_, res) => {
  res.writeHead(200, { undefined });
});
http.createServer((_, res) => {
  res.writeHead(200, { header: 'value' });
});
http.createServer((_, res) => {
  res.writeHead(200, { 'Access-Control-Allow-Origin': 'value' });
});
