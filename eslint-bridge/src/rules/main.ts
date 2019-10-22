/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import { Rule } from "eslint";
import { rule as className } from "./class-name";
import { rule as noUselessIncrement } from "./no-useless-increment";
import { rule as codeEval } from "./code-eval";
import { rule as cookies } from "./cookies";
import { rule as cors } from "./cors";
import { rule as encryption } from "./encryption";
import { rule as fileHeader } from "./file-header";
import { rule as hashing } from "./hashing";
import { rule as labelPosition } from "./label-position";
import { rule as noRedundantParentheses } from "./no-redundant-parentheses";
import { rule as commaOrLogicalOrCase } from "./comma-or-logical-or-case";
import { rule as maxUnionSize } from "./max-union-size";
import { rule as noArrayDelete } from "./no-array-delete";
import { rule as noDuplicateInComposite } from "./no-duplicate-in-composite";
import { rule as noIgnoredReturn } from "./no-ignored-return";
import { rule as noInconsistentReturns } from "./no-inconsistent-returns";
import { rule as noInvalidAwait } from "./no-invalid-await";
import { rule as noRedundantJump } from "./no-redundant-jump";
import { rule as cyclomaticComplexity } from "./cyclomatic-complexity";
import { rule as noTab } from "./no-tab";
import { rule as nonExistentOperator } from "./non-existent-operator";
import { rule as noInMisuse } from "./no-in-misuse";
import { rule as noNestedSwitch } from "./no-nested-switch";
import { rule as noNestedIncDec } from "./no-nested-incdec";
import { rule as noNestedTemplateLiterals } from "./no-nested-template-literals";
import { rule as noPrimitiveWrappers } from "./no-primitive-wrappers";
import { rule as noSameLineConditional } from "./no-same-line-conditional";
import { rule as noUndefinedArgument } from "./no-undefined-argument";
import { rule as noUnthrownError } from "./no-unthrown-error";
import { rule as noUnusedCollection } from "./no-unused-collection";
import { rule as noUselessIntersection } from "./no-useless-intersection";
import { rule as noReturnTypeAny } from "./no-return-type-any";
import { rule as osCommand } from "./os-command";
import { rule as preferTypeGuard } from "./prefer-type-guard";
import { rule as processArgv } from "./process-argv";
import { rule as preferDefaultLast } from "./prefer-default-last";
import { rule as pseudoRandom } from "./pseudo-random";
import { rule as regularExpr } from "./regular-expr";
import { rule as sockets } from "./sockets";
import { rule as sqlQueries } from "./sql-queries";
import { rule as standardInput } from "./standard-input";
import { rule as useTypeAlias } from "./use-type-alias";
import { rule as variableName } from "./variable-name";
import { rule as xpath } from "./xpath";

const ruleModules: { [key: string]: Rule.RuleModule } = {};

ruleModules["class-name"] = className;
ruleModules["no-useless-increment"] = noUselessIncrement;
ruleModules["code-eval"] = codeEval;
ruleModules["cookies"] = cookies;
ruleModules["cors"] = cors;
ruleModules["encryption"] = encryption;
ruleModules["file-header"] = fileHeader;
ruleModules["hashing"] = hashing;
ruleModules["label-position"] = labelPosition;
ruleModules["no-array-delete"] = noArrayDelete;
ruleModules["no-redundant-parentheses"] = noRedundantParentheses;
ruleModules["comma-or-logical-or-case"] = commaOrLogicalOrCase;
ruleModules["max-union-size"] = maxUnionSize;
ruleModules["no-duplicate-in-composite"] = noDuplicateInComposite;
ruleModules["no-ignored-return"] = noIgnoredReturn;
ruleModules["no-inconsistent-returns"] = noInconsistentReturns;
ruleModules["no-invalid-await"] = noInvalidAwait;
ruleModules["no-redundant-jump"] = noRedundantJump;
ruleModules["cyclomatic-complexity"] = cyclomaticComplexity;
ruleModules["no-tab"] = noTab;
ruleModules["non-existent-operator"] = nonExistentOperator;
ruleModules["no-in-misuse"] = noInMisuse;
ruleModules["no-nested-switch"] = noNestedSwitch;
ruleModules["no-nested-incdec"] = noNestedIncDec;
ruleModules["no-nested-template-literals"] = noNestedTemplateLiterals;
ruleModules["no-primitive-wrappers"] = noPrimitiveWrappers;
ruleModules["no-same-line-conditional"] = noSameLineConditional;
ruleModules["no-unthrown-error"] = noUnthrownError;
ruleModules["no-undefined-argument"] = noUndefinedArgument;
ruleModules["no-unused-collection"] = noUnusedCollection;
ruleModules["no-useless-intersection"] = noUselessIntersection;
ruleModules["no-return-type-any"] = noReturnTypeAny;
ruleModules["os-command"] = osCommand;
ruleModules["prefer-type-guard"] = preferTypeGuard;
ruleModules["process-argv"] = processArgv;
ruleModules["prefer-default-last"] = preferDefaultLast;
ruleModules["pseudo-random"] = pseudoRandom;
ruleModules["regular-expr"] = regularExpr;
ruleModules["sockets"] = sockets;
ruleModules["sql-queries"] = sqlQueries;
ruleModules["standard-input"] = standardInput;
ruleModules["use-type-alias"] = useTypeAlias;
ruleModules["variable-name"] = variableName;
ruleModules["xpath"] = xpath;

export { ruleModules as rules };
