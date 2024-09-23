<template>
  <Comp />
  <Foo />
  <Foo v-one-two-three />
  <Foo v-four-five-six />
  <something/>
  <another-THING/>
  <library.item/>
  <div v-focus />
</template>
<script lang="ts">
  import Comp from './some.vue'; // Noncompliant
</script>
<script setup lang="ts">
  import Foo from './Foo.vue';
  import Bar from './Bar.vue'; // Noncompliant
  import OneTwoThree from './OneTwoThree.vue';
  import fourFiveSix from './OneTwoThree.vue';
  import something from './something';
  import AnotherTHING from './another';
  import * as Library from './library';
  import vFocus from './vfocus';
</script>
