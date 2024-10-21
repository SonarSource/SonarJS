/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S5843/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import * as regexpp from '@eslint-community/regexpp';
import {
  Assertion,
  Backreference,
  CapturingGroup,
  CharacterClass,
  Group,
  LookaroundAssertion,
  Pattern,
  Quantifier,
} from '@eslint-community/regexpp/ast';
import {
  generateMeta,
  getUniqueWriteUsage,
  isBinaryPlus,
  isIdentifier,
  isRegexLiteral,
  isRequiredParserServices,
  isStaticTemplateLiteral,
  isStringLiteral,
  IssueLocation,
  LocationHolder,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import { isRegExpConstructor, isStringRegexMethodCall } from '../helpers/regex/ast.js';
import { FromSchema } from 'json-schema-to-ts';
import { meta, schema } from './meta.js';
import { getParsedRegex } from '../helpers/regex/extract.js';
import { getRegexpRange } from '../helpers/regex/range.js';
import { getRegexpLocation } from '../helpers/regex/location.js';

const DEFAULT_THRESHOLD = 20;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, { schema }, true),
  create(context: Rule.RuleContext) {
    const threshold =
      (context.options as FromSchema<typeof schema>)[0]?.threshold ?? DEFAULT_THRESHOLD;
    const services = context.sourceCode.parserServices;
    const regexNodes: estree.Node[] = [];
    return {
      'Literal[regex]:exit': (node: estree.Node) => {
        regexNodes.push(node);
      },
      'NewExpression:exit': (node: estree.Node) => {
        if (isRegExpConstructor(node)) {
          regexNodes.push(node);
        }
      },
      'CallExpression:exit': (node: estree.Node) => {
        const callExpr = node as estree.CallExpression;
        if (isRequiredParserServices(services) && isStringRegexMethodCall(callExpr, services)) {
          regexNodes.push(callExpr.arguments[0]);
        } else if (isRegExpConstructor(callExpr)) {
          regexNodes.push(callExpr);
        }
      },
      'Program:exit': () => {
        regexNodes.forEach(regexNode => checkRegexComplexity(regexNode, threshold, context));
      },
    };
  },
};

function checkRegexComplexity(
  regexNode: estree.Node,
  threshold: number,
  context: Rule.RuleContext,
) {
  for (const regexParts of findRegexParts(regexNode, context)) {
    let complexity = 0;
    const secondaryLocations: IssueLocation[] = [];
    for (const regexPart of regexParts) {
      const calculator = new ComplexityCalculator(regexPart, context);
      calculator.visit();
      calculator.components.forEach(component => {
        secondaryLocations.push(toSecondaryLocation(component.location, component.message));
      });
      complexity += calculator.complexity;
    }
    if (complexity > threshold) {
      report(
        context,
        {
          message: `Simplify this regular expression to reduce its complexity from ${complexity} to the ${threshold} allowed.`,
          node: regexParts[0],
        },
        secondaryLocations,
        complexity - threshold,
      );
    }
  }
}

type RegexPart = estree.Literal | estree.TemplateLiteral;

function findRegexParts(node: estree.Node, context: Rule.RuleContext): RegexPart[][] {
  const finder = new RegexPartFinder(context);
  finder.find(node);
  return finder.parts;
}

class RegexPartFinder {
  readonly parts: RegexPart[][] = [];

  readonly handledIdentifiers: Array<estree.Node> = [];

  constructor(private readonly context: Rule.RuleContext) {}

  find(node: estree.Node) {
    if (isRegExpConstructor(node)) {
      this.find(node.arguments[0]);
    } else if (isRegexLiteral(node)) {
      this.parts.push([node]);
    } else if (isStringLiteral(node)) {
      this.parts.push([node]);
    } else if (isStaticTemplateLiteral(node)) {
      this.parts.push([node]);
    } else if (isIdentifier(node)) {
      if (!this.handledIdentifiers.includes(node)) {
        this.handledIdentifiers.push(node);

        const initializer = getUniqueWriteUsage(this.context, node.name, node);

        if (initializer) {
          this.find(initializer);
        }
      }
    } else if (isBinaryPlus(node)) {
      const literals: estree.Literal[] = [];
      this.findInStringConcatenation(node.left, literals);
      this.findInStringConcatenation(node.right, literals);
      if (literals.length > 0) {
        this.parts.push(literals);
      }
    }
  }

