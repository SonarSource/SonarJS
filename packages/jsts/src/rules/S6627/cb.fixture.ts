
import foo from 'bar';

  import foo from '../node_modules/bar'; // Noncompliant {{Do not use internal APIs of your dependencies}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
import { foo } from '../node_modules/bar'; // Noncompliant

  require('../node_modules/bar'); // Noncompliant
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
