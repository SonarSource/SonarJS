/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S1313/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { isIP } from 'net';
import { generateMeta } from '../helpers/index.js';
import * as meta from './meta.js';

const netMaskRegex = /(^[^/]+)\/\d{1,3}$/;
const acceptedIpAddresses = ['255.255.255.255', '::1', '::', '0:0:0:0:0:0:0:1', '0:0:0:0:0:0:0:0'];
const ipV4Octets = 4;
const ipV4MappedToV6Prefix = '::ffff:0:';
const acceptedIpV6Starts = [
  // https://datatracker.ietf.org/doc/html/rfc3849
  '2001:db8:',
];
const acceptedIpV4Starts = [
  '127.',
  '0.',
  // avoid FP for OID http://www.oid-info.com/introduction.htm
  '2.5',
  // https://datatracker.ietf.org/doc/html/rfc5737
  '192.0.2.',
  '198.51.100.',
  '203.0.113.',
];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      checkIP: 'Make sure using a hardcoded IP address {{ip}} is safe here.',
    },
  }),
  create(context: Rule.RuleContext) {
    function isException(ip: string) {
      return (
        acceptedIpV6Starts.some(prefix => ip.startsWith(prefix)) ||
        acceptedIpV4Starts.some(
          prefix => ip.startsWith(ipV4MappedToV6Prefix + prefix) || ip.startsWith(prefix),
        ) ||
        acceptedIpAddresses.includes(ip)
      );
    }
    function isIPV4OctalOrHex(ip: string) {
      const digits = ip.split('.');
      if (digits.length !== ipV4Octets) {
        return false;
      }
      const decimalDigits = [];
      for (const digit of digits) {
        if (digit.match(/^0[0-7]*$/)) {
          decimalDigits.push(parseInt(digit, 8));
        } else if (digit.match(/^0[xX][0-9a-fA-F]+$/)) {
          decimalDigits.push(parseInt(digit, 16));
        } else {
          return false;
        }
      }
      const convertedIp = `${decimalDigits[0]}.${decimalDigits[1]}.${decimalDigits[2]}.${decimalDigits[3]}`;
      return !isException(convertedIp) && isIP(convertedIp) !== 0;
    }
    return {
      Literal(node: estree.Node) {
        const { value } = node as estree.Literal;
        if (typeof value !== 'string') {
          return;
        }
        let ip = value;
        const result = value.match(netMaskRegex);
        if (result) {
          ip = result[1];
        }
        if ((!isException(ip) && isIP(ip) !== 0) || isIPV4OctalOrHex(ip)) {
          context.report({
            node,
            messageId: 'checkIP',
            data: {
              ip: value,
            },
          });
        }
      },
    };
  },
};
