import { defineComponent, ref, reactive } from 'vue';

const count = ref(0);

export default {
  updated() {
    count.value++; // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
  },
};

const guardedCount = ref(0);

const guardedComponent = defineComponent({
  updated: function () {
    if (guardedCount.value < 10) {
      guardedCount.value++; // compliant: guarded by an if
    }
  },
});

const namedCount = ref(0);
function handleUpdate() {
  namedCount.value++; // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
}
const namedComponent = defineComponent({
  updated: handleUpdate,
});

const state = reactive({ total: 0 });
const reactiveComponent = defineComponent({
  updated() {
    state.total += 1; // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
  },
});

const unrelatedObject = defineComponent({
  updated: false, // compliant: "updated" here is not a lifecycle hook function at all
});

let plainCounter = 0;
const unrelatedComponent = defineComponent({
  updated() {
    plainCounter++; // compliant: not a tracked ref/reactive binding
  },
});

// Regression for a real false positive: a plain object literal with an "updated" method is not a
// Vue component just because it sits in a file that also uses ref()/reactive() elsewhere. Neither
// defineComponent(...)-wrapped nor a module's default export, "cache" is not a Vue component
// options object at all, so this "updated" is never registered as a lifecycle hook.
const cacheCount = ref(0);
const cache = {
  updated() {
    cacheCount.value++; // compliant: "cache" is not a Vue component
  },
};
