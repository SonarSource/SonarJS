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
import { Rule } from 'eslint';

import { rule as anchorPrecedence } from './anchor-precedence';
import { rule as argumentType } from './argument-type';
import { rule as argumentsOrder } from './arguments-order';
import { rule as argumentsUsage } from './arguments-usage';
import { rule as arrayCallBackWithoutReturn } from './array-callback-without-return';
import { rule as arrayConstructor } from './array-constructor';
import { rule as arrowFunctionConvention } from './arrow-function-convention';
import { rule as assertionsInTests } from './assertions-in-tests';
import { rule as awsApigatewayPublicApi } from './aws-apigateway-public-api';
import { rule as awsEc2RdsDmsPublic } from './aws-ec2-rds-dms-public';
import { rule as awsEc2UnencryptedEbsVolume } from './aws-ec2-unencrypted-ebs-volume';
import { rule as awsEfsUnencrypted } from './aws-efs-unencrypted';
import { rule as awsIamAllPrivileges } from './aws-iam-all-privileges';
import { rule as awsIamAllResourcesAccessible } from './aws-iam-all-resources-accessible';
import { rule as awsIamPrivilegeEscalation } from './aws-iam-privilege-escalation';
import { rule as awsIamPublicAccess } from './aws-iam-public-access';
import { rule as awsOpensearchserviceDomain } from './aws-opensearchservice-domain';
import { rule as awsRdsUnencryptedDatabases } from './aws-rds-unencrypted-databases';
import { rule as awsRestrictedIpAdminAccess } from './aws-restricted-ip-admin-access';
import { rule as awsS3BucketGrantedAccess } from './aws-s3-bucket-granted-access';
import { rule as awsS3BucketInsecureHttp } from './aws-s3-bucket-insecure-http';
import { rule as awsS3BucketPublicAccess } from './aws-s3-bucket-public-access';
import { rule as awsS3BucketServerEncryption } from './aws-s3-bucket-server-encryption';
import { rule as awsS3BucketVersioning } from './aws-s3-bucket-versioning';
import { rule as awsSagemakerUnencryptedNotebook } from './aws-sagemaker-unencrypted-notebook';
import { rule as awsSnsUnencryptedTopics } from './aws-sns-unencrypted-topics';
import { rule as awsSqsUnencryptedQueue } from './aws-sqs-unencrypted-queue';
import { rule as bitwiseOperators } from './bitwise-operators';
import { rule as boolParamDefault } from './bool-param-default';
import { rule as callArgumentLine } from './call-argument-line';
import { rule as certificateTransparency } from './certificate-transparency';
import { rule as chaiDeterminateAssertion } from './chai-determinate-assertion';
import { rule as className } from './class-name';
import { rule as classPrototype } from './class-prototype';
import { rule as codeEval } from './code-eval';
import { rule as commaOrLogicalOrCase } from './comma-or-logical-or-case';
import { rule as commentRegex } from './comment-regex';
import { rule as conciseRegex } from './concise-regex';
import { rule as conditionalIndentation } from './conditional-indentation';
import { rule as confidentialInformationLogging } from './confidential-information-logging';
import { rule as constructorForSideEffects } from './constructor-for-side-effects';
import { rule as contentLength } from './content-length';
import { rule as contentSecurityPolicy } from './content-security-policy';
import { rule as cookieNoHttpOnly } from './cookie-no-httponly';
import { rule as cookies } from './cookies';
import { rule as cors } from './cors';
import { rule as csrf } from './csrf';
import { rule as cyclomaticComplexity } from './cyclomatic-complexity';
import { rule as declarationsInGlobalScope } from './declarations-in-global-scope';
import { rule as deprecation } from './deprecation';
import { rule as destructuringAssignmentSyntax } from './destructuring-assignment-syntax';
import { rule as differentTypesComparison } from './different-types-comparison';
import { rule as disabledAutoEscaping } from './disabled-auto-escaping';
import { rule as disabledResourceIntegrity } from './disabled-resource-integrity';
import { rule as disabledTimeout } from './disabled-timeout';
import { rule as dnsPrefetching } from './dns-prefetching';
import { rule as duplicatesInCharacterClass } from './duplicates-in-character-class';
import { rule as emptyStringRepetition } from './empty-string-repetition';
import { rule as encryption } from './encryption';
import { rule as encryptionSecureMode } from './encryption-secure-mode';
import { rule as existingGroups } from './existing-groups';
import { rule as expressionComplexity } from './expression-complexity';
import { rule as fileHeader } from './file-header';
import { rule as fileNameDifferFromClass } from './file-name-differ-from-class';
import { rule as filePermissions } from './file-permissions';
import { rule as fileUploads } from './file-uploads';
import { rule as fixmeTag } from './fixme-tag';
import { rule as forIn } from './for-in';
import { rule as forLoopIncrementSign } from './for-loop-increment-sign';
import { rule as frameAncestors } from './frame-ancestors';
import { rule as functionInsideLoop } from './function-inside-loop';
import { rule as functionName } from './function-name';
import { rule as functionReturnType } from './function-return-type';
import { rule as futureReservedWords } from './future-reserved-words';
import { rule as generatorWithoutYield } from './generator-without-yield';
import { rule as hashing } from './hashing';
import { rule as hiddenFiles } from './hidden-files';
import { rule as inOperatorTypeError } from './in-operator-type-error';
import { rule as inconsistentFunctionCall } from './inconsistent-function-call';
import { rule as indexOfCompareToPositiveNumber } from './index-of-compare-to-positive-number';
import { rule as insecureCookie } from './insecure-cookie';
import { rule as insecureJwtToken } from './insecure-jwt-token';
import { rule as invertedAssertionArguments } from './inverted-assertion-arguments';
import { rule as labelPosition } from './label-position';
import { rule as linkWithTargetBlank } from './link-with-target-blank';
import { rule as maxUnionSize } from './max-union-size';
import { rule as misplacedLoopCounter } from './misplaced-loop-counter';
import { rule as nestedControlFlow } from './nested-control-flow';
import { rule as newOperatorMisuse } from './new-operator-misuse';
import { rule as noAccessorFieldMismatch } from './no-accessor-field-mismatch';
import { rule as noAlphabeticalSort } from './no-alphabetical-sort';
import { rule as noAngularBypassSanitization } from './no-angular-bypass-sanitization';
import { rule as noArrayDelete } from './no-array-delete';
import { rule as noAssociativeArrays } from './no-associative-arrays';
import { rule as noBuiltInOverride } from './no-built-in-override';
import { rule as noCaseLabelInSwitch } from './no-case-label-in-switch';
import { rule as noClearTextProtocols } from './no-clear-text-protocols';
import { rule as noCodeAfterDone } from './no-code-after-done';
import { rule as noCommentedCode } from './no-commented-code';
import { rule as noDeadStore } from './no-dead-store';
import { rule as noDeleteVar } from './no-delete-var';
import { rule as noDuplicateInComposite } from './no-duplicate-in-composite';
import { rule as noEmptyAfterReluctant } from './no-empty-after-reluctant';
import { rule as noEmptyAlternatives } from './no-empty-alternatives';
import { rule as noEmptyGroup } from './no-empty-group';
import { rule as noEqualsInForTermination } from './no-equals-in-for-termination';
import { rule as noExclusiveTests } from './no-exclusive-tests';
import { rule as noForInIterable } from './no-for-in-iterable';
import { rule as noFunctionDeclarationInBlock } from './no-function-declaration-in-block';
import { rule as noGlobalThis } from './no-global-this';
import { rule as noGlobalsShadowing } from './no-globals-shadowing';
import { rule as noHardcodedCredentials } from './no-hardcoded-credentials';
import { rule as noHardcodedIp } from './no-hardcoded-ip';
import { rule as noHookSetterInBody } from './no-hook-setter-in-body';
import { rule as noImplicitDependencies } from './no-implicit-dependencies';
import { rule as noImplicitGlobal } from './no-implicit-global';
import { rule as noInMisuse } from './no-in-misuse';
import { rule as noIncompleteAssertions } from './no-incomplete-assertions';
import { rule as noInconsistentReturns } from './no-inconsistent-returns';
import { rule as noIncorrectStringConcat } from './no-incorrect-string-concat';
import { rule as noInfiniteLoop } from './no-infinite-loop';
import { rule as noIntrusivePermissions } from './no-intrusive-permissions';
import { rule as noInvalidAwait } from './no-invalid-await';
import { rule as noInvariantReturns } from './no-invariant-returns';
import { rule as noIpForward } from './no-ip-forward';
import { rule as noLabels } from './no-labels';
import { rule as noMimeSniff } from './no-mime-sniff';
import { rule as noMisleadingArrayReverse } from './no-misleading-array-reverse';
import { rule as noMixedContent } from './no-mixed-content';
import { rule as noNestedAssignment } from './no-nested-assignment';
import { rule as noNestedConditional } from './no-nested-conditional';
import { rule as noNestedIncDec } from './no-nested-incdec';
import { rule as noNewSymbol } from './no-new-symbol';
import { rule as noOsCommandFromPath } from './no-os-command-from-path';
import { rule as noParameterReassignment } from './no-parameter-reassignment';
import { rule as noPrimitiveWrappers } from './no-primitive-wrappers';
import { rule as noRedundantAssignments } from './no-redundant-assignments';
import { rule as noRedundantOptional } from './no-redundant-optional';
import { rule as noRedundantParentheses } from './no-redundant-parentheses';
import { rule as noReferenceError } from './no-reference-error';
import { rule as noReferrerPolicy } from './no-referrer-policy';
import { rule as noRequireOrDefine } from './no-require-or-define';
import { rule as noReturnTypeAny } from './no-return-type-any';
import { rule as noSameArgumentAssert } from './no-same-argument-assert';
import { rule as noTab } from './no-tab';
import { rule as noTryPromise } from './no-try-promise';
import { rule as noUndefinedArgument } from './no-undefined-argument';
import { rule as noUndefinedAssignment } from './no-undefined-assignment';
import { rule as noUnenclosedMultilineBlock } from './no-unenclosed-multiline-block';
import { rule as noUniqKey } from './no-uniq-key';
import { rule as noUnsafeUnzip } from './no-unsafe-unzip';
import { rule as noUnthrownError } from './no-unthrown-error';
import { rule as noUnusedFunctionArgument } from './no-unused-function-argument';
import { rule as noUselessIncrement } from './no-useless-increment';
import { rule as noUselessIntersection } from './no-useless-intersection';
import { rule as noUselessReactSetstate } from './no-useless-react-setstate';
import { rule as noVariableUsageBeforeDeclaration } from './no-variable-usage-before-declaration';
import { rule as noVueBypassSanitization } from './no-vue-bypass-sanitization';
import { rule as noWeakCipher } from './no-weak-cipher';
import { rule as noWeakKeys } from './no-weak-keys';
import { rule as noWildcardImport } from './no-wildcard-import';
import { rule as nonNumberInArithmeticExpression } from './non-number-in-arithmetic-expression';
import { rule as nullDereference } from './null-dereference';
import { rule as operationReturningNan } from './operation-returning-nan';
import { rule as osCommand } from './os-command';
import { rule as postMessage } from './post-message';
import { rule as preferDefaultLast } from './prefer-default-last';
import { rule as preferPromiseShorthand } from './prefer-promise-shorthand';
import { rule as preferTypeGuard } from './prefer-type-guard';
import { rule as processArgv } from './process-argv';
import { rule as productionDebug } from './production-debug';
import { rule as pseudoRandom } from './pseudo-random';
import { rule as publiclyWrittableDirectories } from './publicly-writable-directories';
import { rule as regexComplexity } from './regex-complexity';
import { rule as regularExpr } from './regular-expr';
import { rule as rulesOfHooks } from './rules-of-hooks';
import { rule as sessionRegeneration } from './session-regeneration';
import { rule as shorthandPropertyGrouping } from './shorthand-property-grouping';
import { rule as singleCharInCharacterClasses } from './single-char-in-character-classes';
import { rule as singleCharacterAlternative } from './single-character-alternation';
import { rule as slowRegex } from './slow-regex';
import { rule as sockets } from './sockets';
import { rule as sonarBlockScopedVar } from './sonar-block-scoped-var';
import { rule as sonarJsxNoLeakedRender } from './sonar-jsx-no-leaked-render';
import { rule as sonarMaxLines } from './sonar-max-lines';
import { rule as sonarMaxLinesPerFunction } from './sonar-max-lines-per-function';
import { rule as sonarMaxParams } from './sonar-max-params';
import { rule as sonarNoControlRegex } from './sonar-no-control-regex';
import { rule as sonarNoDupeKeys } from './sonar-no-dupe-keys';
import { rule as sonarNoEmptyCharacterClass } from './sonar-no-empty-character-class';
import { rule as sonarNoFallthrough } from './sonar-no-fallthrough';
import { rule as sonarNoInvalidRegexp } from './sonar-no-invalid-regexp';
import { rule as sonarNoMisleadingCharacterClass } from './sonar-no-misleading-character-class';
import { rule as sonarNoRegexSpaces } from './sonar-no-regex-spaces';
import { rule as sonarNoUnusedClassComponentMethods } from './sonar-no-unused-class-component-methods';
import { rule as sonarNoUnusedVars } from './sonar-no-unused-vars';
import { rule as sqlQueries } from './sql-queries';
import { rule as standardInput } from './standard-input';
import { rule as statefulRegex } from './stateful-regex';
import { rule as strictTransportSecurity } from './strict-transport-security';
import { rule as stringsComparison } from './strings-comparison';
import { rule as superInvocation } from './super-invocation';
import { rule as switchWithoutDefault } from './switch-without-default';
import { rule as testCheckException } from './test-check-exception';
import { rule as todoTag } from './todo-tag';
import { rule as tooManyBreakOrContinueInLoop } from './too-many-break-or-continue-in-loop';
import { rule as unicodeAwareRegex } from './unicode-aware-regex';
import { rule as unusedImport } from './unused-import';
import { rule as unusedNamedGroups } from './unused-named-groups';
import { rule as unverifiedCertificate } from './unverified-certificate';
import { rule as unverifiedHostname } from './unverified-hostname';
import { rule as updatedConstVar } from './updated-const-var';
import { rule as updatedLoopCounter } from './updated-loop-counter';
import { rule as useTypeAlias } from './use-type-alias';
import { rule as uselessStringOperation } from './useless-string-operation';
import { rule as valuesNotConvertibleToNumbers } from './values-not-convertible-to-numbers';
import { rule as variableName } from './variable-name';
import { rule as voidUse } from './void-use';
import { rule as weakSsl } from './weak-ssl';
import { rule as webSqlDatabase } from './web-sql-database';
import { rule as xPoweredBy } from './x-powered-by';
import { rule as xmlParserXXE } from './xml-parser-xxe';
import { rule as xpath } from './xpath';

