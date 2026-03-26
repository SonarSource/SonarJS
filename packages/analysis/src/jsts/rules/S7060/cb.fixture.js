
import f from './cb.fixture.js'; // Noncompliant [[qf1]] {{Module imports itself.}}
// fix@qf1 {{Remove this import}}
// edit@qf1 [[sc=0;ec=32]] {{}}

import f from './cb.fixture'; // Noncompliant [[qf3]] {{Module imports itself.}}
// fix@qf3 {{Remove this import}}
// edit@qf3 [[sc=0;ec=29]] {{}}

const f = require('./cb.fixture.js'); // Noncompliant [[qf2]] {{Module imports itself.}}
// fix@qf2 {{Remove this require}}
// edit@qf2 [[sc=0;ec=37]] {{}}


