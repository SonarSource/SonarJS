import path from './custom2';
import * as path2 from './custom2';
import {bar, foo} from './custom2';

const a = {
  b: () => {}
}

function loadAll(pluginNames) {
  pluginNames(); // Noncompliant: pluginNames might be undefined
}

foo.bar =1;

a.b();
loadAll(null);
loadAll('foo');
loadAll(() => {});
console.log(path.dirname(__dirname));
bar();