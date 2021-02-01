<template>
  <p>{{greeting}}</p>
</template>

<script lang="ts">
import Vue from 'vue';

const hello: string = 'Hello';
export default Vue.extend({
  greeting: hello as string, // Noncompliant
});
</script>

<style>
  p {
    text-align: center;
  }
</style>
