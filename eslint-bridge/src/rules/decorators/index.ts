import { decorateAccessorPairs } from './accessor-pairs-decorator';
import { decorateNoDupeKeys } from './no-dupe-keys-decorator';
import { decorateNoRedeclare } from './no-redeclare-decorator';
import { decorateObjectShorthand } from './object-shorthand-decorator';
import { decoratePreferTemplate } from './prefer-template-decorator';

export const externalRuleDecorators = [
  { decorate: decorateAccessorPairs, ruleKey: 'accessor-pairs' },
  { decorate: decoratePreferTemplate, ruleKey: 'prefer-template' },
  { decorate: decorateNoRedeclare, ruleKey: 'no-redeclare' },
  { decorate: decorateObjectShorthand, ruleKey: 'object-shorthand' },
  { decorate: decorateNoDupeKeys, ruleKey: 'no-dupe-keys' },
];
