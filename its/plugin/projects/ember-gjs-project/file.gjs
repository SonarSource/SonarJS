import Component from '@glimmer/component';

export default class Hello extends Component {
  get helloWorld() {
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