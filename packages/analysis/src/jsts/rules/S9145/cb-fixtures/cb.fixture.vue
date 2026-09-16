<script lang="ts">
import { Options, Vue } from 'vue-class-component';

@Options({
  props: {
    message: String,
  },
})
export default class MyComponent extends Vue { // Noncompliant {{Replace this deprecated Vue class-based component pattern with the Composition API.}}
  count = 0;
}
</script>
