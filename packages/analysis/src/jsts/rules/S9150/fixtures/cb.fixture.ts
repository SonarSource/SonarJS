import { defineComponent } from 'vue';
import counterMixin from './mixins/counter';
//     ^^^^^^^^^^^^> {{Mixin imported from './mixins/counter'.}}

export default defineComponent({
  mixins: [counterMixin], // Noncompliant {{Replace this mixin with a Vue composable.}}
});

const localMixin = { data: () => ({ count: 0 }) };
//                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Mixin defined here. Extract it into a composable.}}

export const LocalMixinComponent = defineComponent({
  mixins: [localMixin], // Noncompliant {{Replace this mixin with a Vue composable.}}
});

function getMixin() {
  return { data: () => ({ count: 0 }) };
}

export const UnresolvableMixinComponent = defineComponent({
  mixins: [getMixin()], // Noncompliant {{Replace this mixin with a Vue composable.}}
});

const spreadMixins = [getMixin()];

export const SpreadComponent = defineComponent({
  ...{ mixins: spreadMixins }, // Noncompliant {{Replace this mixin with a Vue composable.}}
});

export const NoMixinsComponent = defineComponent({
  setup() {
    return {};
  },
});

function unrelatedFunction(options: { mixins?: unknown[] }) {
  return options.mixins; // compliant: not an object literal, just a member access
}

export const NotAnArrayValue = {
  mixins: 'hey', // compliant: Vue's `mixins` option is always an array, this isn't one
};
