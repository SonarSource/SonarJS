/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// Generated from contract.json. Reference declarations supply structural AST compatibility.
import ts = require('typescript-classic');
type ReferenceChecker = ts.TypeChecker & {
  getTypeOfPropertyOfType: (type: ts.Type, name: string) => ts.Type | undefined;
};
export type TypeChecker = Pick<
  ReferenceChecker,
  | 'getAliasedSymbol'
  | 'getApparentType'
  | 'getAwaitedType'
  | 'getBaseConstraintOfType'
  | 'getBaseTypeOfLiteralType'
  | 'getBaseTypes'
  | 'getContextualType'
  | 'getDeclaredTypeOfSymbol'
  | 'getExportsOfModule'
  | 'getFullyQualifiedName'
  | 'getIndexInfoOfType'
  | 'getIndexInfosOfType'
  | 'getIndexTypeOfType'
  | 'getNeverType'
  | 'getNonNullableType'
  | 'getPropertiesOfType'
  | 'getPropertyOfType'
  | 'getResolvedSignature'
  | 'getReturnTypeOfSignature'
  | 'getSignatureFromDeclaration'
  | 'getSignaturesOfType'
  | 'getSymbolAtLocation'
  | 'getSymbolsInScope'
  | 'getTypeArguments'
  | 'getTypeAtLocation'
  | 'getTypeFromTypeNode'
  | 'getTypeOfPropertyOfType'
  | 'getTypeOfSymbol'
  | 'getTypeOfSymbolAtLocation'
  | 'getTypePredicateOfSignature'
  | 'isArrayType'
  | 'isTupleType'
  | 'isTypeAssignableTo'
  | 'typeToString'
  | 'typeToTypeNode'
>;
export type Program = Omit<
  Pick<
    ts.Program,
    | 'getSourceFile'
    | 'getSourceFiles'
    | 'getRootFileNames'
    | 'getCompilerOptions'
    | 'getCurrentDirectory'
    | 'getProjectReferences'
    | 'getResolvedProjectReferences'
    | 'getTypeChecker'
    | 'isSourceFileDefaultLibrary'
    | 'isSourceFileFromExternalLibrary'
    | 'getSyntacticDiagnostics'
    | 'getSemanticDiagnostics'
    | 'getOptionsDiagnostics'
    | 'getGlobalDiagnostics'
    | 'getConfigFileParsingDiagnostics'
    | 'getDeclarationDiagnostics'
  >,
  'getTypeChecker'
> & {
  getTypeChecker(): TypeChecker;
};
export type BuilderProgram = Omit<
  Pick<
    ts.SemanticDiagnosticsBuilderProgram,
    'getProgram' | 'getSemanticDiagnostics' | 'getSyntacticDiagnostics' | 'getCompilerOptions'
  >,
  'getProgram'
> & {
  getProgram(): Program;
};
export type Factory = Pick<typeof ts.factory, 'createIdentifier'>;
export type System = Pick<
  ts.System,
  | 'fileExists'
  | 'readFile'
  | 'directoryExists'
  | 'getDirectories'
  | 'readDirectory'
  | 'getCurrentDirectory'
  | 'realpath'
  | 'newLine'
  | 'useCaseSensitiveFileNames'
  | 'args'
