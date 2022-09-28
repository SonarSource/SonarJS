<template>
  <div>
    <h1>Hello, world!</h1>
    <!--
      HTML comment
    -->
    <p v-if="isEnabled">Howdy!</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      /*
        JavaScript comment
      */
      isEnabled: true,
    }
  },
}
</script>

<style>
p {
  /*
    CSS comment
  */

  color: red;
}
</style>
