import jQuery = require('jquery');
import type typeOnlyJq = require('jquery');

declare namespace SomeNamespace {
  const Member: { trim(value: string): string };
}

import namespaceMember = SomeNamespace.Member;

const input = '  Sonar  ';

jQuery.trim(input); // Noncompliant {{Use String.prototype.trim() instead of deprecated jQuery.trim().}}
//     ^^^^

typeOnlyJq.trim(input);
const typeOnlyAlias = typeOnlyJq;
typeOnlyAlias.trim(input);

namespaceMember.trim(input);
