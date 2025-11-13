import { Wallet } from 'ethers';
import { mnemonicToAccount } from 'viem/accounts';
import TronWeb from 'tronweb';

// Variable used instead of hardcoded string
const seedPhrase = process.env.SEED_PHRASE;
const wallet = Wallet.fromPhrase(seedPhrase);

// Function call result used
const wallet = Wallet.fromPhrase(getSeedPhrase());

// No arguments passed
const wallet = Wallet.fromPhrase();

// Template literal with expression
const account = mnemonicToAccount(`${getPhrase()}`);

// Ethers with hardcoded string literal
const wallet = Wallet.fromPhrase("Round Outgoing Yanni Gripped Buoyant Iodine Victoriously"); // Noncompliant {{Revoke and change this seed phrase, as it is compromised.}}

// Viem with hardcoded string
const account = mnemonicToAccount('test test test test test test test test test test test junk'); // Noncompliant {{Revoke and change this seed phrase, as it is compromised.}}

// TronWeb with hardcoded string
const wallet = TronWeb.fromMnemonic("candy sugar pudding cream honey rich smooth crumble sweet treat"); // Noncompliant {{Revoke and change this seed phrase, as it is compromised.}}

// Template literal without expressions
const wallet = Wallet.fromPhrase(`abandon abandon abandon abandon abandon abandon abandon abandon about`); // Noncompliant {{Revoke and change this seed phrase, as it is compromised.}}

// CommonJS require
const ethers = require('ethers');
const wallet = ethers.HDNodeWallet.fromPhrase("test test test test test test test test test test test junk"); // Noncompliant {{Revoke and change this seed phrase, as it is compromised.}}

// HDNodeWallet with named import and variable assignment
const mnemonic = 'Pigeons Petted Bushes Effectively Once Krusty Defeated Grapes'; // Noncompliant {{Revoke and change this seed phrase, as it is compromised.}}
const mnemonicWallet = HDNodeWallet.fromPhrase(mnemonic);
