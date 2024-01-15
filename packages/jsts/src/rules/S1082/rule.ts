/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://sonarsource.github.io/rspec/#/rspec/S1082/javascript

import { Rule } from 'eslint';
import { mergeRules } from '../helpers';
import { rules as jsxA11yRules } from 'eslint-plugin-jsx-a11y';

const mouseEventsHaveKeyEvents = jsxA11yRules['mouse-events-have-key-events'];
const clickEventsHaveKeyEvents = jsxA11yRules['click-events-have-key-events'];

export const rule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    messages: {
      ...mouseEventsHaveKeyEvents.meta!.messages,
      ...clickEventsHaveKeyEvents.meta!.messages,
    },
  },

  create(context: Rule.RuleContext) {
    const mouseEventsHaveKeyEventsListener = mouseEventsHaveKeyEvents.create(context);
    const clickEventsHaveKeyEventsListener = clickEventsHaveKeyEvents.create(context);

    return mergeRules(mouseEventsHaveKeyEventsListener, clickEventsHaveKeyEventsListener);
  },
};
