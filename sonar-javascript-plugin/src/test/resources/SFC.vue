<template>
  <p>{{ message }}</p>
</template>
<script lang="ts">
  import {Component, Prop, Vue} from 'vue-property-decorator';

  @Component({})
  export default class Test extends Vue {
    @Prop({default: 'Hello, World!'})
    private message: string;
  }
</script>
<style scoped>
  p {
    color: red;
  }
</style>