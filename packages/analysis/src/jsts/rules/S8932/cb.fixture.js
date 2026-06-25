import _ from 'lodash';
import lodash from 'lodash';
import lodashEs from 'lodash-es';
import { memoize as memoizeFromLodash } from 'lodash';
import memoize from 'lodash/memoize';
import underscore from 'underscore';

const memoizeFromRequire = require('lodash/memoize');
const lodashModule = require('lodash');
const { memoize: memoizeFromUnderscore } = require('underscore');

const resolver = (amount, locale) => `${amount}:${locale}`;
const formatAmount = (amount, locale) => amount.toLocaleString(locale);

_.memoize(amount => amount.toLocaleString()); // Compliant
_.memoize(({ amount, locale }) => amount.toLocaleString(locale)); // Compliant
_.memoize((amount, locale) => amount.toLocaleString(locale), resolver); // Compliant
_.memoize((amount, locale) => amount.toLocaleString(locale), (amount, locale) => resolver(amount, locale)); // Compliant
_.memoize(unresolvedFormatter); // Compliant

_.memoize((amount, locale) => amount.toLocaleString(locale)); // Noncompliant {{Provide an explicit resolver argument for this memoized function.}}
//^^^^^^^

lodash.memoize(function (amount, locale) { return amount.toLocaleString(locale); }); // Noncompliant {{Provide an explicit resolver argument for this memoized function.}}
//     ^^^^^^^

lodashEs.memoize((amount, locale) => amount.toLocaleString(locale)); // Noncompliant {{Provide an explicit resolver argument for this memoized function.}}
//       ^^^^^^^

  memoizeFromLodash((amount, locale) => amount.toLocaleString(locale)); // Noncompliant {{Provide an explicit resolver argument for this memoized function.}}
//^^^^^^^^^^^^^^^^^

  memoize((amount, locale) => amount.toLocaleString(locale)); // Noncompliant {{Provide an explicit resolver argument for this memoized function.}}
//^^^^^^^

  memoizeFromRequire((amount, locale) => amount.toLocaleString(locale)); // Noncompliant {{Provide an explicit resolver argument for this memoized function.}}
//^^^^^^^^^^^^^^^^^^

underscore.memoize((amount, locale) => amount.toLocaleString(locale)); // Noncompliant {{Provide an explicit resolver argument for this memoized function.}}
//         ^^^^^^^

  memoizeFromUnderscore((amount, locale) => amount.toLocaleString(locale)); // Noncompliant {{Provide an explicit resolver argument for this memoized function.}}
//^^^^^^^^^^^^^^^^^^^^^

lodashModule.memoize((amount, locale) => amount.toLocaleString(locale), undefined); // Noncompliant {{Provide an explicit resolver argument for this memoized function.}}
//           ^^^^^^^

lodashModule.memoize((amount, locale) => amount.toLocaleString(locale), null); // Noncompliant {{Provide an explicit resolver argument for this memoized function.}}
//           ^^^^^^^

_.memoize(formatAmount); // Noncompliant {{Provide an explicit resolver argument for this memoized function.}}
//^^^^^^^

function formatDate(date, locale) {
  return date.toLocaleDateString(locale);
}

_.memoize(formatDate); // Noncompliant {{Provide an explicit resolver argument for this memoized function.}}
//^^^^^^^

_.memoize((...parts) => parts.join(':')); // Noncompliant {{Provide an explicit resolver argument for this memoized function.}}
//^^^^^^^