  findInStringConcatenation(node: estree.Node, literals: estree.Literal[]) {
    if (isStringLiteral(node)) {
      literals.push(node);
    } else if (isBinaryPlus(node)) {
      this.findInStringConcatenation(node.left, literals);
      this.findInStringConcatenation(node.right, literals);
    } else {
      this.find(node);
    }
  }
}

type Disjunction = CapturingGroup | Group | LookaroundAssertion | Pattern;

class ComplexityCalculator {
  nesting = 1;
  complexity = 0;
  components: { location: LocationHolder; message: string }[] = [];
  regexPartAST: regexpp.AST.Node | null;

  constructor(
    readonly regexPart: RegexPart,
    readonly context: Rule.RuleContext,
  ) {
    this.regexPartAST = getParsedRegex(regexPart, context);
  }

  visit() {
    if (!this.regexPartAST) {
      return;
    }
    regexpp.visitRegExpAST(this.regexPartAST, {
      onAssertionEnter: (node: Assertion) => {
        /* lookaround */
        if (node.kind === 'lookahead' || node.kind === 'lookbehind') {
          const [start, end] = getRegexpRange(this.regexPart, node);
          this.increaseComplexity(this.nesting, node, [
            0,
            -(end - start - 1) + (node.kind === 'lookahead' ? '?='.length : '?<='.length),
          ]);
          this.nesting++;
          this.onDisjunctionEnter(node);
        }
      },
      onAssertionLeave: (node: Assertion) => {
        /* lookaround */
        if (node.kind === 'lookahead' || node.kind === 'lookbehind') {
          this.onDisjunctionLeave(node);
          this.nesting--;
        }
      },
      onBackreferenceEnter: (node: Backreference) => {
        this.increaseComplexity(1, node);
      },
      onCapturingGroupEnter: (node: CapturingGroup) => {
        /* disjunction */
        this.onDisjunctionEnter(node);
      },
      onCapturingGroupLeave: (node: CapturingGroup) => {
        /* disjunction */
        this.onDisjunctionLeave(node);
      },
      onCharacterClassEnter: (node: CharacterClass) => {
        /* character class */
        const [start, end] = getRegexpRange(this.regexPart, node);
        this.increaseComplexity(1, node, [0, -(end - start - 1)]);
        this.nesting++;
      },
      onCharacterClassLeave: (_node: CharacterClass) => {
        /* character class */
        this.nesting--;
      },
      onGroupEnter: (node: Group) => {
        /* disjunction */
        this.onDisjunctionEnter(node);
      },
      onGroupLeave: (node: Group) => {
        /* disjunction */
        this.onDisjunctionLeave(node);
      },
      onPatternEnter: (node: Pattern) => {
        /* disjunction */
        this.onDisjunctionEnter(node);
      },
      onPatternLeave: (node: Pattern) => {
        /* disjunction */
        this.onDisjunctionLeave(node);
      },
      onQuantifierEnter: (node: Quantifier) => {
        /* repetition */
        const [start] = getRegexpRange(this.regexPart, node);
        const [, end] = getRegexpRange(this.regexPart, node.element);
        this.increaseComplexity(this.nesting, node, [end - start, 0]);
        this.nesting++;
      },
      onQuantifierLeave: (_node: Quantifier) => {
        /* repetition */
        this.nesting--;
      },
    });
  }

  private increaseComplexity(increment: number, node: regexpp.AST.Node, offset?: number[]) {
    this.complexity += increment;
    let message = '+' + increment;
    if (increment > 1) {
      message += ` (incl ${increment - 1} for nesting)`;
    }
    const loc = getRegexpLocation(this.regexPart, node, this.context, offset);
    if (loc) {
      this.components.push({
        location: {
          loc,
        },
        message,
      });
    }
  }

  private onDisjunctionEnter(node: Disjunction) {
    if (node.alternatives.length > 1) {
      let { alternatives } = node;
      let increment = this.nesting;
      while (alternatives.length > 1) {
        const [start, end] = getRegexpRange(this.regexPart, alternatives[1]);
        this.increaseComplexity(increment, alternatives[1], [-1, -(end - start)]);
        increment = 1;
        alternatives = alternatives.slice(1);
      }
      this.nesting++;
    }
  }

  private onDisjunctionLeave(node: Disjunction) {
    if (node.alternatives.length > 1) {
      this.nesting--;
    }
  }
}