/**
 * The set of internal ESLint-based rules
 */
const rules: { [key: string]: Rule.RuleModule } = {};

/**
 * Maps ESLint rule keys declared in the JavaScript checks to rule implementations
 */
rules['anchor-precedence'] = anchorPrecedence;
rules['argument-type'] = argumentType;
rules['arguments-order'] = argumentsOrder;
rules['arguments-usage'] = argumentsUsage;
rules['array-callback-without-return'] = arrayCallBackWithoutReturn;
rules['array-constructor'] = arrayConstructor;
rules['arrow-function-convention'] = arrowFunctionConvention;
rules['assertions-in-tests'] = assertionsInTests;
rules['aws-apigateway-public-api'] = awsApigatewayPublicApi;
rules['aws-ec2-rds-dms-public'] = awsEc2RdsDmsPublic;
rules['aws-ec2-unencrypted-ebs-volume'] = awsEc2UnencryptedEbsVolume;
rules['aws-efs-unencrypted'] = awsEfsUnencrypted;
rules['aws-iam-all-privileges'] = awsIamAllPrivileges;
rules['aws-iam-all-resources-accessible'] = awsIamAllResourcesAccessible;
rules['aws-iam-privilege-escalation'] = awsIamPrivilegeEscalation;
rules['aws-iam-public-access'] = awsIamPublicAccess;
rules['aws-opensearchservice-domain'] = awsOpensearchserviceDomain;
rules['aws-rds-unencrypted-databases'] = awsRdsUnencryptedDatabases;
rules['aws-restricted-ip-admin-access'] = awsRestrictedIpAdminAccess;
rules['aws-s3-bucket-granted-access'] = awsS3BucketGrantedAccess;
rules['aws-s3-bucket-insecure-http'] = awsS3BucketInsecureHttp;
rules['aws-s3-bucket-public-access'] = awsS3BucketPublicAccess;
rules['aws-s3-bucket-server-encryption'] = awsS3BucketServerEncryption;
rules['aws-s3-bucket-versioning'] = awsS3BucketVersioning;
rules['aws-sagemaker-unencrypted-notebook'] = awsSagemakerUnencryptedNotebook;
rules['aws-sns-unencrypted-topics'] = awsSnsUnencryptedTopics;
rules['aws-sqs-unencrypted-queue'] = awsSqsUnencryptedQueue;
rules['bitwise-operators'] = bitwiseOperators;
rules['bool-param-default'] = boolParamDefault;
rules['call-argument-line'] = callArgumentLine;
rules['certificate-transparency'] = certificateTransparency;
rules['chai-determinate-assertion'] = chaiDeterminateAssertion;
rules['class-name'] = className;
rules['class-prototype'] = classPrototype;
rules['code-eval'] = codeEval;
rules['comma-or-logical-or-case'] = commaOrLogicalOrCase;
rules['comment-regex'] = commentRegex;
rules['concise-regex'] = conciseRegex;
rules['conditional-indentation'] = conditionalIndentation;
rules['confidential-information-logging'] = confidentialInformationLogging;
rules['constructor-for-side-effects'] = constructorForSideEffects;
rules['content-length'] = contentLength;
rules['content-security-policy'] = contentSecurityPolicy;
rules['cookie-no-httponly'] = cookieNoHttpOnly;
rules['cookies'] = cookies;
rules['cors'] = cors;
rules['csrf'] = csrf;
rules['cyclomatic-complexity'] = cyclomaticComplexity;
rules['declarations-in-global-scope'] = declarationsInGlobalScope;
rules['deprecation'] = deprecation;
rules['destructuring-assignment-syntax'] = destructuringAssignmentSyntax;
rules['different-types-comparison'] = differentTypesComparison;
rules['disabled-auto-escaping'] = disabledAutoEscaping;
rules['disabled-resource-integrity'] = disabledResourceIntegrity;
rules['disabled-timeout'] = disabledTimeout;
rules['dns-prefetching'] = dnsPrefetching;
rules['duplicates-in-character-class'] = duplicatesInCharacterClass;
rules['empty-string-repetition'] = emptyStringRepetition;
rules['encryption'] = encryption;
rules['encryption-secure-mode'] = encryptionSecureMode;
rules['existing-groups'] = existingGroups;
rules['expression-complexity'] = expressionComplexity;
rules['file-header'] = fileHeader;
rules['file-name-differ-from-class'] = fileNameDifferFromClass;
rules['file-permissions'] = filePermissions;
rules['file-uploads'] = fileUploads;
rules['fixme-tag'] = fixmeTag;
rules['for-in'] = forIn;
rules['for-loop-increment-sign'] = forLoopIncrementSign;
rules['frame-ancestors'] = frameAncestors;
rules['function-inside-loop'] = functionInsideLoop;
rules['function-name'] = functionName;
rules['function-return-type'] = functionReturnType;
rules['future-reserved-words'] = futureReservedWords;
rules['generator-without-yield'] = generatorWithoutYield;
rules['hashing'] = hashing;
rules['hidden-files'] = hiddenFiles;
rules['in-operator-type-error'] = inOperatorTypeError;
rules['inconsistent-function-call'] = inconsistentFunctionCall;
rules['index-of-compare-to-positive-number'] = indexOfCompareToPositiveNumber;
rules['insecure-cookie'] = insecureCookie;
rules['insecure-jwt-token'] = insecureJwtToken;
rules['inverted-assertion-arguments'] = invertedAssertionArguments;
rules['label-position'] = labelPosition;
rules['link-with-target-blank'] = linkWithTargetBlank;
rules['max-union-size'] = maxUnionSize;
rules['misplaced-loop-counter'] = misplacedLoopCounter;
rules['nested-control-flow'] = nestedControlFlow;
rules['new-operator-misuse'] = newOperatorMisuse;
rules['no-accessor-field-mismatch'] = noAccessorFieldMismatch;
rules['no-alphabetical-sort'] = noAlphabeticalSort;
rules['no-angular-bypass-sanitization'] = noAngularBypassSanitization;
rules['no-array-delete'] = noArrayDelete;
rules['no-associative-arrays'] = noAssociativeArrays;
rules['no-built-in-override'] = noBuiltInOverride;
rules['no-case-label-in-switch'] = noCaseLabelInSwitch;
rules['no-clear-text-protocols'] = noClearTextProtocols;
rules['no-code-after-done'] = noCodeAfterDone;
rules['no-commented-code'] = noCommentedCode;
rules['no-dead-store'] = noDeadStore;
rules['no-delete-var'] = noDeleteVar;
rules['no-duplicate-in-composite'] = noDuplicateInComposite;
rules['no-empty-after-reluctant'] = noEmptyAfterReluctant;
rules['no-empty-alternatives'] = noEmptyAlternatives;
rules['no-empty-group'] = noEmptyGroup;
rules['no-equals-in-for-termination'] = noEqualsInForTermination;
rules['no-exclusive-tests'] = noExclusiveTests;
rules['no-for-in-iterable'] = noForInIterable;
rules['no-function-declaration-in-block'] = noFunctionDeclarationInBlock;
rules['no-global-this'] = noGlobalThis;
rules['no-globals-shadowing'] = noGlobalsShadowing;
rules['no-hardcoded-credentials'] = noHardcodedCredentials;
rules['no-hardcoded-ip'] = noHardcodedIp;
rules['no-hook-setter-in-body'] = noHookSetterInBody;
rules['no-implicit-dependencies'] = noImplicitDependencies;
rules['no-implicit-global'] = noImplicitGlobal;
rules['no-in-misuse'] = noInMisuse;
rules['no-incomplete-assertions'] = noIncompleteAssertions;
rules['no-inconsistent-returns'] = noInconsistentReturns;
rules['no-incorrect-string-concat'] = noIncorrectStringConcat;
rules['no-infinite-loop'] = noInfiniteLoop;
rules['no-intrusive-permissions'] = noIntrusivePermissions;
rules['no-invalid-await'] = noInvalidAwait;
rules['no-invariant-returns'] = noInvariantReturns;
rules['no-ip-forward'] = noIpForward;
rules['no-labels'] = noLabels;
rules['no-mime-sniff'] = noMimeSniff;
rules['no-misleading-array-reverse'] = noMisleadingArrayReverse;
rules['no-mixed-content'] = noMixedContent;
rules['no-nested-assignment'] = noNestedAssignment;
rules['no-nested-conditional'] = noNestedConditional;
rules['no-nested-incdec'] = noNestedIncDec;
rules['no-new-symbol'] = noNewSymbol;
rules['no-os-command-from-path'] = noOsCommandFromPath;
rules['no-parameter-reassignment'] = noParameterReassignment;
rules['no-primitive-wrappers'] = noPrimitiveWrappers;
rules['no-redundant-assignments'] = noRedundantAssignments;
rules['no-redundant-optional'] = noRedundantOptional;
rules['no-redundant-parentheses'] = noRedundantParentheses;
rules['no-reference-error'] = noReferenceError;
rules['no-referrer-policy'] = noReferrerPolicy;
rules['no-require-or-define'] = noRequireOrDefine;
rules['no-return-type-any'] = noReturnTypeAny;
rules['no-same-argument-assert'] = noSameArgumentAssert;
rules['no-tab'] = noTab;
rules['no-try-promise'] = noTryPromise;
rules['no-undefined-argument'] = noUndefinedArgument;
rules['no-undefined-assignment'] = noUndefinedAssignment;
rules['no-unenclosed-multiline-block'] = noUnenclosedMultilineBlock;
rules['no-uniq-key'] = noUniqKey;
rules['no-unsafe-unzip'] = noUnsafeUnzip;
rules['no-unthrown-error'] = noUnthrownError;
rules['no-unused-function-argument'] = noUnusedFunctionArgument;
rules['no-useless-increment'] = noUselessIncrement;
rules['no-useless-intersection'] = noUselessIntersection;
rules['no-useless-react-setstate'] = noUselessReactSetstate;
rules['no-variable-usage-before-declaration'] = noVariableUsageBeforeDeclaration;
rules['no-vue-bypass-sanitization'] = noVueBypassSanitization;
rules['no-weak-cipher'] = noWeakCipher;
rules['no-weak-keys'] = noWeakKeys;
rules['no-wildcard-import'] = noWildcardImport;
rules['non-number-in-arithmetic-expression'] = nonNumberInArithmeticExpression;
rules['null-dereference'] = nullDereference;
rules['operation-returning-nan'] = operationReturningNan;
rules['os-command'] = osCommand;
rules['post-message'] = postMessage;
rules['prefer-default-last'] = preferDefaultLast;
rules['prefer-promise-shorthand'] = preferPromiseShorthand;
rules['prefer-type-guard'] = preferTypeGuard;
rules['process-argv'] = processArgv;
rules['production-debug'] = productionDebug;
rules['pseudo-random'] = pseudoRandom;
rules['publicly-writable-directories'] = publiclyWrittableDirectories;
rules['regex-complexity'] = regexComplexity;
rules['regular-expr'] = regularExpr;
rules['rules-of-hooks'] = rulesOfHooks;
rules['session-regeneration'] = sessionRegeneration;
rules['shorthand-property-grouping'] = shorthandPropertyGrouping;
rules['single-char-in-character-classes'] = singleCharInCharacterClasses;
rules['single-character-alternation'] = singleCharacterAlternative;
rules['slow-regex'] = slowRegex;
rules['sockets'] = sockets;
rules['sonar-block-scoped-var'] = sonarBlockScopedVar;
rules['sonar-jsx-no-leaked-render'] = sonarJsxNoLeakedRender;
rules['sonar-max-lines'] = sonarMaxLines;
rules['sonar-max-lines-per-function'] = sonarMaxLinesPerFunction;
rules['sonar-max-params'] = sonarMaxParams;
rules['sonar-no-control-regex'] = sonarNoControlRegex;
rules['sonar-no-dupe-keys'] = sonarNoDupeKeys;
rules['sonar-no-empty-character-class'] = sonarNoEmptyCharacterClass;
rules['sonar-no-fallthrough'] = sonarNoFallthrough;
rules['sonar-no-invalid-regexp'] = sonarNoInvalidRegexp;
rules['sonar-no-misleading-character-class'] = sonarNoMisleadingCharacterClass;
rules['sonar-no-regex-spaces'] = sonarNoRegexSpaces;
rules['sonar-no-unused-class-component-methods'] = sonarNoUnusedClassComponentMethods;
rules['sonar-no-unused-vars'] = sonarNoUnusedVars;
rules['sql-queries'] = sqlQueries;
rules['standard-input'] = standardInput;
rules['stateful-regex'] = statefulRegex;
rules['strict-transport-security'] = strictTransportSecurity;
rules['strings-comparison'] = stringsComparison;
rules['super-invocation'] = superInvocation;
rules['switch-without-default'] = switchWithoutDefault;
rules['test-check-exception'] = testCheckException;
rules['todo-tag'] = todoTag;
rules['too-many-break-or-continue-in-loop'] = tooManyBreakOrContinueInLoop;
rules['unicode-aware-regex'] = unicodeAwareRegex;
rules['unused-import'] = unusedImport;
rules['unused-named-groups'] = unusedNamedGroups;
rules['unverified-certificate'] = unverifiedCertificate;
rules['unverified-hostname'] = unverifiedHostname;
rules['updated-const-var'] = updatedConstVar;
rules['updated-loop-counter'] = updatedLoopCounter;
rules['use-type-alias'] = useTypeAlias;
rules['useless-string-operation'] = uselessStringOperation;
rules['values-not-convertible-to-numbers'] = valuesNotConvertibleToNumbers;
rules['variable-name'] = variableName;
rules['void-use'] = voidUse;
rules['weak-ssl'] = weakSsl;
rules['web-sql-database'] = webSqlDatabase;
rules['x-powered-by'] = xPoweredBy;
rules['xml-parser-xxe'] = xmlParserXXE;
rules['xpath'] = xpath;

export { rules };
