// Two fist issues are due to S3533
import * as xpath from 'xpath';
import * as xmldom from 'xmldom';

const doc = new xmldom.DOMParser().parseFromString(xml);
const nodes = xpath.select(userinput, doc); // Noncompliant
const node = xpath.select1(userinput, doc); // Noncompliant
