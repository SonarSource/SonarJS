import crypto from 'node:crypto';

const dh = crypto.createDiffieHellman(512);
dh.setPrivateKey('0123456789abcdef0123456789abcdef');

const ecdh = crypto.createECDH('secp256k1');
ecdh.setPrivateKey('abcdef0123456789abcdef0123456789');

const sign = crypto.createSign('SHA256');
sign.write('some data to sign');
sign.end();
const signature = sign.sign('privateKeyPEM', 'hex');

const x509 = new crypto.X509Certificate('public-cert.pem (imagine its imported)');
const value = x509.checkPrivateKey('key');

crypto.createHmac('sha256', 'hardcodedSecret123');
crypto.createHmac('sha256', process.env.SECRET);

crypto.createSecretKey('mySecretKey123');
crypto.createSecretKey(Buffer.from(process.env.KEY || '', 'hex'));

const dataBuffer = Buffer.from('data');
const signatureBuffer = Buffer.from('signature');
crypto.sign('sha256', dataBuffer, 'privateKeyPEM');
const privateKeyVar = 'key';
crypto.sign('sha256', dataBuffer, privateKeyVar);

crypto.privateEncrypt('privateKeyPEM', Buffer.from('data'));
crypto.privateEncrypt({ key: 'privateKeyPEM', padding: 1 }, Buffer.from('data'));
const privKey = 'key';
crypto.privateEncrypt(privKey, Buffer.from('data'));

const encData = Buffer.from('encrypted');
crypto.privateDecrypt('privateKeyPEM', encData);
crypto.privateDecrypt(privKey, encData);

import superagent from 'superagent';
superagent.auth('username:password123');
const creds = 'user:pass';
superagent.auth(creds);

import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';

const app = express();
app.disable('x-powered-by');
app.use(cookieParser('mySecretKey123'));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(session({
  secret: 'sample secret',
  name: 'sample.cookie',
  cookie: { path: '/' }
}))

cookieParser.JSONCookie('{"data":"value"}', 'secret123');
const jsonSecret = 'secret';
cookieParser.JSONCookie('{"data":"value"}', jsonSecret);

cookieParser.signedCookie('cookieValue', 'secretKey123');
cookieParser.signedCookie('cookieValue', process.env.SECRET);

const cookiesObj = {};
cookieParser.signedCookies(cookiesObj, 'secretKey123');
const cookieSecret = 'secret';
cookieParser.signedCookies(cookiesObj, cookieSecret);

import jwt from 'jsonwebtoken';
jwt.sign({ userId: 123 }, 'mySecretKey123');
jwt.sign({ userId: 123 }, process.env.JWT_SECRET);
const jwtSecret = 'secret';
jwt.sign({ userId: 123 }, jwtSecret);

const tokenStr = 'token';
jwt.verify(tokenStr, 'mySecretKey123');
jwt.verify(tokenStr, process.env.JWT_SECRET);
jwt.verify(tokenStr, jwtSecret);

import ldap from 'ldapjs';
const client = ldap.createClient({ url: 'ldap://localhost:389' });
client.bind('cn=admin,dc=example,dc=org', 'hardcodedPassword123');
client.bind('cn=admin,dc=example,dc=org', process.env.LDAP_PASSWORD);
const ldapPassword = 'secret';
client.bind('cn=admin,dc=example,dc=org', ldapPassword);
