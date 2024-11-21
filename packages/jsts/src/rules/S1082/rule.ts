/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S1082/javascript

import type { Rule } from 'eslint';
import { generateMeta, mergeRules } from '../helpers/index.js';
import pkg from 'eslint-plugin-jsx-a11y';
const { rules: jsxA11yRules } = pkg;
import { meta } from './meta.js';

const mouseEventsHaveKeyEvents = jsxA11yRules['mouse-events-have-key-events'];
const clickEventsHaveKeyEvents = jsxA11yRules['click-events-have-key-events'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    hasSuggestions: true,
    messages: {
      ...mouseEventsHaveKeyEvents.meta!.messages,
      ...clickEventsHaveKeyEvents.meta!.messages,
    },
  }),
  create(context: Rule.RuleContext) {
    const mouseEventsHaveKeyEventsListener = mouseEventsHaveKeyEvents.create(context);
    const clickEventsHaveKeyEventsListener = clickEventsHaveKeyEvents.create(context);

    return mergeRules(mouseEventsHaveKeyEventsListener, clickEventsHaveKeyEventsListener);
  },
};
