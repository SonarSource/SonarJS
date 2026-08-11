<script setup>
import { ref, reactive, onUpdated } from 'vue';

const basicCount = ref(0);
onUpdated(() => {
  basicCount.value++; // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
});

const guardedCount = ref(0);
onUpdated(() => {
  if (guardedCount.value < 10) {
    guardedCount.value++; // compliant: guarded by an if
  }
});

const earlyReturnCount = ref(0);
onUpdated(() => {
  if (earlyReturnCount.value >= 10) {
    return;
  }
  earlyReturnCount.value++; // compliant: reachable only after an early-return guard clause
});

const retryDelay = ref(1000);
onUpdated(() => {
  retryDelay.value *= 2; // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
});

const guardedRetryDelay = ref(1000);
const maxRetryDelay = 30000;
onUpdated(() => {
  if (guardedRetryDelay.value < maxRetryDelay) {
    guardedRetryDelay.value *= 2; // compliant: converges once guardedRetryDelay reaches maxRetryDelay
  }
});

const selfRefCount = ref(0);
onUpdated(() => {
  selfRefCount.value = selfRefCount.value + 1; // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
});

const stableCount = ref(0);
onUpdated(() => {
  stableCount.value = 3; // compliant: converges after a single call, ref's setter bails out via Object.is
});

const timestamp = ref(0);
onUpdated(() => {
  timestamp.value = Date.now(); // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
});

const randomValue = ref(0);
onUpdated(() => {
  randomValue.value = Math.random(); // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
});

const perfValue = ref(0);
onUpdated(() => {
  perfValue.value = performance.now(); // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
});

const state = reactive({ total: 0 });
onUpdated(() => {
  state.total++; // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
});

const guardedState = reactive({ total: 0 });
onUpdated(() => {
  if (guardedState.total < 10) {
    guardedState.total++; // compliant: guarded by an if
  }
});

// Known limitation: reactive() mutation detection is single-level only (state.prop), so a nested
// property path is never flagged even though it loops forever exactly like the top-level case above.
const nestedState = reactive({ nested: { count: 0 } });
onUpdated(() => {
  nestedState.nested.count++; // compliant: FN, nested reactive property mutation is not detected
});

const namedHandlerCount = ref(0);
function handleUpdate() {
  namedHandlerCount.value++; // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
}
onUpdated(handleUpdate);

const indirectCount = ref(0);
function performIncrement() {
  indirectCount.value++;
}
onUpdated(() => {
  performIncrement(); // compliant: FN, mutation happens inside a function called from the hook, not written directly in its body
});

let plainVariable = 0;
onUpdated(() => {
  plainVariable++; // compliant: not a tracked ref/reactive binding
});

const ternaryCount = ref(0);
onUpdated(() => {
  ternaryCount.value < 10 ? ternaryCount.value++ : null; // compliant: guarded by a ternary
});

const logicalCount = ref(0);
onUpdated(() => {
  logicalCount.value < 10 && logicalCount.value++; // compliant: guarded by a logical "&&"
});

// Unlike the three compliant examples above, a mutation in the *test* of an if/ternary, or the
// *left* operand of a logical expression, always executes regardless of the guard's outcome - it
// isn't actually guarded, so it must still be flagged.
const ifTestCount = ref(0);
onUpdated(() => {
  if (ifTestCount.value++ > 100) { // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
    console.log('checked');
  }
});

const ternaryTestCount = ref(0);
onUpdated(() => {
  ternaryTestCount.value++ ? console.log('a') : console.log('b'); // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
});

const logicalLeftCount = ref(0);
onUpdated(() => {
  logicalLeftCount.value++ && console.log('checked'); // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
});
</script>
