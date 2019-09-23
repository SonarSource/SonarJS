<template>
  <p>Hello</p>
</template>

<script>
module.exports = {
  foo: function (b) {
    if (b == 0) { // Noncompliant  
      doOneMoreThing();
    } else {
      doOneMoreThing();
    }
  }
}
</script>

<style>
  p {
    text-align: center;
  }
</style>