>;
export type CreateProgramOptions = Omit<ts.CreateProgramOptions, 'oldProgram'> & {
  oldProgram?: Program;
};
export interface CreateProgram {
  (options: CreateProgramOptions): Program;
  (
    rootNames: readonly string[],
    options: ts.CompilerOptions,
    host?: ts.CompilerHost,
    oldProgram?: Program,
    configFileParsingDiagnostics?: readonly ts.Diagnostic[],
    projectReferences?: readonly ts.ProjectReference[],
  ): Program;
}
export interface CreateBuilderProgram {
  (
    rootNames: readonly string[] | undefined,
    options: ts.CompilerOptions | undefined,
    host?: ts.CompilerHost,
    oldProgram?: BuilderProgram,
    configFileParsingDiagnostics?: readonly ts.Diagnostic[],
    projectReferences?: readonly ts.ProjectReference[],
  ): BuilderProgram;
  (
    program: Program,
    host?: ts.BuilderProgramHost,
    oldProgram?: BuilderProgram,
    configFileParsingDiagnostics?: readonly ts.Diagnostic[],
  ): BuilderProgram;
}
type InternalBindings = {
  CheckFlags: Readonly<Record<string, string | number>>;
  declarationNameToString: (name: ts.DeclarationName | undefined) => string;
  getContainingFunction: (node: ts.Node) => ts.SignatureDeclaration | undefined;
  getThisParameter: (signature: ts.SignatureDeclaration) => ts.ParameterDeclaration | undefined;
  hasAbstractModifier: (node: ts.Node) => boolean;
  hasSyntacticModifier: (node: ts.Node, flags: ts.ModifierFlags) => boolean;
  nodeCanBeDecorated: (
    useLegacyDecorators: boolean,
    node: ts.Node,
    parent?: ts.Node,
    grandparent?: ts.Node,
  ) => boolean;
  nodeIsMissing: (node: ts.Node | undefined) => boolean;
  nodeIsPresent: <T extends ts.Node>(node: T | undefined) => node is T;
  parameterIsThisKeyword: (parameter: ts.ParameterDeclaration) => boolean;
};
/** SDK declarations omit these pinned private operations used by the adopted converter. */
export type ReferenceCompiler = typeof ts & InternalBindings;
/** Normalized constant values are checked against constants.json by conformance tests. */
export type Constants = Pick<
  ReferenceCompiler,
  | 'CheckFlags'
  | 'DiagnosticCategory'
  | 'ElementFlags'
  | 'Extension'
  | 'FileWatcherEventKind'
  | 'IndexKind'
  | 'JSDocParsingMode'
  | 'JsxEmit'
  | 'LanguageVariant'
  | 'ModifierFlags'
  | 'ModuleDetectionKind'
  | 'ModuleKind'
  | 'ModuleResolutionKind'
  | 'NodeFlags'
  | 'ObjectFlags'
  | 'ScriptKind'
  | 'ScriptTarget'
  | 'SignatureKind'
  | 'SymbolFlags'
  | 'SyntaxKind'
  | 'TypeFlags'
  | 'TypeFormatFlags'
  | 'TypePredicateKind'
