import { HDNodeWallet } from 'ethers';

const mnemonic = 'Powerful Burning Muppets Betrayed Clerks Meanwhile Superb Spies Denounced Silly Leeks Cautiously'; // Noncompliant
const mnemonicWallet = HDNodeWallet.fromPhrase(mnemonic);
