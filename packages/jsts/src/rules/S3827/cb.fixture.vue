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

const props = defineProps({ foo: String }); // Noncompliant {{"defineProps" does not exist. Change its name or declare it so that its usage doesn't result in a "ReferenceError".}}

const emit = defineEmits(['change', 'delete']); // Noncompliant {{"defineEmits" does not exist. Change its name or declare it so that its usage doesn't result in a "ReferenceError".}}

let foo = 1;
defineExpose({foo}); // Noncompliant {{"defineExpose" does not exist. Change its name or declare it so that its usage doesn't result in a "ReferenceError".}}

defineOptions({ inheritAttrs: false }); // Noncompliant {{"defineOptions" does not exist. Change its name or declare it so that its usage doesn't result in a "ReferenceError".}}

export default {
  customOptions: {}
}
</script>
