import libxmljs from 'libxmljs';
import libxmljs2 from 'libxmljs2';
import fs from 'node:fs';

const xml = fs.readFileSync('xxe.xml', 'utf8');
const opts = { noblanks: true, noent: true, nocdata: true };

libxmljs.parseXmlString(xml, { noblanks: true, noent: true, nocdata: true }); // Detected
libxmljs2.parseXmlString(xml, opts); // Undetected
