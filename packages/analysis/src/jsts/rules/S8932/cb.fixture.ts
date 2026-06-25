import _ from 'lodash';

function formatWithThis(this: Intl.NumberFormat, amount: number) {
  return this.format(amount);
}

_.memoize(formatWithThis); // Compliant

function formatWithLocale(this: Intl.NumberFormat, amount: number, locale: string) {
  return `${this.format(amount)} ${locale}`;
}

_.memoize(formatWithLocale); // Noncompliant {{Provide an explicit function to compute the cache key.}}
//^^^^^^^

_.memoize((amount: number, locale: string) => amount.toLocaleString(locale)); // Noncompliant {{Provide an explicit function to compute the cache key.}}
//^^^^^^^
