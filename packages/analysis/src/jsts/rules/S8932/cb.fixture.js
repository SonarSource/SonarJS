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

_.memoize((amount, locale) => amount.toLocaleString(locale)); // Noncompliant {{Provide an explicit function to compute the cache key.}}
//^^^^^^^

lodash.memoize(function (amount, locale) { return amount.toLocaleString(locale); }); // Noncompliant {{Provide an explicit function to compute the cache key.}}
//     ^^^^^^^

lodashEs.memoize((amount, locale) => amount.toLocaleString(locale)); // Noncompliant {{Provide an explicit function to compute the cache key.}}
//       ^^^^^^^

  memoizeFromLodash((amount, locale) => amount.toLocaleString(locale)); // Noncompliant {{Provide an explicit function to compute the cache key.}}
//^^^^^^^^^^^^^^^^^

  memoize((amount, locale) => amount.toLocaleString(locale)); // Noncompliant {{Provide an explicit function to compute the cache key.}}
//^^^^^^^

  memoizeFromRequire((amount, locale) => amount.toLocaleString(locale)); // Noncompliant {{Provide an explicit function to compute the cache key.}}
//^^^^^^^^^^^^^^^^^^

underscore.memoize((amount, locale) => amount.toLocaleString(locale)); // Noncompliant {{Provide an explicit function to compute the cache key.}}
//         ^^^^^^^

  memoizeFromUnderscore((amount, locale) => amount.toLocaleString(locale)); // Noncompliant {{Provide an explicit function to compute the cache key.}}
//^^^^^^^^^^^^^^^^^^^^^

lodashModule.memoize((amount, locale) => amount.toLocaleString(locale), undefined); // Noncompliant {{Provide an explicit function to compute the cache key.}}
//           ^^^^^^^

lodashModule.memoize((amount, locale) => amount.toLocaleString(locale), null); // Noncompliant {{Provide an explicit function to compute the cache key.}}
//           ^^^^^^^

_.memoize(formatAmount); // Noncompliant {{Provide an explicit function to compute the cache key.}}
//^^^^^^^

function formatDate(date, locale) {
  return date.toLocaleDateString(locale);
}

_.memoize(formatDate); // Noncompliant {{Provide an explicit function to compute the cache key.}}
//^^^^^^^

_.memoize((...parts) => parts.join(':')); // Noncompliant {{Provide an explicit function to compute the cache key.}}
//^^^^^^^
