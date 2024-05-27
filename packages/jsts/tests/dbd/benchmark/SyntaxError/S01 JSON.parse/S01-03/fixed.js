const { EventEmitter } = require('events');

function request(opts, cb) {
  const r = new EventEmitter();
  r.setEncoding = () => {};
  r.headers = {
    'content-type': 'application/json',
  };
  r.statusCode = 200;
  return cb(r);
}
const opts = {};
let out = '{';

//// fixtures above

let req = request(opts, r => {
  r.setEncoding('utf8');
  r.on('data', d => {
    out += d;
  });
  r.on('end', () => {
    let type = r.headers['content-type'];
    if (type && out && type.includes('application/json')) {
      try {
        out = JSON.parse(out, opts.reviver);
      } catch (err) {
        //return rej(err);
        return err;
      }
    }
    r.data = out;
    if (r.statusCode >= 400) {
      let err = new Error(r.statusMessage);
      err.statusMessage = r.statusMessage;
      err.statusCode = r.statusCode;
      err.headers = r.headers;
      err.data = r.data;
    } else if (r.statusCode > 300 && redirect && r.headers.location) {
      opts.path = resolve(opts.path, r.headers.location);
      return send(method, opts.path.startsWith('/') ? opts : opts.path, opts).then(res, rej);
    } else {
      res(r);
    }
  });
  return r;
});

req.emit('end');
