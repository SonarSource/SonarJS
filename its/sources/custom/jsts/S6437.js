import crypto from 'node:crypto';

const dh = crypto.createDiffieHellman(512);
dh.setPrivateKey('4f2c91a07db3e685f19b4c0da2e7b31c');

const ecdh = crypto.createECDH('secp256k1');
ecdh.setPrivateKey('4f2c91a07db3e685f19b4c0da2e7b31c');

const sign = crypto.createSign('SHA256');
sign.write('some data to sign');
sign.end();
const signature = sign.sign('privateKeyPEM', 'hex');

const x509 = new crypto.X509Certificate('public-cert.pem (imagine its imported)');
const value = x509.checkPrivateKey('4f2c91a07db3e685f19b4c0da2e7b31c');

crypto.createHmac('sha256', '4f2c91a07db3e685f19b4c0da2e7b31c');
crypto.createHmac('sha256', process.env.SECRET);

crypto.createSecretKey('4f2c91a07db3e685f19b4c0da2e7b31c');
crypto.createSecretKey(Buffer.from(process.env.KEY || '', 'hex'));

const dataBuffer = Buffer.from('data');
const signatureBuffer = Buffer.from('signature');
crypto.sign('sha256', dataBuffer, 'privateKeyPEM');
const privateKeyVar = '4f2c91a07db3e685f19b4c0da2e7b31c';
crypto.sign('sha256', dataBuffer, privateKeyVar);

crypto.privateEncrypt('privateKeyPEM', Buffer.from('data'));
crypto.privateEncrypt({ key: 'privateKeyPEM', padding: 1 }, Buffer.from('data'));
const privKey = '4f2c91a07db3e685f19b4c0da2e7b31c';
crypto.privateEncrypt(privKey, Buffer.from('data'));

const encData = Buffer.from('encrypted');
crypto.privateDecrypt('privateKeyPEM', encData);
crypto.privateDecrypt(privKey, encData);

import superagent from 'superagent';
superagent.auth('myuser:4f2c91a07db3e685f19b4c0da2e7b31c');
const creds = 'user:4f2c91a07db3e685f19b4c0da2e7b31c';
superagent.auth(creds);

import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';

const app = express();
app.disable('x-powered-by');
app.use(cookieParser('4f2c91a07db3e685f19b4c0da2e7b31c'));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(session({
  secret: 'sample secret',
  name: 'sample.cookie',
  cookie: { path: '/' }
}))

cookieParser.JSONCookie('{"data":"value"}', '4f2c91a07db3e685f19b4c0da2e7b31c');
const jsonSecret = 'secret';
cookieParser.JSONCookie('{"data":"value"}', jsonSecret);

cookieParser.signedCookie('cookieValue', '4f2c91a07db3e685f19b4c0da2e7b31c');
cookieParser.signedCookie('cookieValue', process.env.SECRET);

const cookiesObj = {};
cookieParser.signedCookies(cookiesObj, '4f2c91a07db3e685f19b4c0da2e7b31c');
const cookieSecret = 'secret';
cookieParser.signedCookies(cookiesObj, cookieSecret);

import jwt from 'jsonwebtoken';
jwt.sign({ userId: 123 }, '4f2c91a07db3e685f19b4c0da2e7b31c');
jwt.sign({ userId: 123 }, process.env.JWT_SECRET);
const jwtSecret = 'secret';
jwt.sign({ userId: 123 }, jwtSecret);

const tokenStr = 'token';
jwt.verify(tokenStr, '4f2c91a07db3e685f19b4c0da2e7b31c');
jwt.verify(tokenStr, process.env.JWT_SECRET);
jwt.verify(tokenStr, jwtSecret);

import ldap from 'ldapjs';
const client = ldap.createClient({ url: 'ldap://localhost:389' });
client.bind('cn=admin,dc=example,dc=org', '4f2c91a07db3e685f19b4c0da2e7b31c');
client.bind('cn=admin,dc=example,dc=org', process.env.LDAP_PASSWORD);
const ldapPassword = 'secret';
client.bind('cn=admin,dc=example,dc=org', ldapPassword);
