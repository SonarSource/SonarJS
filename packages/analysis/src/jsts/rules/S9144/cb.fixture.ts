import $ from 'jquery';
import * as jQuery from 'jquery';
import jq from 'jquery';
import jquerySlim from 'jquery/slim';
import jquerySlimDeep from 'jquery/dist/jquery.slim';
import jquerySlimDeepJs from 'jquery/dist/jquery.slim.js';
import { $ as jqueryNamedDollar, jQuery as jqueryNamedJQuery } from 'jquery';
import { slim as jqueryNamedSlim } from 'jquery';
import type typeOnlyJq from 'jquery';
import { type default as typeOnlySpecifier } from 'jquery';

const source = '{"name":"Sonar"}';
const input = '  Sonar  ';
const values = ['Sonar'];

$.isArray(values); // Noncompliant {{Use Array.isArray() instead of deprecated jQuery.isArray().}}
//^^^^^^^

$.parseJSON(source); // Noncompliant {{Use JSON.parse() instead of deprecated jQuery.parseJSON().}}
//^^^^^^^^^

jQuery.now(); // Noncompliant {{Use Date.now() instead of deprecated jQuery.now().}}
//     ^^^

jQuery.trim(input); // Noncompliant {{Use String.prototype.trim() instead of deprecated jQuery.trim().}}
//     ^^^^

jQuery.inArray('Sonar', values, 0); // Noncompliant {{Use Array.prototype.indexOf() instead of jQuery.inArray() to reduce dependence on jQuery.}}
//     ^^^^^^^

jq.trim(input); // Noncompliant {{Use String.prototype.trim() instead of deprecated jQuery.trim().}}
// ^^^^

jquerySlim.trim(input); // Noncompliant {{Use String.prototype.trim() instead of deprecated jQuery.trim().}}
//         ^^^^

jquerySlimDeep.trim(input); // Noncompliant {{Use String.prototype.trim() instead of deprecated jQuery.trim().}}
//             ^^^^

jquerySlimDeepJs.trim(input); // Noncompliant {{Use String.prototype.trim() instead of deprecated jQuery.trim().}}
//               ^^^^

jqueryNamedDollar.trim(input); // Noncompliant {{Use String.prototype.trim() instead of deprecated jQuery.trim().}}
//                ^^^^

jqueryNamedJQuery.trim(input); // Noncompliant {{Use String.prototype.trim() instead of deprecated jQuery.trim().}}
//                ^^^^

jqueryNamedSlim.trim(input);

Array.isArray(values);
JSON.parse(source);
Date.now();
input.trim();
values.indexOf('Sonar', 0);

const jQueryFromAnotherModule = { trim: (value: string): string => value };
jQueryFromAnotherModule.trim(input);

typeOnlyJq.trim(input);
const typeOnlyAlias = typeOnlyJq;
typeOnlyAlias.trim(input);
typeOnlySpecifier.trim(input);

function shadowedRequire(): void {
  function require(_module: string): { trim: (value: string) => string } {
    return { trim: value => value };
  }
  const $ = require('jquery');
  $.trim(input);
}

function reassignedAlias(): void {
  let $ = require('jquery');
  $ = { trim: value => value };
  $.trim(input);
}

function shadowedNames(jQuery: { trim: (value: string) => string }): void {
  jQuery.trim(input);
}

function shadowedDollar($: { trim: (value: string) => string }): void {
  $.trim(input);
}

jQuery['trim'](input);
jQuery?.trim(input);
jQuery.trim.call(null, input);
require('jquery').trim(input);
