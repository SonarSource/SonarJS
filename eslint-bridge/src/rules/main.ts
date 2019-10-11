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
import { rule as noDuplicateInComposite } from "./no-duplicate-in-composite";
import { rule as noRedundantJump } from "./no-redundant-jump";
import { rule as noTab } from "./no-tab";
import { rule as nonExistentOperator } from "./non-existent-operator";
import { rule as noNestedSwitch } from "./no-nested-switch";
import { rule as noNestedIncDec } from "./no-nested-incdec";
import { rule as noNestedTemplateLiterals } from "./no-nested-template-literals";
import { rule as noPrimitiveWrappers } from "./no-primitive-wrappers";
import { rule as noSameLineConditional } from "./no-same-line-conditional";
import { rule as noUnthrownError } from "./no-unthrown-error";
import { rule as osCommand } from "./os-command";
import { rule as processArgv } from "./process-argv";
import { rule as pseudoRandom } from "./pseudo-random";
import { rule as regularExpr } from "./regular-expr";
import { rule as sockets } from "./sockets";
import { rule as sqlQueries } from "./sql-queries";
import { rule as standardInput } from "./standard-input";
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
ruleModules["no-redundant-parentheses"] = noRedundantParentheses;
ruleModules["comma-or-logical-or-case"] = commaOrLogicalOrCase;
ruleModules["max-union-size"] = maxUnionSize;
ruleModules["no-duplicate-in-composite"] = noDuplicateInComposite;
ruleModules["no-redundant-jump"] = noRedundantJump;
ruleModules["no-tab"] = noTab;
ruleModules["non-existent-operator"] = nonExistentOperator;
ruleModules["no-nested-switch"] = noNestedSwitch;
ruleModules["no-nested-incdec"] = noNestedIncDec;
ruleModules["no-nested-template-literals"] = noNestedTemplateLiterals;
ruleModules["no-primitive-wrappers"] = noPrimitiveWrappers;
ruleModules["no-same-line-conditional"] = noSameLineConditional;
ruleModules["no-unthrown-error"] = noUnthrownError;
ruleModules["os-command"] = osCommand;
ruleModules["process-argv"] = processArgv;
ruleModules["pseudo-random"] = pseudoRandom;
ruleModules["regular-expr"] = regularExpr;
ruleModules["sockets"] = sockets;
ruleModules["sql-queries"] = sqlQueries;
ruleModules["standard-input"] = standardInput;
ruleModules["variable-name"] = variableName;
ruleModules["xpath"] = xpath;

export { ruleModules as rules };
