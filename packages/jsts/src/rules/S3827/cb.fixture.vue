<template>
  <div>{{ foo }}</div>
</template>

<script setup lang="ts">

  function someFunc(){}

  const props1 = defineProps({ foo: String });

  interface Props {
    msg?: string
    labels?: string[]
  }

  const props2 = withDefaults(defineProps<Props>(), {
    msg: 'hello',
    labels: () => ['one', 'two']
  })  

  const emit = defineEmits(['change', 'delete']);

  let foo = 1;
  defineExpose({foo});

  defineOptions({ inheritAttrs: false });

  const slots = defineSlots<{
    default(props: { msg: string }): any
  }>();

  someFunc();

</script>

<script>

const props = defineProps({ foo: String }); // Noncompliant

const emit = defineEmits(['change', 'delete']); // Noncompliant

let foo = 1;
defineExpose({foo}); // Noncompliant

defineOptions({ inheritAttrs: false }); // Noncompliant

export default {
  customOptions: {}
}
</script>