>;
/** Adopted helpers preserve reference predicates on normalized nodes. */
export type SyntaxBindings = Pick<
  ReferenceCompiler,
  | 'canHaveDecorators'
  | 'canHaveModifiers'
  | 'declarationNameToString'
  | 'displayPartsToString'
  | 'escapeLeadingUnderscores'
  | 'findAncestor'
  | 'flattenDiagnosticMessageText'
  | 'forEachChild'
  | 'getCombinedModifierFlags'
  | 'getContainingFunction'
  | 'getDecorators'
  | 'getJSDocType'
  | 'getModifiers'
  | 'getNameOfDeclaration'
  | 'getThisParameter'
  | 'hasAbstractModifier'
  | 'hasSyntacticModifier'
  | 'isArrayBindingPattern'
  | 'isArrayLiteralExpression'
  | 'isArrayTypeNode'
  | 'isArrowFunction'
  | 'isAsExpression'
  | 'isAssertionExpression'
  | 'isAwaitExpression'
  | 'isBigIntLiteral'
  | 'isBinaryExpression'
  | 'isBindingElement'
  | 'isBlock'
  | 'isBreakStatement'
  | 'isCallExpression'
  | 'isCallSignatureDeclaration'
  | 'isCaseClause'
  | 'isCaseOrDefaultClause'
  | 'isClassDeclaration'
  | 'isClassExpression'
  | 'isClassLike'
  | 'isClassStaticBlockDeclaration'
  | 'isComputedPropertyName'
  | 'isConstructSignatureDeclaration'
  | 'isConstructorDeclaration'
  | 'isConstructorTypeNode'
  | 'isContinueStatement'
  | 'isDebuggerStatement'
  | 'isDecorator'
  | 'isDeleteExpression'
  | 'isDoStatement'
  | 'isDotDotDotToken'
  | 'isElementAccessExpression'
  | 'isEmptyStatement'
  | 'isEntityName'
  | 'isEnumDeclaration'
  | 'isEnumMember'
  | 'isExportAssignment'
  | 'isExportDeclaration'
  | 'isExportSpecifier'
  | 'isExpression'
  | 'isExpressionStatement'
  | 'isExpressionWithTypeArguments'
  | 'isExternalModule'
  | 'isExternalModuleNameRelative'
  | 'isExternalModuleReference'
  | 'isForInStatement'
  | 'isForOfStatement'
  | 'isForStatement'
  | 'isFunctionDeclaration'
  | 'isFunctionExpression'
  | 'isFunctionLike'
  | 'isFunctionTypeNode'
  | 'isGetAccessorDeclaration'
  | 'isIdentifier'
  | 'isIfStatement'
  | 'isImportClause'
  | 'isImportDeclaration'
  | 'isImportEqualsDeclaration'
  | 'isImportOrExportSpecifier'
  | 'isIndexSignatureDeclaration'
  | 'isIndexedAccessTypeNode'
  | 'isInterfaceDeclaration'
  | 'isIntersectionTypeNode'
  | 'isJSDocCallbackTag'
  | 'isJSDocFunctionType'
  | 'isJSDocLink'
  | 'isJSDocLinkCode'
  | 'isJSDocLinkPlain'
  | 'isJSDocNonNullableType'
  | 'isJSDocNullableType'
  | 'isJSDocOptionalType'
  | 'isJSDocParameterTag'
  | 'isJSDocPropertyTag'
  | 'isJSDocSignature'
  | 'isJSDocTemplateTag'
  | 'isJSDocTypeExpression'
  | 'isJSDocTypedefTag'
  | 'isJSDocVariadicType'
  | 'isJsxAttribute'
  | 'isJsxElement'
  | 'isJsxExpression'
  | 'isJsxFragment'
  | 'isJsxOpeningElement'
  | 'isJsxSelfClosingElement'
  | 'isJsxSpreadAttribute'
  | 'isJsxText'
  | 'isLabeledStatement'
  | 'isLiteralTypeNode'
  | 'isMappedTypeNode'
  | 'isMethodDeclaration'
  | 'isMethodSignature'
  | 'isModuleBlock'
  | 'isModuleDeclaration'
  | 'isNamedExports'
  | 'isNamedImports'
  | 'isNamedTupleMember'
  | 'isNamespaceExport'
  | 'isNamespaceExportDeclaration'
  | 'isNamespaceImport'
  | 'isNewExpression'
  | 'isNoSubstitutionTemplateLiteral'
  | 'isNumericLiteral'
  | 'isObjectBindingPattern'
  | 'isObjectLiteralExpression'
  | 'isOmittedExpression'
  | 'isOptionalChain'
  | 'isParameter'
  | 'isParenthesizedExpression'
  | 'isParenthesizedTypeNode'
  | 'isPostfixUnaryExpression'
  | 'isPrefixUnaryExpression'
  | 'isPrivateIdentifier'
  | 'isPropertyAccessExpression'
  | 'isPropertyAssignment'
  | 'isPropertyDeclaration'
  | 'isPropertySignature'
  | 'isQualifiedName'
  | 'isRegularExpressionLiteral'
  | 'isReturnStatement'
  | 'isSatisfiesExpression'
  | 'isSetAccessorDeclaration'
  | 'isShorthandPropertyAssignment'
  | 'isSourceFile'
  | 'isSpreadAssignment'
  | 'isSpreadElement'
  | 'isStringLiteral'
  | 'isStringLiteralLike'
  | 'isSwitchStatement'
  | 'isTaggedTemplateExpression'
  | 'isTemplateHead'
  | 'isTemplateMiddle'
  | 'isTemplateTail'
  | 'isThrowStatement'
  | 'isToken'
  | 'isTokenKind'
  | 'isTryStatement'
  | 'isTypeAliasDeclaration'
  | 'isTypeAssertionExpression'
  | 'isTypeElement'
  | 'isTypeLiteralNode'
  | 'isTypeNode'
  | 'isTypeOnlyImportOrExportDeclaration'
  | 'isTypeOperatorNode'
  | 'isTypeParameterDeclaration'
  | 'isTypePredicateNode'
  | 'isTypeReferenceNode'
  | 'isUnionTypeNode'
  | 'isVariableDeclaration'
  | 'isVariableDeclarationList'
  | 'isVariableStatement'
  | 'isWhileStatement'
  | 'isWithStatement'
  | 'nodeCanBeDecorated'
  | 'nodeIsMissing'
  | 'nodeIsPresent'
  | 'parameterIsThisKeyword'
