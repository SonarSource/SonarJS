<template>
  <p>{{background}}</p>
</template>

<script lang="ts">
import Vue from 'vue';

function hello(name: string): any {
  return `Hello, ${name}`;
}

export default Vue.extend({
  greet: hello,
});
</script>

<style scoped>
  p {
    text-align: center;
  }
</style>
