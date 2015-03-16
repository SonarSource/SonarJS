/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.checks;

import com.google.common.collect.ImmutableList;

import java.util.List;

public final class CheckList {

  public static final String REPOSITORY_KEY = "javascript";

  public static final String REPOSITORY_NAME = "SonarQube";

  public static final String SONAR_WAY_PROFILE = "Sonar way";

  private CheckList() {
  }

  public static List<Class> getChecks() {
    return ImmutableList.<Class> of(
        ParsingErrorCheck.class,
        CommentedCodeCheck.class,
        FunctionComplexityCheck.class,
        DebuggerStatementCheck.class,
        WithStatementCheck.class,
        EqEqEqCheck.class,
        CommentRegularExpressionCheck.class,
        EvalCheck.class,
        OneStatementPerLineCheck.class,
        SemicolonCheck.class,
        AlwaysUseCurlyBracesCheck.class,
        MultilineStringLiteralsCheck.class,
        SingleQuoteStringLiteralsCheck.class,
        ArrayAndObjectConstructorsCheck.class,
        BitwiseOperatorsCheck.class,
        PrimitiveWrappersCheck.class,
        ForInCheck.class,
        FunctionDeclarationsWithinBlocksCheck.class,
        TrailingCommaCheck.class,
        AssignmentWithinConditionCheck.class,
        LabelPlacementCheck.class,
        LineLengthCheck.class,
        UnreachableCodeCheck.class,
        ConditionalOperatorCheck.class,
        ParenthesesCheck.class,
        SwitchWithoutDefaultCheck.class,
        NonEmptyCaseWithoutBreakCheck.class,
        ContinueStatementCheck.class,
        HtmlCommentsCheck.class,
        EmptyBlockCheck.class,
        ElseIfWithoutElseCheck.class,
        ExcessiveParameterListCheck.class,
        CollapsibleIfStatementsCheck.class,
        ConstructorFunctionsForSideEffectsCheck.class,
        FutureReservedWordsCheck.class,
        DuplicateFunctionArgumentCheck.class,
        DuplicatePropertyNameCheck.class,
        OctalNumberCheck.class,
        StrictModeCheck.class,
        ConditionalCommentCheck.class,
        TabCharacterCheck.class,
        RedeclaredVariableCheck.class,
        RedeclaredFunctionCheck.class,
        TrailingWhitespaceCheck.class,
        TrailingCommentCheck.class,
        MissingNewlineAtEndOfFileCheck.class,
        BoundOrAssignedEvalOrArgumentsCheck.class,
        SameNameForFunctionAndVariableCheck.class,
        NamedFunctionExpressionCheck.class,
        FunctionDefinitionInsideLoopCheck.class,
        TooManyBreakOrContinueInLoopCheck.class,
        UnusedVariableCheck.class,
        UnusedFunctionArgumentCheck.class,
        VariableDeclarationAfterUsageCheck.class,
        VariableShadowingCheck.class,
        FunctionNameCheck.class,
        AlertUseCheck.class,
        FixmeTagPresenceCheck.class,
        TodoTagPresenceCheck.class,
        TooManyLinesInFileCheck.class,
        SwitchWithNotEnoughCaseCheck.class,
        IfConditionalAlwaysTrueOrFalseCheck.class,
        ReturnOfBooleanExpressionCheck.class,
        ForHidingWhileCheck.class,
        FunctionCallArgumentsOnNewLineCheck.class,
        FileHeaderCheck.class,
        TooManyLinesInFunctionCheck.class,
        CommaOperatorUseCheck.class,
        NonCaseLabelInSwitchCheck.class,
        BooleanEqualityComparisonCheck.class,
        ExpressionComplexityCheck.class,
        DuplicateConditionIfElseAndSwitchCasesCheck.class,
        DuplicateBranchImplementationCheck.class,
        IdenticalExpressionOnBinaryOperatorCheck.class,
        ConsoleLoggingCheck.class,
        NestedControlFlowDepthCheck.class,
        ComparisonWithNaNCheck.class,
        SelfAssignmentCheck.class,
        SpaceInModelPropertyNameCheck.class,
        NullDereferenceInConditionalCheck.class,
        ModelDefaultsWithArrayOrObjectCheck.class,
        ReturnInSetterCheck.class,
        UselessIncrementCheck.class,
        UndefinedShadowingCheck.class,
        ArgumentsCallerCalleeUsageCheck.class,
        ForLoopIncrementSignCheck.class);
  }

}
