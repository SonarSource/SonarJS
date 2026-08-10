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
