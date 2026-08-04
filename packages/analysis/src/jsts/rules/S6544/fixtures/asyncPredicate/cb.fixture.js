import _ from 'lodash';
import * as lodashEs from 'lodash-es';
import underscore from 'underscore';
import { filter as namedFilter } from 'lodash';
import lodashFilter from 'lodash/filter';

_.every([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
_.filter([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
_.find([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
_.findIndex([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
_.some([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
_.reject([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}

lodashEs.every([], async function (item) { return true; }); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
lodashEs.filter([], async function (item) { return true; }); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
lodashEs.find([], async function (item) { return true; }); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
lodashEs.findIndex([], async function (item) { return true; }); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
lodashEs.some([], async function (item) { return true; }); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
lodashEs.reject([], async function (item) { return true; }); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}

underscore.every([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
underscore.filter([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
underscore.find([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
underscore.findIndex([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
underscore.some([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
underscore.reject([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}

namedFilter([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
lodashFilter([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}

const lodash = require('lodash');
lodash.filter([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
require('underscore').find([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
const find = require('lodash').find;
find([], async item => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}

async function isActive(item) {
  return true;
}

_.filter([], isActive); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}

const asyncPredicate = async item => true;
_.find([], asyncPredicate); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}

_.filter([], item => item.active);
_.map([], async item => true);
_.forEach([], async item => true);
_.select([], async item => true);
_.filter['call']([], async item => true);
const filterAlias = _.filter;
filterAlias([], async item => true);
_.chain([]).filter(async item => true).value();
_([]).filter(async item => true).value();

function checkShadowedRequire(require) {
  const shadowed = require('lodash');
  shadowed.filter([], async item => true);
}

import fpFilter from 'lodash/fp/filter';
fpFilter(async item => true, []);
