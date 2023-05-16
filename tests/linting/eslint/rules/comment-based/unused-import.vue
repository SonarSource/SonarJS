<template>
  <Foo />
  <Foo v-one-two-three />
  <Foo v-four-five-six />
</template>
<script setup lang="ts">
  import Foo from './Foo.vue';
  import Bar from './Bar.vue'; // Noncompliant
  import OneTwoThree from './OneTwoThree.vue';
  import fourFiveSix from './OneTwoThree.vue';
</script>