> & { factory: Factory };
export type CompilerBindings = Pick<
  typeof ts,
  | 'DiagnosticCategory'
  | 'ElementFlags'
  | 'Extension'
  | 'FileWatcherEventKind'
  | 'IndexKind'
  | 'JSDocParsingMode'
  | 'JsxEmit'
  | 'LanguageVariant'
  | 'ModifierFlags'
  | 'ModuleDetectionKind'
  | 'ModuleKind'
  | 'ModuleResolutionKind'
  | 'NodeFlags'
  | 'ObjectFlags'
  | 'ScriptKind'
  | 'ScriptTarget'
  | 'SignatureKind'
  | 'SymbolFlags'
  | 'SyntaxKind'
  | 'TypeFlags'
  | 'TypeFormatFlags'
  | 'TypePredicateKind'
  | 'canHaveDecorators'
  | 'canHaveModifiers'
  | 'convertCompilerOptionsFromJson'
  | 'createCompilerHost'
  | 'createSourceFile'
  | 'displayPartsToString'
  | 'escapeLeadingUnderscores'
  | 'findAncestor'
  | 'flattenDiagnosticMessageText'
  | 'forEachChild'
  | 'forEachLeadingCommentRange'
  | 'forEachTrailingCommentRange'
  | 'getCombinedModifierFlags'
  | 'getDecorators'
  | 'getDefaultLibFilePath'
  | 'getJSDocType'
  | 'getModifiers'
  | 'getNameOfDeclaration'
  | 'getShebang'
  | 'identifierToKeywordKind'
  | 'isArrayBindingPattern'
  | 'isArrayLiteralExpression'
  | 'isArrayTypeNode'
  | 'isArrowFunction'
  | 'isAsExpression'
  | 'isAssertionExpression'
  | 'isAwaitExpression'
  | 'isBigIntLiteral'
  | 'isBinaryExpression'
  | 'isBindingElement'
  | 'isBlock'
  | 'isBreakStatement'
  | 'isCallExpression'
  | 'isCallSignatureDeclaration'
  | 'isCaseClause'
  | 'isCaseOrDefaultClause'
  | 'isClassDeclaration'
  | 'isClassExpression'
  | 'isClassLike'
  | 'isClassStaticBlockDeclaration'
  | 'isComputedPropertyName'
  | 'isConstructSignatureDeclaration'
  | 'isConstructorDeclaration'
  | 'isConstructorTypeNode'
  | 'isContinueStatement'
  | 'isDebuggerStatement'
  | 'isDecorator'
  | 'isDeleteExpression'
  | 'isDoStatement'
  | 'isDotDotDotToken'
  | 'isElementAccessExpression'
  | 'isEmptyStatement'
  | 'isEntityName'
  | 'isEnumDeclaration'
  | 'isEnumMember'
  | 'isExportAssignment'
  | 'isExportDeclaration'
  | 'isExportSpecifier'
  | 'isExpression'
  | 'isExpressionStatement'
  | 'isExpressionWithTypeArguments'
  | 'isExternalModule'
  | 'isExternalModuleNameRelative'
  | 'isExternalModuleReference'
  | 'isForInStatement'
  | 'isForOfStatement'
  | 'isForStatement'
  | 'isFunctionDeclaration'
  | 'isFunctionExpression'
  | 'isFunctionLike'
  | 'isFunctionTypeNode'
  | 'isGetAccessorDeclaration'
  | 'isIdentifier'
  | 'isIdentifierPart'
  | 'isIdentifierStart'
  | 'isIfStatement'
  | 'isImportClause'
  | 'isImportDeclaration'
  | 'isImportEqualsDeclaration'
  | 'isImportOrExportSpecifier'
  | 'isIndexSignatureDeclaration'
  | 'isIndexedAccessTypeNode'
  | 'isInterfaceDeclaration'
  | 'isIntersectionTypeNode'
  | 'isJSDocCallbackTag'
  | 'isJSDocFunctionType'
  | 'isJSDocLink'
  | 'isJSDocLinkCode'
  | 'isJSDocLinkPlain'
  | 'isJSDocNonNullableType'
  | 'isJSDocNullableType'
  | 'isJSDocOptionalType'
  | 'isJSDocParameterTag'
  | 'isJSDocPropertyTag'
  | 'isJSDocSignature'
  | 'isJSDocTemplateTag'
  | 'isJSDocTypeExpression'
  | 'isJSDocTypedefTag'
  | 'isJSDocVariadicType'
  | 'isJsxAttribute'
  | 'isJsxElement'
  | 'isJsxExpression'
  | 'isJsxFragment'
  | 'isJsxOpeningElement'
  | 'isJsxSelfClosingElement'
  | 'isJsxSpreadAttribute'
  | 'isJsxText'
  | 'isLabeledStatement'
  | 'isLiteralTypeNode'
  | 'isMappedTypeNode'
  | 'isMethodDeclaration'
  | 'isMethodSignature'
  | 'isModuleBlock'
  | 'isModuleDeclaration'
  | 'isNamedExports'
  | 'isNamedImports'
  | 'isNamedTupleMember'
  | 'isNamespaceExport'
  | 'isNamespaceExportDeclaration'
  | 'isNamespaceImport'
  | 'isNewExpression'
  | 'isNoSubstitutionTemplateLiteral'
  | 'isNumericLiteral'
  | 'isObjectBindingPattern'
  | 'isObjectLiteralExpression'
  | 'isOmittedExpression'
  | 'isOptionalChain'
  | 'isParameter'
  | 'isParenthesizedExpression'
  | 'isParenthesizedTypeNode'
  | 'isPostfixUnaryExpression'
  | 'isPrefixUnaryExpression'
  | 'isPrivateIdentifier'
  | 'isPropertyAccessExpression'
  | 'isPropertyAssignment'
  | 'isPropertyDeclaration'
  | 'isPropertySignature'
  | 'isQualifiedName'
  | 'isRegularExpressionLiteral'
  | 'isReturnStatement'
  | 'isSatisfiesExpression'
  | 'isSetAccessorDeclaration'
  | 'isShorthandPropertyAssignment'
  | 'isSourceFile'
  | 'isSpreadAssignment'
  | 'isSpreadElement'
  | 'isStringLiteral'
  | 'isStringLiteralLike'
  | 'isSwitchStatement'
  | 'isTaggedTemplateExpression'
  | 'isTemplateHead'
  | 'isTemplateMiddle'
  | 'isTemplateTail'
  | 'isThrowStatement'
  | 'isToken'
  | 'isTokenKind'
  | 'isTryStatement'
  | 'isTypeAliasDeclaration'
  | 'isTypeAssertionExpression'
  | 'isTypeElement'
  | 'isTypeLiteralNode'
  | 'isTypeNode'
  | 'isTypeOnlyImportOrExportDeclaration'
  | 'isTypeOperatorNode'
  | 'isTypeParameterDeclaration'
  | 'isTypePredicateNode'
  | 'isTypeReferenceNode'
  | 'isUnionTypeNode'
  | 'isVariableDeclaration'
  | 'isVariableDeclarationList'
  | 'isVariableStatement'
  | 'isWhileStatement'
  | 'isWithStatement'
  | 'parseConfigFileTextToJson'
  | 'parseJsonConfigFileContent'
  | 'readConfigFile'
  | 'resolveModuleName'
  | 'tokenToString'
