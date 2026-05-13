<script lang="ts" setup>
import { ref } from 'vue'

const textarea = ref(<HTMLTextAreaElement | null>null)
</script>

<template><textarea ref="textarea" /></template>
