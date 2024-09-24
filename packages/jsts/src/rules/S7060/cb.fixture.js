
import f from './cb.fixture.ts' // Noncompliant [[qf1]]
// fix@qf1 {{Remove this import}}
// edit@qf1 [[sc=0;ec=32]] {{}}

import f from './cb.fixture'; // Noncompliant

const f = require('./cb.fixture.js'); // Noncompliant [[qf2]]
// fix@qf2 {{Remove this require}}
// edit@qf2 [[sc=0;ec=37]] {{}}


