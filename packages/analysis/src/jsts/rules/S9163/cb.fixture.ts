import { defineComponent, ref, reactive } from 'vue';

const count = ref<number>(0);

export default defineComponent({
  updated() {
    count.value++; // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
  },
});

const state = reactive<{ total: number }>({ total: 0 });

const guardedComponent = defineComponent({
  updated() {
    if (state.total < 10) {
      state.total++; // compliant: guarded by an if
    }
  },
});

const retryDelay = ref(1000);
const maxRetryDelay = 30000;

const convergingComponent = defineComponent({
  updated() {
    if (retryDelay.value < maxRetryDelay) {
      retryDelay.value *= 2; // compliant: converges once retryDelay reaches maxRetryDelay
    }
  },
});

const unguardedRetryDelay = ref(1000);

const nonConvergingComponent = defineComponent({
  updated() {
    unguardedRetryDelay.value *= 2; // Noncompliant {{Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.}}
  },
});
