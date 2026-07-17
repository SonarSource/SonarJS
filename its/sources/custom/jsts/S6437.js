import crypto from 'node:crypto';

const dh = crypto.createDiffieHellman(512);
dh.setPrivateKey('4f2c91a07db3e685f19b4c0da2e7b31c');

const ecdh = crypto.createECDH('secp256k1');
ecdh.setPrivateKey('9a41e6b3f085c72d4e19ab0f637dc258');

const sign = crypto.createSign('SHA256');
sign.write('some data to sign');
sign.end();
const signature = sign.sign('privateKeyPEM', 'hex');

const x509 = new crypto.X509Certificate('public-cert.pem (imagine its imported)');
const value = x509.checkPrivateKey('privateKeyRaw01');

crypto.createHmac('sha256', 'hardcodedHmacValue789');
crypto.createHmac('sha256', process.env.SECRET);

crypto.createSecretKey('myCryptoKey456');
crypto.createSecretKey(Buffer.from(process.env.KEY || '', 'hex'));

const dataBuffer = Buffer.from('data');
const signatureBuffer = Buffer.from('signature');
crypto.sign('sha256', dataBuffer, 'privateKeyPEM');
const privateKeyVar = 'privateKeyRaw02';
crypto.sign('sha256', dataBuffer, privateKeyVar);

crypto.privateEncrypt('privateKeyPEM', Buffer.from('data'));
crypto.privateEncrypt({ key: 'privateKeyPEM', padding: 1 }, Buffer.from('data'));
const privKey = 'privateKeyRaw03';
crypto.privateEncrypt(privKey, Buffer.from('data'));

const encData = Buffer.from('encrypted');
crypto.privateDecrypt('privateKeyPEM', encData);
crypto.privateDecrypt(privKey, encData);

import superagent from 'superagent';
superagent.auth('myuser:cred0Xy789');
const creds = 'user:cred09';
superagent.auth(creds);

import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';

const app = express();
app.disable('x-powered-by');
app.use(cookieParser('myCryptoKey456'));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(session({
  secret: 'sample secret',
  name: 'sample.cookie',
  cookie: { path: '/' }
}))

cookieParser.JSONCookie('{"data":"value"}', 'cryptoKey987');
const jsonSecret = 'secret';
cookieParser.JSONCookie('{"data":"value"}', jsonSecret);

cookieParser.signedCookie('cookieValue', 'cryptoValue321');
cookieParser.signedCookie('cookieValue', process.env.SECRET);

const cookiesObj = {};
cookieParser.signedCookies(cookiesObj, 'cryptoValue321');
const cookieSecret = 'secret';
cookieParser.signedCookies(cookiesObj, cookieSecret);

import jwt from 'jsonwebtoken';
jwt.sign({ userId: 123 }, 'myCryptoKey456');
jwt.sign({ userId: 123 }, process.env.JWT_SECRET);
const jwtSecret = 'secret';
jwt.sign({ userId: 123 }, jwtSecret);

const tokenStr = 'token';
jwt.verify(tokenStr, 'myCryptoKey456');
jwt.verify(tokenStr, process.env.JWT_SECRET);
jwt.verify(tokenStr, jwtSecret);

import ldap from 'ldapjs';
const client = ldap.createClient({ url: 'ldap://localhost:389' });
client.bind('cn=admin,dc=example,dc=org', 'hardcodedCred0Ab789');
client.bind('cn=admin,dc=example,dc=org', process.env.LDAP_PASSWORD);
const ldapPassword = 'secret';
client.bind('cn=admin,dc=example,dc=org', ldapPassword);
