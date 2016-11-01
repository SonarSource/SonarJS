/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.javascript.checks;

import com.google.common.collect.ImmutableList;
import java.util.List;

public final class CheckList {

  public static final String REPOSITORY_KEY = "javascript";

  public static final String REPOSITORY_NAME = "SonarAnalyzer";

  public static final String SONAR_WAY_PROFILE = "Sonar way";

  private CheckList() {
  }

  public static List<Class> getChecks() {
    return ImmutableList.<Class>of(
      AlertUseCheck.class,
      AlwaysTrueOrFalseConditionCheck.class,
      AlwaysUseCurlyBracesCheck.class,
      ArgumentsCallerCalleeUsageCheck.class,
      ArgumentsUsageCheck.class,
      ArithmeticOperationReturningNanCheck.class,
      ArrayAndObjectConstructorsCheck.class,
      ArrowFunctionConventionCheck.class,
      AssignmentWithinConditionCheck.class,
      AssociativeArraysCheck.class,
      BackboneChangedIsUsedCheck.class,
      BitwiseOperatorsCheck.class,
      BooleanEqualityComparisonCheck.class,
      BoundOrAssignedEvalOrArgumentsCheck.class,
      BuiltInObjectOverriddenCheck.class,
      CallabilityCheck.class,
      ClassPrototypeCheck.class,
      CollapsibleIfStatementsCheck.class,
      CommaOperatorInSwitchCaseCheck.class,
      CommaOperatorUseCheck.class,
      CommentedCodeCheck.class,
      CommentRegularExpressionCheck.class,
      ComparisonWithNaNCheck.class,
      ConditionalCommentCheck.class,
      ConditionalOperatorCheck.class,
      ConsoleLoggingCheck.class,
      ConstructorFunctionsForSideEffectsCheck.class,
      ContinueStatementCheck.class,
      CounterUpdatedInLoopCheck.class,
      DeadStoreCheck.class,
      DebuggerStatementCheck.class,
      DefaultParameterSideEffectCheck.class,
      DefaultParametersNotLastCheck.class,
      DeleteArrayElementCheck.class,
      DeleteNonPropertyCheck.class,
      DeprecatedJQueryAPICheck.class,
      DestructuringAssignmentSyntaxCheck.class,
      DifferentTypesComparisonCheck.class,
      DuplicateBranchImplementationCheck.class,
      DuplicateConditionIfElseAndSwitchCasesCheck.class,
      DuplicateFunctionArgumentCheck.class,
      DuplicatePropertyNameCheck.class,
      ElementTypeSelectorCheck.class,
      ElementUsedWithClassSelectorCheck.class,
      ElseIfWithoutElseCheck.class,
      EmptyBlockCheck.class,
      EmptyStatementCheck.class,
      EqEqEqCheck.class,
      EqualInForLoopTerminationCheck.class,
      EvalCheck.class,
      ExcessiveParameterListCheck.class,
      ExpressionComplexityCheck.class,
      FileHeaderCheck.class,
      FileNameDiffersFromClassCheck.class,
      FixmeTagPresenceCheck.class,
      ForHidingWhileCheck.class,
      ForInCheck.class,
      ForLoopConditionAndUpdateCheck.class,
      ForLoopIncrementSignCheck.class,
      FunctionCallArgumentsOnNewLineCheck.class,
      FunctionComplexityCheck.class,
      FunctionConstructorCheck.class,
      FunctionDeclarationsWithinBlocksCheck.class,
      FunctionDefinitionInsideLoopCheck.class,
      FunctionNameCheck.class,
      FutureReservedWordsCheck.class,
      GeneratorWithoutYieldCheck.class,
      GlobalThisCheck.class,
      HtmlCommentsCheck.class,
      IdChildrenSelectorCheck.class,
      IdenticalExpressionOnBinaryOperatorCheck.class,
      IfConditionalAlwaysTrueOrFalseCheck.class,
      IncrementDecrementInSubExpressionCheck.class,
      IndexOfCompareToPositiveNumberCheck.class,
      JQueryVarNameConventionCheck.class,
      LabelledStatementCheck.class,
      LabelPlacementCheck.class,
      LineLengthCheck.class,
      LocalStorageCheck.class,
      MisorderedParameterListCheck.class,
      MissingNewlineAtEndOfFileCheck.class,
      ModelDefaultsWithArrayOrObjectCheck.class,
      MultilineBlockCurlyBraceCheck.class,
      MultilineStringLiteralsCheck.class,
      NamedFunctionExpressionCheck.class,
      NestedControlFlowDepthCheck.class,
      NewOperatorMisuseCheck.class,
      InconsistentFunctionCallCheck.class,
      NonCaseLabelInSwitchCheck.class,
      NonEmptyCaseWithoutBreakCheck.class,
      NonStandardImportCheck.class,
      NotStoredSelectionCheck.class,
      NullDereferenceCheck.class,
      NullDereferenceInConditionalCheck.class,
      ObjectLiteralShorthandCheck.class,
      OctalNumberCheck.class,
      OneStatementPerLineCheck.class,
      ParenthesesCheck.class,
      ParseIntCallWithoutBaseCheck.class,
      ParsingErrorCheck.class,
      PostMessageCheck.class,
      PrimitiveWrappersCheck.class,
      RedeclaredSymbolCheck.class,
      ReturnInSetterCheck.class,
      ReturnOfBooleanExpressionCheck.class,
      SelectionTestedWithoutLengthCheck.class,
      SelfAssignmentCheck.class,
      SemicolonCheck.class,
      ShorthandPropertiesNotGroupedCheck.class,
      SingleQuoteStringLiteralsCheck.class,
      SpaceInModelPropertyNameCheck.class,
      StrictModeCheck.class,
      StringConcatenatedWithNonStringCheck.class,
      StringConcatenationCheck.class,
      StringsComparisonCheck.class,
      SwitchWithNotEnoughCaseCheck.class,
      SwitchWithoutDefaultCheck.class,
      TabCharacterCheck.class,
      TodoTagPresenceCheck.class,
      TooManyArgumentsCheck.class,
      TooManyBreakOrContinueInLoopCheck.class,
      TooManyLinesInFileCheck.class,
      TooManyLinesInFunctionCheck.class,
      TrailingCommaCheck.class,
      TrailingCommentCheck.class,
      TrailingWhitespaceCheck.class,
      UnaryPlusMinusWithObjectCheck.class,
      UnchangedLetVariableCheck.class,
      UndefinedAssignmentCheck.class,
      UndefinedShadowingCheck.class,
      UniversalSelectorCheck.class,
      UnreachableCodeCheck.class,
      UntrustedContentCheck.class,
      UnusedFunctionArgumentCheck.class,
      UnusedVariableCheck.class,
      UpdatedConstVariableCheck.class,
      UselessExpressionStatementCheck.class,
      UselessIncrementCheck.class,
      UselessStringOperationCheck.class,
      UseOfEmptyReturnValueCheck.class,
      VarDeclarationCheck.class,
      VariableDeclarationAfterUsageCheck.class,
      VariableDeclarationWithoutVarCheck.class,
      VariableShadowingCheck.class,
      VoidUseCheck.class,
      WebSQLDatabaseCheck.class,
      WildcardImportCheck.class,
      WithStatementCheck.class,
      WrongScopeDeclarationCheck.class);
  }

}
