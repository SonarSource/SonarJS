/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { rule } from './index.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

import parser from 'vue-eslint-parser';

const ruleTesterVue = new NoTypeCheckingRuleTester({ parser });

describe('S9107', () => {
  it('S9107 (decorated: vue/require-prop-type-constructor)', () => {
    ruleTesterVue.run('Vue component prop types should be constructors', rule, {
      valid: [
        {
          // Options API: props declared with actual constructors, including array-shorthand
          code: `
<script>
export default {
  props: {
    title: String,
    count: Number,
    value: [String, Number]
  }
}
</script>
`,
        },
        {
          // Composition API: defineProps with actual constructors
          code: `
<script setup>
defineProps({
  title: String,
  count: Number
});
</script>
`,
        },
      ],
      invalid: [
        {
          // Options API: string literal standing in for a constructor
          code: `
<script>
export default {
  props: {
    title: {
      type: 'String'
    }
  }
}
</script>
`,
          output: `
<script>
export default {
  props: {
    title: {
      type: String
    }
  }
}
</script>
`,
          errors: [
            {
              message:
                'Replace this value with a constructor, e.g. String or Number, for the "title" prop\'s type.',
            },
          ],
        },
        {
          // Options API: template literal standing in for a constructor
          code: `
<script>
export default {
  props: {
    title: {
      type: \`String\`
    }
  }
}
</script>
`,
          output: `
<script>
export default {
  props: {
    title: {
      type: String
    }
  }
}
</script>
`,
          errors: [
            {
              message:
                'Replace this value with a constructor, e.g. String or Number, for the "title" prop\'s type.',
            },
          ],
        },
        {
          // Options API: array-shorthand type checked element by element
          code: `
<script>
export default {
  props: {
    value: {
      type: ['String', Number]
    }
  }
}
</script>
`,
          output: `
<script>
export default {
  props: {
    value: {
      type: [String, Number]
    }
  }
}
</script>
`,
          errors: [
            {
              message:
                'Replace this value with a constructor, e.g. String or Number, for the "value" prop\'s type.',
            },
          ],
        },
        {
          // Options API: string literal that isn't a valid identifier is reported but not
          // autofixed, since replacing the text as-is would produce invalid code
          code: `
<script>
export default {
  props: {
    title: {
      type: 'not-a-real-type'
    }
  }
}
</script>
`,
          output: null,
          errors: [
            {
              message:
                'Replace this value with a constructor, e.g. String or Number, for the "title" prop\'s type.',
            },
          ],
        },
        {
          // Options API: BinaryExpression is reported but not autofixed
          code: `
<script>
export default {
  props: {
    title: {
      type: String + ''
    }
  }
}
</script>
`,
          output: null,
          errors: [
            {
              message:
                'Replace this value with a constructor, e.g. String or Number, for the "title" prop\'s type.',
            },
          ],
        },
        {
          // Options API: UpdateExpression is reported but not autofixed
          code: `
<script>
let count = 0;
export default {
  props: {
    title: {
      type: count++
    }
  }
}
</script>
`,
          output: null,
          errors: [
            {
              message:
                'Replace this value with a constructor, e.g. String or Number, for the "title" prop\'s type.',
            },
          ],
        },
        {
          // Composition API: defineProps string literal standing in for a constructor
          code: `
<script setup>
defineProps({
  title: {
    type: 'String'
  }
});
</script>
`,
          output: `
<script setup>
defineProps({
  title: {
    type: String
  }
});
</script>
`,
          errors: [
            {
              message:
                'Replace this value with a constructor, e.g. String or Number, for the "title" prop\'s type.',
            },
          ],
        },
      ],
    });
  });
});
