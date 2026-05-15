<script lang="ts" setup>
import { computed, ref } from 'vue';

const props = defineProps<{ modelValue: string }>();

const textarea = ref(<HTMLTextAreaElement | null>null);
const charCount = computed(() => props.modelValue.length);
</script>

<template>
  <textarea ref="textarea" :value="modelValue" />
  <span>{{ charCount }} characters</span>
</template>
