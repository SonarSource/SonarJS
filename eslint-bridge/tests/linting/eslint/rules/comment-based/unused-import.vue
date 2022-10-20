<template>
  <Foo />
</template>
<script setup lang="ts">
  import Foo from './Foo.vue';
  import Bar from './Bar.vue'; // Noncompliant
</script>
