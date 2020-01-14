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
import { rule as argumentsOrder } from "./arguments-order";
import { rule as argumentsUsage } from "./arguments-usage";
import { rule as arrowFunctionConvention } from "./arrow-function-convention";
import { rule as boolParamDefault } from "./bool-param-default";
import { rule as callArgumentLine } from "./call-argument-line";
import { rule as className } from "./class-name";
import { rule as codeEval } from "./code-eval";
import { rule as commaOrLogicalOrCase } from "./comma-or-logical-or-case";
import { rule as commentRegex } from "./comment-regex";
import { rule as constructorForSideEffects } from "./constructor-for-side-effects";
import { rule as cookies } from "./cookies";
import { rule as cors } from "./cors";
import { rule as cyclomaticComplexity } from "./cyclomatic-complexity";
import { rule as deprecation } from "./deprecation";
import { rule as destructuringAssignmentSyntax } from "./destructuring-assignment-syntax";
import { rule as elseIfWithoutElse } from "./elseif-without-else";
import { rule as encryption } from "./encryption";
import { rule as expressionComplexity } from "./expression-complexity";
import { rule as fileHeader } from "./file-header";
import { rule as fileNameDifferFromClass } from "./file-name-differ-from-class";
import { rule as fixmeTag } from "./fixme-tag";
import { rule as functionName } from "./function-name";
import { rule as functionInsideLoop } from "./function-inside-loop";
import { rule as hashing } from "./hashing";
import { rule as inconsistentFunctionCall } from "./inconsistent-function-call";
import { rule as indexOfCompareToPositiveNumber } from "./index-of-compare-to-positive-number";
import { rule as labelPosition } from "./label-position";
import { rule as maxUnionSize } from "./max-union-size";
import { rule as misplacedLoopCounter } from "./misplaced-loop-counter";
import { rule as noAccessorFieldMismatch } from "./no-accessor-field-mismatch";
import { rule as noAlphabeticalSort } from "./no-alphabetical-sort";
import { rule as noArrayDelete } from "./no-array-delete";
import { rule as noCaseLabelInSwitch } from "./no-case-label-in-switch";
import { rule as noCommentedCode } from "./no-commented-code";
import { rule as noDeadStore } from "./no-dead-store";
import { rule as noDuplicateInComposite } from "./no-duplicate-in-composite";
import { rule as noEmptyCollection } from "./no-empty-collection";
import { rule as noEqualsInForTermination } from "./no-equals-in-for-termination";
import { rule as noFunctionDeclarationInBlock } from "./no-function-declaration-in-block";
import { rule as noGlobalsShadowing } from "./no-globals-shadowing";
import { rule as noGratuitousExpressions } from "./no-gratuitous-expressions";
import { rule as noHardcodedCredentials } from "./no-hardcoded-credentials";
import { rule as noIgnoredReturn } from "./no-ignored-return";
import { rule as noImplicitDependencies } from "./no-implicit-dependencies";
import { rule as noInMisuse } from "./no-in-misuse";
import { rule as noInconsistentReturns } from "./no-inconsistent-returns";
import { rule as noInvalidAwait } from "./no-invalid-await";
import { rule as noInvariantReturns } from "./no-invariant-returns";
import { rule as noMsleadingArrayReverse } from "./no-misleading-array-reverse";
import { rule as noNestedAssignment } from "./no-nested-assignment";
import { rule as noNestedIncDec } from "./no-nested-incdec";
import { rule as noNestedSwitch } from "./no-nested-switch";
import { rule as noNestedTemplateLiterals } from "./no-nested-template-literals";
import { rule as noParameterReassignment } from "./no-parameter-reassignment";
import { rule as noPrimitiveWrappers } from "./no-primitive-wrappers";
import { rule as noRedundantOptional } from "./no-redundant-optional";
import { rule as noRedundantParentheses } from "./no-redundant-parentheses";
import { rule as noReturnTypeAny } from "./no-return-type-any";
import { rule as noTab } from "./no-tab";
import { rule as noTryPromise } from "./no-try-promise";
import { rule as noUndefinedArgument } from "./no-undefined-argument";
import { rule as noUnenclosedMultilineBlock } from "./no-unenclosed-multiline-block";
import { rule as noUnthrownError } from "./no-unthrown-error";
import { rule as noUnusedFunctionArgument } from "./no-unused-function-argument";
import { rule as noUselessIncrement } from "./no-useless-increment";
import { rule as noUselessIntersection } from "./no-useless-intersection";
import { rule as noVariableUsageBeforeDeclaration } from "./no-variable-usage-before-declaration";
import { rule as noWildcardImport } from "./no-wildcard-import";
import { rule as nonExistentOperator } from "./non-existent-operator";
import { rule as osCommand } from "./os-command";
import { rule as preferDefaultLast } from "./prefer-default-last";
import { rule as preferPromiseShorthand } from "./prefer-promise-shorthand";
import { rule as preferTypeGuard } from "./prefer-type-guard";
import { rule as processArgv } from "./process-argv";
import { rule as pseudoRandom } from "./pseudo-random";
import { rule as regularExpr } from "./regular-expr";
import { rule as shorthandPropertyGrouping } from "./shorthand-property-grouping";
import { rule as sockets } from "./sockets";
import { rule as sqlQueries } from "./sql-queries";
import { rule as standardInput } from "./standard-input";
import { rule as todoTag } from "./todo-tag";
import { rule as unusedImport } from "./unused-import";
import { rule as updatedLoopCounter } from "./updated-loop-counter";
import { rule as useTypeAlias } from "./use-type-alias";
import { rule as variableName } from "./variable-name";
import { rule as xpath } from "./xpath";

