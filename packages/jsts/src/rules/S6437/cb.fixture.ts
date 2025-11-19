import crypto from 'node:crypto';

const dh = crypto.createDiffieHellman(512);
dh.setPrivateKey('0123456789abcdef0123456789abcdef'); // Noncompliant

const ecdh = crypto.createECDH('secp256k1');
ecdh.setPrivateKey('abcdef0123456789abcdef0123456789'); // Noncompliant

const sign = crypto.createSign('SHA256');
sign.write('some data to sign');
sign.end();
const signature = sign.sign('privateKeyPEM', 'hex'); // Noncompliant

const x509 = new crypto.X509Certificate('public-cert.pem (imagine its imported)');
const value = x509.checkPrivateKey('key'); // Noncompliant

crypto.createHmac('sha256', 'hardcodedSecret123'); // Noncompliant
crypto.createHmac('sha256', process.env.SECRET);

crypto.createSecretKey('mySecretKey123'); // Noncompliant
crypto.createSecretKey(Buffer.from(process.env.KEY || '', 'hex'));

const dataBuffer = Buffer.from('data');
const signatureBuffer = Buffer.from('signature');
crypto.sign('sha256', dataBuffer, 'privateKeyPEM'); // Noncompliant
const privateKeyVar = 'key';
crypto.sign('sha256', dataBuffer, privateKeyVar); // Noncompliant

crypto.privateEncrypt('privateKeyPEM', Buffer.from('data')); // Noncompliant
const privKey = 'key';
crypto.privateEncrypt(privKey, Buffer.from('data')); // Noncompliant

const encData = Buffer.from('encrypted');
crypto.privateDecrypt('privateKeyPEM', encData); // Noncompliant
crypto.privateDecrypt(privKey, encData); // Noncompliant

import superagent from 'superagent';
superagent.auth('username:password123'); // Noncompliant
const creds = 'user:pass';
superagent.auth(creds);

import express from 'express';
import cookieParser from 'cookie-parser';

const app = express();
app.disable('x-powered-by');
app.use(cookieParser('mySecretKey123')); // Noncompliant
app.use(cookieParser(process.env.COOKIE_SECRET));

cookieParser.JSONCookie('{"data":"value"}', 'secret123'); // Noncompliant
const jsonSecret = 'secret';
cookieParser.JSONCookie('{"data":"value"}', jsonSecret);

cookieParser.signedCookie('cookieValue', 'secretKey123'); // Noncompliant
cookieParser.signedCookie('cookieValue', process.env.SECRET);

const cookiesObj = {};
cookieParser.signedCookies(cookiesObj, 'secretKey123'); // Noncompliant
const cookieSecret = 'secret';
cookieParser.signedCookies(cookiesObj, cookieSecret);

import jwt from 'jsonwebtoken';
jwt.sign({ userId: 123 }, 'mySecretKey123'); // Noncompliant
jwt.sign({ userId: 123 }, process.env.JWT_SECRET);
const jwtSecret = 'secret';
jwt.sign({ userId: 123 }, jwtSecret);

const tokenStr = 'token';
jwt.verify(tokenStr, 'mySecretKey123'); // Noncompliant
jwt.verify(tokenStr, process.env.JWT_SECRET);
jwt.verify(tokenStr, jwtSecret);
