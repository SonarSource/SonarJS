import { Options, Vue } from 'vue-class-component';
import { Component as VueComponent, Vue as VueBase } from 'vue-class-component';
import { Component as FacingComponent } from 'vue-facing-decorator';
import { Vue as PropertyDecoratorVue, Prop, Watch as VueWatch } from 'vue-property-decorator';

@Options({
  props: {
    message: String,
  },
})
export default class MyComponent extends Vue { // Noncompliant {{Replace this deprecated Vue class-based component pattern with the Composition API.}}
//                   ^^^^^^^^^^^
  count = 0;
}

class ExtendsOnly extends Vue { // Noncompliant {{Replace this deprecated Vue class-based component pattern with the Composition API.}}
  count = 0;

  increment() {
    this.count++;
  }
}

@VueComponent
class BareDecoratorOnly {} // Noncompliant {{Replace this deprecated Vue class-based component pattern with the Composition API.}}

class AliasedSuperclass extends VueBase { // Noncompliant {{Replace this deprecated Vue class-based component pattern with the Composition API.}}
  count = 0;
}

const AnonymousClassExpression = class extends Vue { // Noncompliant {{Replace this deprecated Vue class-based component pattern with the Composition API.}}
  count = 0;
};

function Component(_unused: unknown) {
  return () => {};
}

@Component
class LocallyDefinedDecorator {} // compliant: "Component" here is not imported from vue-class-component

@FacingComponent
class UsesFacingDecorator {} // compliant: vue-facing-decorator is explicitly out of scope

class UnrelatedBaseClass extends SomeOtherBase {} // compliant: superclass is unrelated to vue-class-component

class UsesPropertyDecorator extends PropertyDecoratorVue { // Noncompliant {{Replace this deprecated Vue class-based component pattern with the Composition API.}}
  // extends a superclass unrelated to vue-class-component, but the @Prop decorator below
  // is imported from vue-property-decorator, which is also deprecated and archived
  @Prop() readonly msg!: string;
}

class AliasedPropertyDecorator { // Noncompliant {{Replace this deprecated Vue class-based component pattern with the Composition API.}}
  @VueWatch('someProp')
  onSomePropChanged() {}
}

function Watch(_unused: string) {
  return () => {};
}

class LocallyDefinedPropertyDecorator {
  @Watch('someProp') // compliant: "Watch" here is not imported from vue-property-decorator
  onSomePropChanged() {}
}
