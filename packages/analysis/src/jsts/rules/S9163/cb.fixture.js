import { ref, reactive } from 'vue';

const count = ref(0);

export default {
  updated() {
    count.value++; // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
  },
};

const guardedCount = ref(0);

const guardedComponent = {
  updated: function () {
    if (guardedCount.value < 10) {
      guardedCount.value++; // compliant: guarded by an if
    }
  },
};

const namedCount = ref(0);
function handleUpdate() {
  namedCount.value++; // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
}
const namedComponent = {
  updated: handleUpdate,
};

const state = reactive({ total: 0 });
const reactiveComponent = {
  updated() {
    state.total += 1; // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
  },
};

const unrelatedObject = {
  updated: false, // compliant: "updated" here is not a lifecycle hook function at all
};

let plainCounter = 0;
const unrelatedComponent = {
  updated() {
    plainCounter++; // compliant: not a tracked ref/reactive binding
  },
};
