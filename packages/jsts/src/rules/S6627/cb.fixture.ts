
import foo from 'bar';

import foo from '../node_modules/bar'; // Noncompliant
import { foo } from '../node_modules/bar'; // Noncompliant

require('../node_modules/bar'); // Noncompliant
