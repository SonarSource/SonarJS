import Component from '@glimmer/component';
import { fourtyTwo } from './subfolder/index.ts';

export default class Hello extends Component {
  get helloWorld(): string {
    if('123' < fourtyTwo) {
      return 'hello world';
    } else {
      return 'hello world 2';
    }
  }

  <template>
    {{this.helloWorld}}
  </template>
}
