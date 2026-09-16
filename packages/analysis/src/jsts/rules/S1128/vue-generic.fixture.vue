<script setup lang="ts" generic="T extends BaseFilterOption, U = DefaultOption, V extends Options.Item = AliasedOption, W = DefaultImport">
  import type { BaseFilterOption } from './types';
  import type { DefaultOption } from './types';
  import type { Option as AliasedOption } from './types';
  import type * as Options from './types';
  import type DefaultImport from './types';
  // Noncompliant@+1 [[qf1]] {{Remove this unused import of 'UnusedOption'.}}
  import type { UnusedOption } from './types';
  // fix@qf1 {{Remove this import statement}}
  // del@qf1
  defineProps<{ options: T[]; fallback: U; item: V; defaultItem: W }>();
</script>
<template>
  <div />
</template>
