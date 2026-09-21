export default {
  mixins: [counterMixin], // Noncompliant {{Replace this mixin with a Vue composable.}}
  data() {
    return { label: 'Count' };
  },
};

import { useCounter } from './composables/counter';

export const CompliantComponent = {
  setup() {
    const { count, increment } = useCounter();
    return { count, increment };
  },
};

const mixins = ['not', 'a', 'real', 'mixins', 'array'];

export const ComputedIdentifierKey = {
  [mixins]: [counterMixin], // compliant: computed key reads the "mixins" variable, does not declare a "mixins" property
};

export const ComputedStringLiteralKey = {
  ['mixins']: [counterMixin], // Noncompliant {{Replace this mixin with a Vue composable.}}
};