const ruleModules: { [key: string]: Rule.RuleModule } = {};

ruleModules["arguments-order"] = argumentsOrder;
ruleModules["arguments-usage"] = argumentsUsage;
ruleModules["arrow-function-convention"] = arrowFunctionConvention;
ruleModules["bool-param-default"] = boolParamDefault;
ruleModules["call-argument-line"] = callArgumentLine;
ruleModules["class-name"] = className;
ruleModules["code-eval"] = codeEval;
ruleModules["comma-or-logical-or-case"] = commaOrLogicalOrCase;
ruleModules["comment-regex"] = commentRegex;
ruleModules["constructor-for-side-effects"] = constructorForSideEffects;
ruleModules["cookies"] = cookies;
ruleModules["cors"] = cors;
ruleModules["cyclomatic-complexity"] = cyclomaticComplexity;
ruleModules["deprecation"] = deprecation;
ruleModules["destructuring-assignment-syntax"] = destructuringAssignmentSyntax;
ruleModules["elseif-without-else"] = elseIfWithoutElse;
ruleModules["encryption"] = encryption;
ruleModules["expression-complexity"] = expressionComplexity;
ruleModules["file-header"] = fileHeader;
ruleModules["file-name-differ-from-class"] = fileNameDifferFromClass;
ruleModules["fixme-tag"] = fixmeTag;
ruleModules["function-name"] = functionName;
ruleModules["function-inside-loop"] = functionInsideLoop;
ruleModules["hashing"] = hashing;
ruleModules["inconsistent-function-call"] = inconsistentFunctionCall;
ruleModules["index-of-compare-to-positive-number"] = indexOfCompareToPositiveNumber;
ruleModules["label-position"] = labelPosition;
ruleModules["max-union-size"] = maxUnionSize;
ruleModules["no-accessor-field-mismatch"] = noAccessorFieldMismatch;
ruleModules["no-alphabetical-sort"] = noAlphabeticalSort;
ruleModules["no-array-delete"] = noArrayDelete;
ruleModules["no-case-label-in-switch"] = noCaseLabelInSwitch;
ruleModules["no-commented-code"] = noCommentedCode;
ruleModules["no-dead-store"] = noDeadStore;
ruleModules["misplaced-loop-counter"] = misplacedLoopCounter;
ruleModules["no-duplicate-in-composite"] = noDuplicateInComposite;
ruleModules["no-empty-collection"] = noEmptyCollection;
ruleModules["no-equals-in-for-termination"] = noEqualsInForTermination;
ruleModules["no-function-declaration-in-block"] = noFunctionDeclarationInBlock;
ruleModules["no-globals-shadowing"] = noGlobalsShadowing;
ruleModules["no-gratuitous-expressions"] = noGratuitousExpressions;
ruleModules["no-hardcoded-credentials"] = noHardcodedCredentials;
ruleModules["no-ignored-return"] = noIgnoredReturn;
ruleModules["no-implicit-dependencies"] = noImplicitDependencies;
ruleModules["no-in-misuse"] = noInMisuse;
ruleModules["no-inconsistent-returns"] = noInconsistentReturns;
ruleModules["no-invalid-await"] = noInvalidAwait;
ruleModules["no-invariant-returns"] = noInvariantReturns;
ruleModules["no-misleading-array-reverse"] = noMsleadingArrayReverse;
ruleModules["no-nested-assignment"] = noNestedAssignment;
ruleModules["no-nested-incdec"] = noNestedIncDec;
ruleModules["no-nested-switch"] = noNestedSwitch;
ruleModules["no-nested-template-literals"] = noNestedTemplateLiterals;
ruleModules["no-parameter-reassignment"] = noParameterReassignment;
ruleModules["no-primitive-wrappers"] = noPrimitiveWrappers;
ruleModules["no-redundant-optional"] = noRedundantOptional;
ruleModules["no-redundant-parentheses"] = noRedundantParentheses;
ruleModules["no-return-type-any"] = noReturnTypeAny;
ruleModules["no-tab"] = noTab;
ruleModules["no-try-promise"] = noTryPromise;
ruleModules["no-undefined-argument"] = noUndefinedArgument;
ruleModules["no-unenclosed-multiline-block"] = noUnenclosedMultilineBlock;
ruleModules["no-unthrown-error"] = noUnthrownError;
ruleModules["no-unused-function-argument"] = noUnusedFunctionArgument;
ruleModules["no-useless-increment"] = noUselessIncrement;
ruleModules["no-useless-intersection"] = noUselessIntersection;
ruleModules["no-variable-usage-before-declaration"] = noVariableUsageBeforeDeclaration;
ruleModules["no-wildcard-import"] = noWildcardImport;
ruleModules["non-existent-operator"] = nonExistentOperator;
ruleModules["os-command"] = osCommand;
ruleModules["prefer-default-last"] = preferDefaultLast;
ruleModules["prefer-promise-shorthand"] = preferPromiseShorthand;
ruleModules["prefer-type-guard"] = preferTypeGuard;
ruleModules["process-argv"] = processArgv;
ruleModules["pseudo-random"] = pseudoRandom;
ruleModules["regular-expr"] = regularExpr;
ruleModules["shorthand-property-grouping"] = shorthandPropertyGrouping;
ruleModules["sockets"] = sockets;
ruleModules["sql-queries"] = sqlQueries;
ruleModules["standard-input"] = standardInput;
ruleModules["todo-tag"] = todoTag;
ruleModules["unused-import"] = unusedImport;
ruleModules["updated-loop-counter"] = updatedLoopCounter;
ruleModules["use-type-alias"] = useTypeAlias;
ruleModules["variable-name"] = variableName;
ruleModules["xpath"] = xpath;

export { ruleModules as rules };
