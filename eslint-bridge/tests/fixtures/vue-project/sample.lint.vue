<template>
  <p>Hello</p>
</template>

<script>
module.exports = {
  foo: function () {
    for (var i = 0; i < 10; i++) {
      console.log("i is " + i);
      break;
    }
    foo("Hello, world"); foo("Hello, world");
  }
}
</script>

<style scoped>
  p {
    text-align: center;
  }
</style>
