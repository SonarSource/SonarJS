import crypto from 'node:crypto';

const dh = crypto.createDiffieHellman(512);
dh.setPrivateKey('0123456789abcdef0123456789abcdef');
dh.setPrivateKey('4f2c91a07db3e685f19b4c0da2e7b31c');

const ecdh = crypto.createECDH('secp256k1');
ecdh.setPrivateKey('abcdef0123456789abcdef0123456789');
ecdh.setPrivateKey('4f2c91a07db3e685f19b4c0da2e7b31c');

const sign = crypto.createSign('SHA256');
sign.write('some data to sign');
sign.end();
const signature = sign.sign('privateKeyPEM', 'hex');

const x509 = new crypto.X509Certificate('public-cert.pem (imagine its imported)');
const value = x509.checkPrivateKey('key');
x509.checkPrivateKey('4f2c91a07db3e685f19b4c0da2e7b31c');

crypto.createHmac('sha256', 'hardcodedSecret123');
crypto.createHmac('sha256', '4f2c91a07db3e685f19b4c0da2e7b31c');
crypto.createHmac('sha256', process.env.SECRET);

crypto.createSecretKey('mySecretKey123');
crypto.createSecretKey('4f2c91a07db3e685f19b4c0da2e7b31c');
crypto.createSecretKey(Buffer.from(process.env.KEY || '', 'hex'));

const dataBuffer = Buffer.from('data');
const signatureBuffer = Buffer.from('signature');
crypto.sign('sha256', dataBuffer, 'privateKeyPEM');
const privateKeyVar = 'key';
crypto.sign('sha256', dataBuffer, privateKeyVar);
const privateKeySecret = '4f2c91a07db3e685f19b4c0da2e7b31c';
crypto.sign('sha256', dataBuffer, privateKeySecret);

crypto.privateEncrypt('privateKeyPEM', Buffer.from('data'));
crypto.privateEncrypt({ key: 'privateKeyPEM', padding: 1 }, Buffer.from('data'));
const privKey = 'key';
crypto.privateEncrypt(privKey, Buffer.from('data'));
const privateEncryptionKey = '4f2c91a07db3e685f19b4c0da2e7b31c';
crypto.privateEncrypt(privateEncryptionKey, Buffer.from('data'));

const encData = Buffer.from('encrypted');
crypto.privateDecrypt('privateKeyPEM', encData);
crypto.privateDecrypt(privKey, encData);
crypto.privateDecrypt(privateEncryptionKey, encData);

import superagent from 'superagent';
superagent.auth('username:password123');
superagent.auth('myuser:4f2c91a07db3e685f19b4c0da2e7b31c');
const creds = 'user:pass';
superagent.auth(creds);
const actualCreds = 'user:4f2c91a07db3e685f19b4c0da2e7b31c';
superagent.auth(actualCreds);

import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';

const app = express();
app.disable('x-powered-by');
app.use(cookieParser('mySecretKey123'));
app.use(cookieParser('4f2c91a07db3e685f19b4c0da2e7b31c'));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(session({
  secret: 'sample secret',
  name: 'sample.cookie',
  cookie: { path: '/' }
}))
app.use(session({ secret: '4f2c91a07db3e685f19b4c0da2e7b31c' }));

cookieParser.JSONCookie('{"data":"value"}', 'secret123');
cookieParser.JSONCookie('{"data":"value"}', '4f2c91a07db3e685f19b4c0da2e7b31c');
const jsonSecret = 'secret';
cookieParser.JSONCookie('{"data":"value"}', jsonSecret);
const actualJsonSecret = '4f2c91a07db3e685f19b4c0da2e7b31c';
cookieParser.JSONCookie('{"data":"value"}', actualJsonSecret);

cookieParser.signedCookie('cookieValue', 'secretKey123');
cookieParser.signedCookie('cookieValue', '4f2c91a07db3e685f19b4c0da2e7b31c');
cookieParser.signedCookie('cookieValue', process.env.SECRET);

const cookiesObj = {};
cookieParser.signedCookies(cookiesObj, 'secretKey123');
cookieParser.signedCookies(cookiesObj, '4f2c91a07db3e685f19b4c0da2e7b31c');
const cookieSecret = 'secret';
cookieParser.signedCookies(cookiesObj, cookieSecret);
const actualCookieSecret = '4f2c91a07db3e685f19b4c0da2e7b31c';
cookieParser.signedCookies(cookiesObj, actualCookieSecret);

import jwt from 'jsonwebtoken';
jwt.sign({ userId: 123 }, 'mySecretKey123');
jwt.sign({ userId: 123 }, '4f2c91a07db3e685f19b4c0da2e7b31c');
jwt.sign({ userId: 123 }, process.env.JWT_SECRET);
const jwtSecret = 'secret';
jwt.sign({ userId: 123 }, jwtSecret);
const actualJwtSecret = '4f2c91a07db3e685f19b4c0da2e7b31c';
jwt.sign({ userId: 123 }, actualJwtSecret);

const tokenStr = 'token';
jwt.verify(tokenStr, 'mySecretKey123');
jwt.verify(tokenStr, '4f2c91a07db3e685f19b4c0da2e7b31c');
jwt.verify(tokenStr, process.env.JWT_SECRET);
jwt.verify(tokenStr, jwtSecret);
jwt.verify(tokenStr, actualJwtSecret);

import ldap from 'ldapjs';
const client = ldap.createClient({ url: 'ldap://localhost:389' });
client.bind('cn=admin,dc=example,dc=org', 'hardcodedPassword123');
client.bind('cn=admin,dc=example,dc=org', '4f2c91a07db3e685f19b4c0da2e7b31c');
client.bind('cn=admin,dc=example,dc=org', process.env.LDAP_PASSWORD);
const ldapPassword = 'secret';
client.bind('cn=admin,dc=example,dc=org', ldapPassword);
const actualLdapPassword = '4f2c91a07db3e685f19b4c0da2e7b31c';
client.bind('cn=admin,dc=example,dc=org', actualLdapPassword);
