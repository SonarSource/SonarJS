import Component from '@glimmer/component';

export default class Hello extends Component<{ Args: { cond: boolean; foo: () => void } }> {
  get helloWorld(): string {
    if(this.args.cond) {
      return 'hello world';
    } else {
      return 'hello world';
    }
  }

  <template>
    {{this.helloWorld}}
  </template>
}