import _ from 'lodash';
import * as lodashEs from 'lodash-es';
import underscore from 'underscore';

declare const values: string[];

values.every(async value => true); // Noncompliant {{Expected a non-Promise value to be returned.}}
values.filter(async value => true); // Noncompliant {{Expected a non-Promise value to be returned.}}
values.find(async value => true); // Noncompliant {{Expected a non-Promise value to be returned.}}
values.findIndex(async value => true); // Noncompliant {{Expected a non-Promise value to be returned.}}
values.findLast(async value => true); // Noncompliant {{Expected a non-Promise value to be returned.}}
values.findLastIndex(async value => true); // Noncompliant {{Expected a non-Promise value to be returned.}}
values.some(async value => true); // Noncompliant {{Expected a non-Promise value to be returned.}}

const active = _.filter(values, async value => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
const first = lodashEs.find(values, async value => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}
const any = underscore.some(values, async value => true); // Noncompliant {{Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.}}

const syncActive = _.filter(values, value => value.length > 0);
const mapped = _.map(values, async value => value.length);
const iterated = _.forEach(values, async value => console.log(value));
