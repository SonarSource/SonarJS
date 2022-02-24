/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://jira.sonarsource.com/browse/RSPEC-1313

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isIP } from 'net';

const netMaskRegex = /(^[^\/]+)\/\d{1,3}$/;
const acceptedIpAddresses = ['255.255.255.255', '::1', '::', '0:0:0:0:0:0:0:1', '0:0:0:0:0:0:0:0'];

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      checkIP: 'Make sure using a hardcoded IP address {{ip}} is safe here.',
    },
  },
  create(context: Rule.RuleContext) {
    function isException(ip: string) {
      return (
        ip.startsWith('127.') ||
        ip.startsWith('0.') ||
        // avoid FP for OID http://www.oid-info.com/introduction.htm
        ip.startsWith('2.5') ||
        acceptedIpAddresses.includes(ip)
      );
    }
    function isIPV4OctalOrHex(ip: string) {
      const digits = ip.split('.');
      if (digits.length !== 4) {
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
