import { Vue } from 'vue-class-component';

export default class MyComponent extends Vue { // Noncompliant {{Replace this deprecated Vue class-based component pattern with the Composition API.}}
  count = 0;

  increment() {
    this.count++;
  }
}

class UnrelatedBaseClass extends SomeOtherBase {} // compliant: superclass is unrelated to vue-class-component
