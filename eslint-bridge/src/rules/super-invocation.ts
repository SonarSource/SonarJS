/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-3854

import { Linter, Rule } from 'eslint';
import * as estree from 'estree';

const linter = new Linter();
const constructorSuperRule = linter.getRules().get('constructor-super')!;
const noThisBeforeSuperRule = linter.getRules().get('no-this-before-super')!;

export const rule: Rule.RuleModule = {
  // meta of constructor-super is required for issue messages
  ...{ meta: constructorSuperRule.meta },
  create(context: Rule.RuleContext) {
    const constructorSuperListener: Rule.RuleListener = constructorSuperRule.create(context);
    const notThisBeforeSuperListener: Rule.RuleListener = noThisBeforeSuperRule.create(context);
    return {
      onCodePathStart(codePath, node) {
        constructorSuperListener.onCodePathStart!(codePath, node);
        notThisBeforeSuperListener.onCodePathStart!(codePath, node);
      },
      onCodePathEnd(codePath, node) {
        constructorSuperListener.onCodePathEnd!(codePath, node);
        notThisBeforeSuperListener.onCodePathEnd!(codePath, node);
      },
      onCodePathSegmentStart(segment, node) {
        constructorSuperListener.onCodePathSegmentStart!(segment, node);
        notThisBeforeSuperListener.onCodePathSegmentStart!(segment, node);
      },
      onCodePathSegmentLoop(fromSegment, toSegment, node) {
        constructorSuperListener.onCodePathSegmentLoop!(fromSegment, toSegment, node);
        notThisBeforeSuperListener.onCodePathSegmentLoop!(fromSegment, toSegment, node);
      },
      'CallExpression:exit'(node: estree.Node) {
        // @ts-ignore
        constructorSuperListener['CallExpression:exit']!(node);
        // @ts-ignore
        notThisBeforeSuperListener['CallExpression:exit']!(node);
      },
      ReturnStatement(node) {
        constructorSuperListener.ReturnStatement!(node);
      },
      ThisExpression(node) {
        notThisBeforeSuperListener.ThisExpression!(node);
      },
      Super(node) {
        notThisBeforeSuperListener.Super!(node);
      },
      'Program:exit'() {
        // @ts-ignore
        constructorSuperListener['Program:exit']!();
        // @ts-ignore
        notThisBeforeSuperListener['Program:exit']!();
      },
    };
  },
};
