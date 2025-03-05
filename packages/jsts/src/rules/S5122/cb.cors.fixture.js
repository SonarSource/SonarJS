const express = require('express');
const cors = require('cors');

const app1 = express();
app1.use(cors()); // Noncompliant {{Make sure that enabling CORS is safe here.}}

const app2 = express();
app2.use(cors({})); // Noncompliant {{Make sure that enabling CORS is safe here.}}
//            ^^< {{Sensitive configuration}}

const app3 = express();
app3.use(cors({ origin: '*' })); // Noncompliant {{Make sure that enabling CORS is safe here.}}
//              ^^^^^^^^^^^< {{Sensitive configuration}}

const app4 = express();
const corsOptions = { origin: '*' };
//                    ^^^^^^^^^^^> {{Sensitive configuration}}
  app4.use(cors(corsOptions)); // Noncompliant {{Make sure that enabling CORS is safe here.}}
//^^^^^^^^

const app5 = express();
const corsOpts = { origin: '*' };
//                 ^^^^^^^^^^^> {{Sensitive configuration}}
const corsHandler = cors(corsOpts);
app5.use(corsHandler); // Noncompliant {{Make sure that enabling CORS is safe here.}}

const app42 = express();
app42.use();
app42.use(undefined);
app42.use('cors');
app42.use(foo());
app42.use(cors(42));
app42.use(cors({ origin: 'value' }));
