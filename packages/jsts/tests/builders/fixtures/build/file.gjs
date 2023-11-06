import Component from '@glimmer/component';

export default class Hello extends Component {
  get helloWorld() {
    return 'hello world';
  }

  <template>
    {{this.helloWorld}}
  </template>
}