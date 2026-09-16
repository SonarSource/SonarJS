<script setup lang="ts" generic="T extends keyof typeof options = 'UnusedOption', U = { UnusedOption: T }">
  import { options } from './types';
  // Noncompliant@+1 [[qf1]] {{Remove this unused import of 'UnusedOption'.}}
  import type { UnusedOption } from './types';
  // fix@qf1 {{Remove this import statement}}
  // del@qf1
  // Noncompliant@+1 [[qf2]] {{Remove this unused import of 'T'.}}
  import type { T } from './types';
  // fix@qf2 {{Remove this import statement}}
  // del@qf2
  defineProps<{ config: U }>();
</script>
