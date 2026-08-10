<script lang="ts">
import { defineComponent } from 'vue';
import counterMixin from './mixins/counter';
//     ^^^^^^^^^^^^> {{Mixin imported from './mixins/counter'.}}

export default defineComponent({
  mixins: [counterMixin], // Noncompliant {{Replace this mixin with a Vue composable.}}
});
</script>
