// Code reproducer from R&D
var express = require('express');
var app = express();

function cgiHandler(req, res) {
  if (UP_PATH_REGEXP.test(req.path)) {
    return res.status(403).end('Forbidden');
  }
  if (req.headers.origin) {
    res.setHeader('access-control-allow-origin', req.headers.origin); // Noncompliant
    res.setHeader('access-control-allow-credentials', true);
  }
  // ...
}

app.all('/cgi-bin/sessions/*', cgiHandler);

app.all('/cgi-bin/*', function(req, res, next) {
  req.isUploadReq = UPLOAD_URLS.indexOf(req.path) !== -1;
  return req.isUploadReq ? uploadUrlencodedParser(req, res, next) : urlencodedParser(req, res, next);
}, function(req, res, next) {
  return req.isUploadReq ? uploadJsonParser(req, res, next) : jsonParser(req, res, next);
}, cgiHandler);
