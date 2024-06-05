const express = require('express');
const app = express();

app.all('*', (req, res) => {
  res.setHeader('access-control-allow-origin', req.headers.origin); // Noncompliant
});

app.all('*', (req, res) => {
  res.setHeader('access-control-allow-origin', req.header('origin')); // Noncompliant
});

app.all('*', (req, res) => {
  const origin = req.headers.origin;
//               ^^^^^^^^^^^^^^^^^^> {{Sensitive configuration}}
  res.setHeader('access-control-allow-origin', origin); // Noncompliant {{Make sure that enabling CORS is safe here.}}
//^^^^^^^^^^^^^
});

app.all('*', (req, res) => {
  const origin = req.header('origin');
  res.setHeader('access-control-allow-origin', origin); // Noncompliant
});

app.all('*', (req, res) => {
  res.setHeader('access-control-allow-origin', sanitize(req.headers.origin));
});

app.all('*', (req, res) => {
  res.setHeader('access-control-allow-origin', sanitize(req.header('origin')));
});

app.all('*', (req, res) => {
  const origin = req.headers.origin;
  const sanitized = sanitize(origin);
  res.setHeader('access-control-allow-origin', sanitized);
});

app.all('*', (req, res) => {
  const origin = req.header('Origin');
  const sanitized = sanitize(origin);
  res.setHeader('access-control-allow-origin', sanitized);
});

app.all('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin === 'https://www.trusted.com') {
    res.setHeader('access-control-allow-origin', origin);
  }
});

app.all('*', (req, res) => {
  const origin = req.header('origin');
  if (origin === 'https://www.trusted.com') {
    res.setHeader('access-control-allow-origin', origin);
  }
});

app.all('*');
app.all('*', 42);
app.all('*', undefined);
app.all('*', ({}));
app.all('*', () => {});
app.all('*', req => {});
app.all('*', ({}) => {});
app.all('*', (req, res) => {});
app.all('*', (req, {}) => {});
app.all('*', (req, res) => { res; });
app.all('*', (req, res) => { res.end('ok'); });
app.all('*', (req, res) => { res.setHeader(); });
app.all('*', (req, res) => { res.setHeader(42); });
app.all('*', (req, res) => { res.setHeader('foo'); });
app.all('*', (req, res) => { res.setHeader('access-control-allow-origin'); });
app.all('*', (req, res) => { res.setHeader('access-control-allow-origin', undefined); });
app.all('*', (req, res) => { res.setHeader('access-control-allow-origin', foo()); });
app.all('*', (req, res) => { res.setHeader('access-control-allow-origin', req.header()); });
app.all('*', (req, res) => { res.setHeader('access-control-allow-origin', req.header(42)); });
app.all('*', (req, res) => { res.setHeader('access-control-allow-origin', req.header('foo')); });
app.all('*', (req, res) => { res.setHeader('access-control-allow-origin', req.headers); });
app.all('*', (req, res) => { res.setHeader('access-control-allow-origin', req.headers.foo); });
