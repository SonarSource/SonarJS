<!-- my-component.vue -->
<template>
  <div>hello</div>
</template>
<script>
let x = 42; // to verify highlighting by SonarJS
</script>
<style>
b a {
  color: pink;;                                               /* S1116 | no-extra-semicolons */
}
</style>
