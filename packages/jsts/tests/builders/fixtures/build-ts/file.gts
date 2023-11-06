import Component from '@glimmer/component';

export default class Hello extends Component {
  get helloWorld(): string {
    return 'hello world';
  }

  <template>
    {{this.helloWorld}}
  </template>
}