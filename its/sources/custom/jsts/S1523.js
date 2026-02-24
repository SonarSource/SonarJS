import vm from 'node:vm';

const sandbox = { data: 'data' };
vm.createContext(sandbox);
vm.runInContext('code', sandbox, { timeout: 2000 });
