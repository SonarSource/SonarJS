import { a } from './jsx_tag';
import * as Foo from './types';

const value: Foo.Bar = 'ok';

export const Component = () => <a data-value={value} />;
