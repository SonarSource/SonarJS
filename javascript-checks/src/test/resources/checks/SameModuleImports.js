import * as foo from "a";
import {foo, bar} from "a";
import {foo1, bar1} from 'a'; // Noncompliant [[secondary=-1,-2]] {{Merge this import with another one from the same module on line 1.}}


// OK, one import is type import
import {foo} from "b";
import type {Bar} from "b";
import typeof {Bar} from "b";


import type {Foo} from "c";
import type {Bar} from "c"; // Noncompliant


import type   {Foo} from "d";
import typeof {Foo} from "d";
import typeof {Bar} from "d"; // Noncompliant [[secondary=-1]]

// even if one import is type, a new syntax is used which allows merging imports of type and not type
import { foo } from "e";
import { type Bar } from "e"; // Noncompliant

