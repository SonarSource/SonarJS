// Copyright 2006 The Closure Library Authors. All Rights Reserved.

import httpProxy from 'http-proxy';
httpProxy.createProxyServer({target: 'http://localhost:9000', xfwd: true});