> & {
  factory: Factory;
  sys: System;
  createProgram: CreateProgram;
  createSemanticDiagnosticsBuilderProgram: CreateBuilderProgram;
} & { [K in 'version' | 'versionMajorMinor']: string } & InternalBindings &
  Partial<
    Pick<
      typeof ts,
      'createAbstractBuilder' | 'createWatchCompilerHost' | 'createWatchProgram' | 'server'
    >
  >;
export type Capabilities = Readonly<{ watchPrograms: boolean; projectService: boolean }>;
export interface Provider {
  compiler: CompilerBindings;
  compilerVersion: string;
  /** Retain batch programs only when their backend owns resources requiring explicit release. */
  ownsProgramResources: boolean;
  disposeProgram(program: Program): void;
  close(): void;
  timing?(): unknown;
}
export interface Metadata {
  readonly name: string;
  readonly contractVersion: 1;
  readonly compilerVersion: string;
  readonly capabilities: Capabilities;
}
export interface ObjectContracts {
  Program: Program;
  BuilderProgram: BuilderProgram;
  TypeChecker: TypeChecker;
  factory: Factory;
  sys: System;
  SourceFile: Pick<
    ts.SourceFile,
    | 'getText'
    | 'getFullText'
    | 'getStart'
    | 'getEnd'
    | 'forEachChild'
    | 'getLineAndCharacterOfPosition'
  >;
  Type: Pick<
    ts.Type,
    | 'getSymbol'
    | 'getProperties'
    | 'getProperty'
    | 'getCallSignatures'
    | 'getConstructSignatures'
    | 'getStringIndexType'
    | 'getNumberIndexType'
    | 'getBaseTypes'
    | 'getNonNullableType'
    | 'getConstraint'
    | 'isUnion'
    | 'isIntersection'
    | 'isUnionOrIntersection'
    | 'isLiteral'
    | 'isStringLiteral'
    | 'isNumberLiteral'
    | 'isTypeParameter'
  >;
  Symbol: Pick<
    ts.Symbol,
    'getName' | 'getFlags' | 'getDeclarations' | 'getDocumentationComment' | 'getJsDocTags'
  >;
  Signature: Pick<
    ts.Signature,
    | 'getDeclaration'
    | 'getTypeParameters'
    | 'getParameters'
    | 'getReturnType'
    | 'getDocumentationComment'
    | 'getJsDocTags'
  >;
}
export function defineProvider<T extends Provider>(provider: T): T;
export function assertMembers<T, K extends keyof ObjectContracts>(
  value: T,
  category: K,
): T & ObjectContracts[K];
