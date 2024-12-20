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
  // Noncompliant@+1 [[qf1]] {{Remove this unused import of 'Comp'.}}
  import Comp from './some.vue';
  // fix@qf1 {{Remove this import statement}}
  // del@qf1
</script>
<script setup lang="ts">
  import Foo from './Foo.vue';
  // Noncompliant@+1 [[qf2]] {{Remove this unused import of 'Bar'.}}
  import Bar from './Bar.vue';
  // fix@qf2 {{Remove this import statement}}
  // del@qf2
  import OneTwoThree from './OneTwoThree.vue';
  import fourFiveSix from './OneTwoThree.vue';
  import something from './something';
  import AnotherTHING from './another';
  import * as Library from './library';
  import vFocus from './vfocus';
</script>
