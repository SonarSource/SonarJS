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
// https://jira.sonarsource.com/browse/RSPEC-3798

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { globalsByLibraries } from '../utils/globals';

const builtins = [
  ...globalsByLibraries.builtin,
  ...globalsByLibraries.browser,
  ...globalsByLibraries.worker,
  ...globalsByLibraries.node,
  ...globalsByLibraries.commonjs,
  ...globalsByLibraries.amd,
  ...globalsByLibraries.mocha,
  ...globalsByLibraries.jasmine,
  ...globalsByLibraries.jest,
  ...globalsByLibraries.qunit,
  ...globalsByLibraries.phantomjs,
  ...globalsByLibraries.couch,
  ...globalsByLibraries.rhino,
  ...globalsByLibraries.nashorn,
  ...globalsByLibraries.wsh,
  ...globalsByLibraries.jquery,
  ...globalsByLibraries.yui,
  ...globalsByLibraries.shelljs,
  ...globalsByLibraries.prototypejs,
  ...globalsByLibraries.meteor,
  ...globalsByLibraries.mongo,
  ...globalsByLibraries.applescript,
  ...globalsByLibraries.serviceworker,
  ...globalsByLibraries.atomtest,
  ...globalsByLibraries.embertest,
  ...globalsByLibraries.protractor,
  ...globalsByLibraries.webextensions,
  ...globalsByLibraries.greasemonkey,
  ...globalsByLibraries.flow,
];

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const raised: Set<string> = new Set();

    function isBuiltIn(name: string) {
      return builtins.includes(name);
    }

    function isRaised(node: estree.Identifier) {
      const { name } = node;
      const hasRaised = raised.has(name);
      raised.add(name);
      return hasRaised;
    }

    function isRaisable(definition: Scope.Definition) {
      return (
        (definition.type === 'Variable' && definition.parent.kind === 'var') ||
        definition.type === 'FunctionName'
      );
    }

    function getGlobalScope(node: estree.Program) {
      const scope = context.getScope();
      if (node.sourceType === 'script') {
        return scope;
      } else {
        return scope.childScopes.find(s => s.type === 'module' && s.block.type === 'Program')!;
      }
    }

    function checkVariable(variable: Scope.Variable) {
      if (isBuiltIn(variable.name) || variable.references.length !== 0) {
        return;
      }

      variable.defs.filter(isRaisable).forEach(def => raiseIssue(def.name));
    }

    function checkReference(reference: Scope.Reference) {
      if (isBuiltIn(reference.identifier.name)) {
        return;
      }

      if (!reference.resolved) {
        raiseIssue(reference.identifier);
        return;
      }

      const { defs } = reference.resolved;
      defs.filter(isRaisable).forEach(def => raiseIssue(def.name));
    }

    function raiseIssue(node: estree.Identifier) {
      if (!isRaised(node)) {
        context.report({
          message: `Define this declaration in a local scope or bind explicitly the property to the global object.`,
          node,
        });
      }
    }

    return {
      Program: (node: estree.Node) => {
        const scope = getGlobalScope(node as estree.Program);
        scope.variables.forEach(checkVariable);
        scope.references.forEach(checkReference);
      },
    };
  },
};
