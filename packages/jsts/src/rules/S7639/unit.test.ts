/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { rule } from './index.js';
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S7639', () => {
  it('S7639', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    
    ruleTester.run('Hardcoded seed phrases should not be used', rule, {
      valid: [
        // No blockchain module imported
        {
          code: `
            const wallet = Wallet.fromPhrase("test phrase");
          `,
        },
        // Variable used instead of hardcoded string
        {
          code: `
            import { Wallet } from 'ethers';
            const seedPhrase = process.env.SEED_PHRASE;
            const wallet = Wallet.fromPhrase(seedPhrase);
          `,
        },
        // Function call result used
        {
          code: `
            import { Wallet } from 'ethers';
            const wallet = Wallet.fromPhrase(getSeedPhrase());
          `,
        },
        // Different method name
        {
          code: `
            import { Wallet } from 'ethers';
            const wallet = Wallet.createRandom();
          `,
        },
        // No arguments passed
        {
          code: `
            import { Wallet } from 'ethers';
            const wallet = Wallet.fromPhrase();
          `,
        },
        // Template literal with expression
        {
          code: `
            import { mnemonicToAccount } from 'viem/accounts';
            const account = mnemonicToAccount(\`\${getPhrase()}\`);
          `,
        },
        // CommonJS require with variable
        {
          code: `
            const ethers = require('ethers');
            const phrase = readFromFile();
            const wallet = ethers.Wallet.fromPhrase(phrase);
          `,
        },
      ],
      invalid: [
        // Ethers with hardcoded string literal
        {
          code: `
            import { Wallet } from 'ethers';
            const wallet = Wallet.fromPhrase("Round Outgoing Yanni Gripped Buoyant Iodine Victoriously");
          `,
          errors: 1,
        },
        // Viem with hardcoded string
        {
          code: `
            import { mnemonicToAccount } from 'viem/accounts';
            const account = mnemonicToAccount('test test test test test test test test test test test junk');
          `,
          errors: 1,
        },
        // TronWeb with hardcoded string
        {
          code: `
            import TronWeb from 'tronweb';
            const wallet = TronWeb.fromMnemonic("candy maple cake sugar pudding cream honey rich smooth crumble sweet treat");
          `,
          errors: 1,
        },
        // Template literal without expressions
        {
          code: `
            import { Wallet } from 'ethers';
            const wallet = Wallet.fromPhrase(\`abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about\`);
          `,
          errors: 1,
        },
        // String concatenation
        {
          code: `
            import { HDNodeWallet } from 'ethers';
            const wallet = HDNodeWallet.fromPhrase("abandon abandon " + "abandon abandon " + "abandon abandon abandon abandon abandon abandon abandon about");
          `,
          errors: 1,
        },
        // CommonJS require
        {
          code: `
            const ethers = require('ethers');
            const wallet = ethers.HDNodeWallet.fromPhrase("test test test test test test test test test test test junk");
          `,
          errors: 1,
        },
        // Multiple violations in same file
        {
          code: `
            import { HDNodeWallet } from 'ethers';
            import { mnemonicToAccount } from 'viem/accounts';
            
            const wallet1 = HDNodeWallet.fromPhrase("seed phrase one");
            const account = mnemonicToAccount("seed phrase two");
          `,
          errors: 2,
        },
        // Nested function calls
        {
          code: `
            const TronWeb = require('tronweb');
            function createWallet() {
              return TronWeb.fromMnemonic("test mnemonic phrase here");
            }
          `,
          errors: 1,
        },
        // HDNodeWallet with named import and variable assignment
        {
          code: `
            import { HDNodeWallet } from 'ethers'
            const mnemonic = 'Pigeons Petted Bushes Effectively Once Krusty Defeated Grapes'
            const mnemonicWallet = HDNodeWallet.fromPhrase(mnemonic)
          `,
          errors: 1,
        },
      ],
    });
  });
});
