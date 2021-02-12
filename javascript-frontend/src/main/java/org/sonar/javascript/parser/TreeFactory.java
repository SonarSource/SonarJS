/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.javascript.parser;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableList.Builder;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Lists;
import com.sonar.sslr.api.typed.Optional;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.annotation.Nullable;
import org.sonar.javascript.lexer.JavaScriptKeyword;
import org.sonar.javascript.lexer.JavaScriptPunctuator;
import org.sonar.javascript.tree.impl.SeparatedListImpl;
import org.sonar.javascript.tree.impl.declaration.AccessorMethodDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ArrayBindingPatternTreeImpl;
import org.sonar.javascript.tree.impl.declaration.BindingPropertyTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ClassTreeImpl;
import org.sonar.javascript.tree.impl.declaration.DecoratorTreeImpl;
import org.sonar.javascript.tree.impl.declaration.DefaultExportDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ExportClauseTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ExportDefaultBindingImpl;
import org.sonar.javascript.tree.impl.declaration.ExportDefaultBindingWithExportListImpl;
import org.sonar.javascript.tree.impl.declaration.ExportDefaultBindingWithNameSpaceExportImpl;
import org.sonar.javascript.tree.impl.declaration.ExtendsClauseTreeImpl;
import org.sonar.javascript.tree.impl.declaration.FieldDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.FromClauseTreeImpl;
import org.sonar.javascript.tree.impl.declaration.FunctionDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ImportClauseTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ImportDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ImportModuleDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.InitializedBindingElementTreeImpl;
import org.sonar.javascript.tree.impl.declaration.MethodDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ModuleTreeImpl;
import org.sonar.javascript.tree.impl.declaration.NameSpaceExportDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.NameSpaceImportTreeImpl;
import org.sonar.javascript.tree.impl.declaration.NamedExportDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.NamedImportExportClauseTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ObjectBindingPatternTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ParameterListTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ScriptTreeImpl;
import org.sonar.javascript.tree.impl.declaration.SpecifierTreeImpl;
import org.sonar.javascript.tree.impl.expression.ArgumentListTreeImpl;
import org.sonar.javascript.tree.impl.expression.ArrayAssignmentPatternTreeImpl;
import org.sonar.javascript.tree.impl.expression.ArrayLiteralTreeImpl;
import org.sonar.javascript.tree.impl.expression.ArrowFunctionTreeImpl;
import org.sonar.javascript.tree.impl.expression.AssignmentExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.AssignmentPatternRestElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.BinaryExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.BracketMemberExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.CallExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.ComputedPropertyNameTreeImpl;
import org.sonar.javascript.tree.impl.expression.ConditionalExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.DotMemberExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.FunctionExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.IdentifierTreeImpl;
import org.sonar.javascript.tree.impl.expression.ImportTreeImpl;
import org.sonar.javascript.tree.impl.expression.InitializedAssignmentPatternElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.LiteralTreeImpl;
import org.sonar.javascript.tree.impl.expression.NewExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.NewTargetTreeImpl;
import org.sonar.javascript.tree.impl.expression.ObjectAssignmentPatternPairElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.ObjectAssignmentPatternTreeImpl;
import org.sonar.javascript.tree.impl.expression.ObjectLiteralTreeImpl;
import org.sonar.javascript.tree.impl.expression.PairPropertyTreeImpl;
import org.sonar.javascript.tree.impl.expression.ParenthesisedExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.PostfixExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.PrefixExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.RestElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.SpreadElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.SuperTreeImpl;
import org.sonar.javascript.tree.impl.expression.TaggedTemplateTreeImpl;
import org.sonar.javascript.tree.impl.expression.TemplateCharactersTreeImpl;
import org.sonar.javascript.tree.impl.expression.TemplateExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.TemplateLiteralTreeImpl;
import org.sonar.javascript.tree.impl.expression.YieldExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxClosingElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxEmptyClosingElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxEmptyOpeningElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxIdentifierTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxJavaScriptExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxOpeningElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxSelfClosingElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxShortFragmentElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxSpreadAttributeTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxStandardAttributeTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxStandardElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxTextTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowArrayTypeShorthandTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowArrayTypeWithKeywordTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowCastingExpressionTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowDeclareTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowFunctionSignatureTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowFunctionTypeParameterClauseTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowFunctionTypeParameterTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowFunctionTypeTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowGenericParameterClauseTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowGenericParameterTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowImplementsClauseTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowIndexerPropertyDefinitionKeyTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowInterfaceDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowIntersectionTypeTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowLiteralTypeTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowMethodPropertyDefinitionKeyTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowModuleExportsTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowModuleTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowNamespacedTypeTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowObjectTypeTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowOpaqueTypeTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowOptionalBindingElementTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowOptionalTypeTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowParameterizedGenericsTypeTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowParenthesisedTypeTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowPropertyDefinitionTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowSimplePropertyDefinitionKeyTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowSimpleTypeTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowTupleTypeTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowTypeAliasStatementTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowTypeAnnotationTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowTypedBindingElementTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowTypeofTypeTreeImpl;
import org.sonar.javascript.tree.impl.flow.FlowUnionTypeTreeImpl;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.tree.impl.statement.BlockTreeImpl;
import org.sonar.javascript.tree.impl.statement.BreakStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.CaseClauseTreeImpl;
import org.sonar.javascript.tree.impl.statement.CatchBlockTreeImpl;
import org.sonar.javascript.tree.impl.statement.ContinueStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.DebuggerStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.DefaultClauseTreeImpl;
import org.sonar.javascript.tree.impl.statement.DoWhileStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.ElseClauseTreeImpl;
import org.sonar.javascript.tree.impl.statement.EmptyStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.ExpressionStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.FinallyBlockTreeImpl;
import org.sonar.javascript.tree.impl.statement.ForObjectStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.ForStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.IfStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.LabelledStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.ReturnStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.SwitchStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.ThrowStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.TryStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.VariableDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.statement.VariableStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.WhileStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.WithStatementTreeImpl;
import org.sonar.plugins.javascript.api.tree.ModuleTree;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.AccessorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ArrayBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingPropertyTree;
import org.sonar.plugins.javascript.api.tree.declaration.ClassTree;
import org.sonar.plugins.javascript.api.tree.declaration.DecoratorTree;
import org.sonar.plugins.javascript.api.tree.declaration.DefaultExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBinding;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBindingWithExportList;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBindingWithNameSpaceExport;
import org.sonar.plugins.javascript.api.tree.declaration.ExtendsClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.FieldDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FromClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportModuleDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportSubClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.NameSpaceExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.NameSpaceImportTree;
import org.sonar.plugins.javascript.api.tree.declaration.NamedExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.NamedImportExportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.ObjectBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierTree;
import org.sonar.plugins.javascript.api.tree.expression.ArgumentListTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayAssignmentPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentPatternRestElementTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ComputedPropertyNameTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.ImportTree;
import org.sonar.plugins.javascript.api.tree.expression.InitializedAssignmentPatternElementTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.NewTargetTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectAssignmentPatternPairElementTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectAssignmentPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.PairPropertyTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.RestElementTree;
import org.sonar.plugins.javascript.api.tree.expression.SpreadElementTree;
import org.sonar.plugins.javascript.api.tree.expression.SuperTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateCharactersTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.YieldExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxAttributeTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxAttributeValueTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxChildTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxClosingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxElementNameTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxEmptyClosingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxEmptyOpeningElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxIdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxJavaScriptExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxOpeningElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxSelfClosingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxShortFragmentElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxSpreadAttributeTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxStandardAttributeTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxStandardElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxTextTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowArrayTypeShorthandTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowArrayTypeWithKeywordTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowCastingExpressionTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowDeclareTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionSignatureTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionTypeParameterClauseTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionTypeParameterTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowGenericParameterClauseTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowGenericParameterTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowImplementsClauseTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowIndexerPropertyDefinitionKeyTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowInterfaceDeclarationTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowIntersectionTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowLiteralTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowMethodPropertyDefinitionKeyTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowModuleExportsTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowModuleTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowNamespacedTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowObjectTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowOpaqueTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowOptionalBindingElementTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowOptionalTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowParameterizedGenericsTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowParenthesisedTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowPropertyDefinitionKeyTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowPropertyDefinitionTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowSimplePropertyDefinitionKeyTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowSimpleTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTupleTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAliasStatementTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAnnotationTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeofTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowUnionTypeTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.BreakStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.CatchBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ContinueStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.DebuggerStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.DefaultClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.EmptyStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.FinallyBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.LabelledStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ThrowStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.TryStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WithStatementTree;

public class TreeFactory {

  private static final Map<String, Kind> EXPRESSION_KIND_BY_VALUE = new HashMap<>();

  static {
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.OROR.getValue(), Kind.CONDITIONAL_OR);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.ANDAND.getValue(), Kind.CONDITIONAL_AND);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.OR.getValue(), Kind.BITWISE_OR);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.XOR.getValue(), Kind.BITWISE_XOR);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.AND.getValue(), Kind.BITWISE_AND);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.EQUAL.getValue(), Kind.EQUAL_TO);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.NOTEQUAL.getValue(), Kind.NOT_EQUAL_TO);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.EQUAL2.getValue(), Kind.STRICT_EQUAL_TO);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.NOTEQUAL2.getValue(), Kind.STRICT_NOT_EQUAL_TO);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.LT.getValue(), Kind.LESS_THAN);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.GT.getValue(), Kind.GREATER_THAN);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.LE.getValue(), Kind.LESS_THAN_OR_EQUAL_TO);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.GE.getValue(), Kind.GREATER_THAN_OR_EQUAL_TO);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.SL.getValue(), Kind.LEFT_SHIFT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.SR.getValue(), Kind.RIGHT_SHIFT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.SR2.getValue(), Kind.UNSIGNED_RIGHT_SHIFT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.PLUS.getValue(), Kind.PLUS);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.MINUS.getValue(), Kind.MINUS);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.STAR.getValue(), Kind.MULTIPLY);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.EXP.getValue(), Kind.EXPONENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.DIV.getValue(), Kind.DIVIDE);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.MOD.getValue(), Kind.REMAINDER);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.EQU.getValue(), Kind.ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.STAR_EQU.getValue(), Kind.MULTIPLY_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.EXP_EQU.getValue(), Kind.EXPONENT_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.DIV_EQU.getValue(), Kind.DIVIDE_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.MOD_EQU.getValue(), Kind.REMAINDER_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.PLUS_EQU.getValue(), Kind.PLUS_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.MINUS_EQU.getValue(), Kind.MINUS_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.SL_EQU.getValue(), Kind.LEFT_SHIFT_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.SR_EQU.getValue(), Kind.RIGHT_SHIFT_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.SR_EQU2.getValue(), Kind.UNSIGNED_RIGHT_SHIFT_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.AND_EQU.getValue(), Kind.AND_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.XOR_EQU.getValue(), Kind.XOR_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.OR_EQU.getValue(), Kind.OR_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.COMMA.getValue(), Kind.COMMA_OPERATOR);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptKeyword.INSTANCEOF.getValue(), Kind.INSTANCE_OF);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptKeyword.IN.getValue(), Kind.RELATIONAL_IN);
  }

  private static final Map<String, Kind> PREFIX_KIND_BY_VALUE = ImmutableMap.<String, Tree.Kind>builder()
    .put(JavaScriptPunctuator.INC.getValue(), Kind.PREFIX_INCREMENT)
    .put(JavaScriptPunctuator.DEC.getValue(), Kind.PREFIX_DECREMENT)
    .put(JavaScriptPunctuator.PLUS.getValue(), Kind.UNARY_PLUS)
    .put(JavaScriptPunctuator.MINUS.getValue(), Kind.UNARY_MINUS)
    .put(JavaScriptPunctuator.TILDA.getValue(), Kind.BITWISE_COMPLEMENT)
    .put(JavaScriptPunctuator.BANG.getValue(), Kind.LOGICAL_COMPLEMENT)
    .put(JavaScriptKeyword.DELETE.getValue(), Kind.DELETE)
    .put(JavaScriptKeyword.VOID.getValue(), Kind.VOID)
    .put(JavaScriptKeyword.TYPEOF.getValue(), Kind.TYPEOF)
    .put(JavaScriptKeyword.AWAIT.getValue(), Kind.AWAIT)
    .build();

  private static Kind getBinaryOperator(InternalSyntaxToken token) {
    Kind kind = EXPRESSION_KIND_BY_VALUE.get(token.text());
    if (kind == null) {
      throw new IllegalArgumentException("Mapping not found for binary operator " + token.text());
    }
    return kind;
  }

  private static Kind getPrefixOperator(InternalSyntaxToken token) {
    Kind kind = PREFIX_KIND_BY_VALUE.get(token.text());
    if (kind == null) {
      throw new IllegalArgumentException("Mapping not found for unary operator " + token.text());
    }
    return kind;
  }

  // Statements

  public EmptyStatementTree emptyStatement(InternalSyntaxToken semicolon) {
    return new EmptyStatementTreeImpl(semicolon);
  }

  public DebuggerStatementTree debuggerStatement(InternalSyntaxToken debuggerWord, Tree semicolonToken) {
    return new DebuggerStatementTreeImpl(debuggerWord, nullableSemicolonToken(semicolonToken));
  }

  public VariableStatementTree variableStatement(VariableDeclarationTree declaration, Tree semicolonToken) {
    return new VariableStatementTreeImpl(declaration, nullableSemicolonToken(semicolonToken));
  }

  private static VariableDeclarationTree variableDeclaration(InternalSyntaxToken token, SeparatedList<BindingElementTree> variables) {
    Kind kind;
    if (token.is(JavaScriptKeyword.VAR)) {
      kind = Kind.VAR_DECLARATION;

    } else if ("let".equals(token.text())) {
      kind = Kind.LET_DECLARATION;

    } else if (token.is(JavaScriptKeyword.CONST)) {
      kind = Kind.CONST_DECLARATION;

    } else {
      throw new UnsupportedOperationException("Unsupported token, " + token.text());
    }
    return new VariableDeclarationTreeImpl(kind, token, variables);
  }

  public VariableDeclarationTree variableDeclaration1(InternalSyntaxToken token, SeparatedList<BindingElementTree> variables) {
    return variableDeclaration(token, variables);
  }

  private static SeparatedList<BindingElementTree> bindingElementList(BindingElementTree element, Optional<List<Tuple<InternalSyntaxToken, BindingElementTree>>> rest) {

    ImmutableList.Builder<BindingElementTree> elements = ImmutableList.builder();
    ImmutableList.Builder<InternalSyntaxToken> commas = ImmutableList.builder();

    elements.add(element);

    if (rest.isPresent()) {
      for (Tuple<InternalSyntaxToken, BindingElementTree> pair : rest.get()) {
        InternalSyntaxToken commaToken = pair.first();

        commas.add(commaToken);
        elements.add(pair.second());
      }
    }

    return new SeparatedListImpl<>(elements.build(), commas.build());
  }

  public SeparatedList<BindingElementTree> bindingElementList1(BindingElementTree element, Optional<List<Tuple<InternalSyntaxToken, BindingElementTree>>> rest) {
    return bindingElementList(element, rest);
  }

  public LabelledStatementTree labelledStatement(InternalSyntaxToken labelToken, InternalSyntaxToken colon, StatementTree statement) {
    return new LabelledStatementTreeImpl(labelToken, colon, statement);
  }

  public ContinueStatementTree continueWithLabel(InternalSyntaxToken continueToken, InternalSyntaxToken labelToken, Tree semicolonToken) {
    return new ContinueStatementTreeImpl(continueToken, labelToken, nullableSemicolonToken(semicolonToken));
  }

  public ContinueStatementTree continueWithoutLabel(InternalSyntaxToken continueToken, Tree semicolonToken) {
    return new ContinueStatementTreeImpl(continueToken, null, nullableSemicolonToken(semicolonToken));
  }

  public BreakStatementTree breakWithLabel(InternalSyntaxToken breakToken, InternalSyntaxToken labelToken, Tree semicolonToken) {
    return new BreakStatementTreeImpl(breakToken, labelToken, nullableSemicolonToken(semicolonToken));
  }

  public BreakStatementTree breakWithoutLabel(InternalSyntaxToken breakToken, Tree semicolonToken) {
    return new BreakStatementTreeImpl(breakToken, null, nullableSemicolonToken(semicolonToken));
  }

  public ReturnStatementTree returnWithExpression(InternalSyntaxToken returnToken, ExpressionTree expression, Tree semicolonToken) {
    return new ReturnStatementTreeImpl(returnToken, expression, nullableSemicolonToken(semicolonToken));
  }

  public ReturnStatementTree returnWithoutExpression(InternalSyntaxToken returnToken, Tree semicolonToken) {
    return new ReturnStatementTreeImpl(returnToken, null, nullableSemicolonToken(semicolonToken));
  }

  public ThrowStatementTree newThrowStatement(InternalSyntaxToken throwToken, ExpressionTree expression, Tree semicolonToken) {
    return new ThrowStatementTreeImpl(throwToken, expression, nullableSemicolonToken(semicolonToken));
  }

  public WithStatementTree newWithStatement(
    InternalSyntaxToken withToken, InternalSyntaxToken openingParen,
    ExpressionTree expression, InternalSyntaxToken closingParen, StatementTree statement
  ) {
    return new WithStatementTreeImpl(withToken, openingParen, expression, closingParen, statement);
  }

  public BlockTree newBlock(InternalSyntaxToken openingCurlyBrace, Optional<List<StatementTree>> statements, InternalSyntaxToken closingCurlyBrace) {
    if (statements.isPresent()) {
      return new BlockTreeImpl(openingCurlyBrace, statements.get(), closingCurlyBrace);
    }
    return new BlockTreeImpl(openingCurlyBrace, closingCurlyBrace);
  }

  public FinallyBlockTree finallyBlock(InternalSyntaxToken finallyKeyword, BlockTree finallyBlock) {
    return new FinallyBlockTreeImpl(finallyKeyword, finallyBlock);
  }

  public TryStatementTree tryStatementWithoutCatch(InternalSyntaxToken tryToken, BlockTree block, FinallyBlockTree finallyBlockTree) {
    return new TryStatementTreeImpl(tryToken, block, null, finallyBlockTree);
  }

  public TryStatementTree tryStatementWithCatch(InternalSyntaxToken tryToken, BlockTree block, CatchBlockTree catchBlock, Optional<FinallyBlockTree> finallyBlockTree) {
    return new TryStatementTreeImpl(tryToken, block, catchBlock, finallyBlockTree.orNull());
  }

  public CatchBlockTree newCatchBlock(
    InternalSyntaxToken catchToken, InternalSyntaxToken lparenToken,
    BindingElementTree catchParameter, InternalSyntaxToken rparenToken, BlockTree block
  ) {
    return new CatchBlockTreeImpl(
      catchToken,
      lparenToken,
      catchParameter,
      rparenToken,
      block);
  }

  public SwitchStatementTree switchStatement(
    InternalSyntaxToken switchToken, InternalSyntaxToken openParenthesis, ExpressionTree expression, InternalSyntaxToken closeParenthesis,
    InternalSyntaxToken openCurly, Optional<List<SwitchClauseTree>> switchCases, InternalSyntaxToken closeCurly
  ) {

    return new SwitchStatementTreeImpl(
      switchToken,
      openParenthesis,
      expression,
      closeParenthesis,
      openCurly,
      switchCases.or(ImmutableList.of()),
      closeCurly);
  }

  public List<SwitchClauseTree> switchCases(Optional<List<SwitchClauseTree>> switchCases) {
    return switchCases.or(ImmutableList.of());
  }

  public DefaultClauseTree defaultClause(InternalSyntaxToken defaultToken, InternalSyntaxToken colonToken, Optional<List<StatementTree>> statements) {
    if (statements.isPresent()) {
      return new DefaultClauseTreeImpl(defaultToken, colonToken, statements.get());
    }
    return new DefaultClauseTreeImpl(defaultToken, colonToken);
  }

  public CaseClauseTree caseClause(InternalSyntaxToken caseToken, ExpressionTree expression, InternalSyntaxToken colonToken, Optional<List<StatementTree>> statements) {
    if (statements.isPresent()) {
      return new CaseClauseTreeImpl(caseToken, expression, colonToken, statements.get());
    }
    return new CaseClauseTreeImpl(caseToken, expression, colonToken);
  }

  public ElseClauseTree elseClause(InternalSyntaxToken elseToken, StatementTree statement) {
    return new ElseClauseTreeImpl(elseToken, statement);
  }

  public IfStatementTree ifStatement(
    InternalSyntaxToken ifToken, InternalSyntaxToken openParenToken, ExpressionTree condition,
    InternalSyntaxToken closeParenToken, StatementTree statement, Optional<ElseClauseTree> elseClause
  ) {
    if (elseClause.isPresent()) {
      return new IfStatementTreeImpl(
        ifToken,
        openParenToken,
        condition,
        closeParenToken,
        statement,
        elseClause.get());
    }
    return new IfStatementTreeImpl(
      ifToken,
      openParenToken,
      condition,
      closeParenToken,
      statement);
  }

  public WhileStatementTree whileStatement(
    InternalSyntaxToken whileToken, InternalSyntaxToken openParenthesis,
    ExpressionTree condition, InternalSyntaxToken closeParenthesis, StatementTree statetment
  ) {
    return new WhileStatementTreeImpl(
      whileToken,
      openParenthesis,
      condition,
      closeParenthesis,
      statetment);
  }

  public DoWhileStatementTree doWhileStatement(
    InternalSyntaxToken doToken, StatementTree statement, InternalSyntaxToken whileToken,
    InternalSyntaxToken openParenthesis, ExpressionTree condition, InternalSyntaxToken closeParenthesis, Tree semicolonToken
  ) {
    return new DoWhileStatementTreeImpl(
      doToken,
      statement,
      whileToken,
      openParenthesis,
      condition,
      closeParenthesis,
      nullableSemicolonToken(semicolonToken));
  }

  public ExpressionStatementTree expressionStatement(ExpressionTree expression, Tree semicolonToken) {
    return new ExpressionStatementTreeImpl(expression, nullableSemicolonToken(semicolonToken));
  }

  @Nullable
  private static InternalSyntaxToken nullableSemicolonToken(Tree semicolonToken) {
    if (semicolonToken instanceof InternalSyntaxToken) {
      return (InternalSyntaxToken) semicolonToken;
    } else {
      return null;
    }
  }

  public ForObjectStatementTree forOfStatement(
    InternalSyntaxToken forToken, Optional<InternalSyntaxToken> awaitToken, InternalSyntaxToken openParenthesis, Tree variableOrExpression, InternalSyntaxToken ofToken,
    ExpressionTree expression, InternalSyntaxToken closeParenthesis, StatementTree statement
  ) {
    return new ForObjectStatementTreeImpl(
      forToken,
      awaitToken.orNull(),
      openParenthesis,
      variableOrExpression,
      ofToken,
      expression, closeParenthesis,
      statement);
  }

  public ForObjectStatementTree forInStatement(
    InternalSyntaxToken forToken, InternalSyntaxToken openParenthesis, Tree variableOrExpression, InternalSyntaxToken inToken,
    ExpressionTree expression, InternalSyntaxToken closeParenthesis, StatementTree statement
  ) {

    return new ForObjectStatementTreeImpl(
      forToken,
      null,
      openParenthesis,
      variableOrExpression,
      inToken,
      expression, closeParenthesis,
      statement);
  }

  public ForStatementTree forStatement(
    InternalSyntaxToken forToken, InternalSyntaxToken openParenthesis, Optional<Tree> init, InternalSyntaxToken firstSemiToken,
    Optional<ExpressionTree> condition, InternalSyntaxToken secondSemiToken, Optional<ExpressionTree> update,
    InternalSyntaxToken closeParenthesis, StatementTree statement
  ) {
    return new ForStatementTreeImpl(
      forToken,
      openParenthesis,
      init.orNull(),
      firstSemiToken,
      condition.orNull(),
      secondSemiToken,
      update.orNull(),
      closeParenthesis,
      statement);
  }

  // End of statements

  // Expressions

  /**
   * From ECMAScript 6 draft:
   * <blockquote>
   * Whenever a comma in the element list is not preceded by an AssignmentExpression i.e., a comma at the beginning
   * or after another comma), the missing array element contributes to the length of the Array and increases the
   * index of subsequent elements.
   * </blockquote>
   */
  public List<Tree> arrayLiteralElements(
    Optional<List<InternalSyntaxToken>> commaTokens, ExpressionTree element,
    Optional<List<Tuple<List<InternalSyntaxToken>, ExpressionTree>>> restElements,
    Optional<List<InternalSyntaxToken>> restCommas
  ) {
    List<Tree> elementsAndCommas = Lists.newArrayList();

    // Elided array element at the beginning, e.g [ ,a]
    if (commaTokens.isPresent()) {
      elementsAndCommas.addAll(commaTokens.get());
    }

    // First element
    elementsAndCommas.add(element);

    // Other elements
    if (restElements.isPresent()) {
      for (Tuple<List<InternalSyntaxToken>, ExpressionTree> t : restElements.get()) {
        elementsAndCommas.addAll(t.first());
        elementsAndCommas.add(t.second());
      }
    }

    // Trailing comma and/or elided array element at the end, e.g resp [ a ,] / [ a , ,]
    if (restCommas.isPresent()) {
      elementsAndCommas.addAll(restCommas.get());
    }

    return elementsAndCommas;
  }

  public ArrayLiteralTree arrayLiteral(InternalSyntaxToken openBracketToken, Optional<List<Tree>> elements, InternalSyntaxToken closeBracket) {
    return new ArrayLiteralTreeImpl(openBracketToken, elements.or(ImmutableList.of()), closeBracket);
  }

  // End of expressions

  public FunctionExpressionTree generatorExpression(
    InternalSyntaxToken functionKeyword, InternalSyntaxToken starOperator,
    Optional<IdentifierTree> functionName,
    Optional<FlowGenericParameterClauseTree> genericParameterClause,
    ParameterListTree parameters, Optional<FlowTypeAnnotationTree> returnType, BlockTree body
  ) {

    return FunctionExpressionTreeImpl.createGenerator(functionKeyword, starOperator, functionName.orNull(), genericParameterClause.orNull(), parameters, returnType.orNull(), body);
  }

  public LiteralTree nullLiteral(InternalSyntaxToken nullToken) {
    return new LiteralTreeImpl(Kind.NULL_LITERAL, nullToken);
  }

  public List<Tree> tokenList(List<InternalSyntaxToken> list) {
    return new ArrayList<>(list);
  }

  public LiteralTree booleanLiteral(InternalSyntaxToken trueFalseToken) {
    return new LiteralTreeImpl(Kind.BOOLEAN_LITERAL, trueFalseToken);
  }

  public LiteralTree numericLiteral(InternalSyntaxToken numericToken) {
    return new LiteralTreeImpl(Kind.NUMERIC_LITERAL, numericToken);
  }

  public LiteralTree stringLiteral(InternalSyntaxToken stringToken) {
    return new LiteralTreeImpl(Kind.STRING_LITERAL, stringToken);
  }

  public LiteralTree regexpLiteral(InternalSyntaxToken regexpToken) {
    return new LiteralTreeImpl(Kind.REGULAR_EXPRESSION_LITERAL, regexpToken);
  }

  public FunctionExpressionTree functionExpression(
    Optional<InternalSyntaxToken> asyncToken, InternalSyntaxToken functionKeyword, Optional<IdentifierTree> functionName,
    Optional<FlowGenericParameterClauseTree> genericParameterClause,
    ParameterListTree parameters, Optional<FlowTypeAnnotationTree> returnType, BlockTree body
  ) {
    return FunctionExpressionTreeImpl.create(asyncToken.orNull(), functionKeyword, functionName.orNull(), genericParameterClause.orNull(), parameters, returnType.orNull(), body);
  }

  public ParameterListTree formalParameterClause1(
    InternalSyntaxToken lParenthesis,
    SeparatedList<BindingElementTree> parameters,
    Optional<InternalSyntaxToken> trailingComma,
    InternalSyntaxToken rParenthesis
  ) {
    if (trailingComma.isPresent()) {
      parameters.getSeparators().add(trailingComma.get());
    }
    return new ParameterListTreeImpl(lParenthesis, parameters, rParenthesis);
  }

  public ParameterListTree formalParameterClause2(
    InternalSyntaxToken lParenthesis,
    SeparatedList<BindingElementTree> parameters,
    InternalSyntaxToken comma,
    RestElementTree restElementTree,
    InternalSyntaxToken rParenthesis
  ) {
    parameters.getSeparators().add(comma);
    parameters.add(restElementTree);

    return new ParameterListTreeImpl(lParenthesis, parameters, rParenthesis);
  }

  public ParameterListTree formalParameterClause3(InternalSyntaxToken lParenthesis, Optional<RestElementTree> restElementTree, InternalSyntaxToken rParenthesis) {
    if (restElementTree.isPresent()) {
      return new ParameterListTreeImpl(lParenthesis, parameterList(restElementTree.get(), Optional.absent()), rParenthesis);
    }
    return new ParameterListTreeImpl(lParenthesis, SeparatedListImpl.emptyImmutableList(), rParenthesis);
  }

  public RestElementTree bindingRestElement(InternalSyntaxToken ellipsis, BindingElementTree bindingElement, Optional<FlowTypeAnnotationTree> type) {
    if (type.isPresent()) {
      return new RestElementTreeImpl(ellipsis, new FlowTypedBindingElementTreeImpl(bindingElement, type.get()));

    } else {
      return new RestElementTreeImpl(ellipsis, bindingElement);
    }
  }

  public ExpressionTree optionalConditionalExpression(ExpressionTree conditionExpression, Optional<ConditionalExpressionTail> conditionalExpressionTail) {
    if (conditionalExpressionTail.isPresent()) {
      ConditionalExpressionTail tail = conditionalExpressionTail.get();
      return new ConditionalExpressionTreeImpl(conditionExpression, tail.queryToken, tail.trueExpr, tail.colonToken, tail.falseExpr);
    } else {
      return conditionExpression;
    }
  }

  public ExpressionTree newConditionalOr(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newConditionalAnd(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newBitwiseOr(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newBitwiseXor(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newBitwiseAnd(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newEquality(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newRelational(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newShift(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newAdditive(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newMultiplicative(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newExponentiation(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    if (!operatorAndOperands.isPresent()) {
      return expression;
    }

    List<Tuple<InternalSyntaxToken, ExpressionTree>> list = operatorAndOperands.get();
    ExpressionTree result = list.get(list.size() - 1).second;

    for (int i = list.size() - 1; i > 0; i--) {
      result = new BinaryExpressionTreeImpl(
        Kind.EXPONENT,
        list.get(i - 1).second,
        list.get(i).first,
        result);
    }

    return new BinaryExpressionTreeImpl(
      Kind.EXPONENT,
      expression,
      list.get(0).first,
      result);
  }

  private static ExpressionTree buildBinaryExpression(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    if (!operatorAndOperands.isPresent()) {
      return expression;
    }

    ExpressionTree result = expression;

    for (Tuple<InternalSyntaxToken, ExpressionTree> t : operatorAndOperands.get()) {
      result = new BinaryExpressionTreeImpl(
        getBinaryOperator(t.first()),
        result,
        t.first(),
        t.second());
    }
    return result;
  }

  public ExpressionTree prefixExpression(InternalSyntaxToken operator, ExpressionTree expression) {
    return new PrefixExpressionTreeImpl(getPrefixOperator(operator), operator, expression);
  }

  public ExpressionTree postfixExpression(ExpressionTree expression, Optional<Tuple<InternalSyntaxToken, InternalSyntaxToken>> operatorNoLB) {
    if (!operatorNoLB.isPresent()) {
      return expression;
    }
    Kind kind = operatorNoLB.get().second().is(JavaScriptPunctuator.INC) ? Kind.POSTFIX_INCREMENT : Kind.POSTFIX_DECREMENT;
    return new PostfixExpressionTreeImpl(kind, expression, operatorNoLB.get().second());
  }

  public IdentifierTree identifierReference(InternalSyntaxToken identifier) {
    return new IdentifierTreeImpl(Kind.IDENTIFIER_REFERENCE, identifier);
  }

  public IdentifierTree bindingIdentifier(InternalSyntaxToken identifier) {
    return new IdentifierTreeImpl(Kind.BINDING_IDENTIFIER, identifier);
  }

  public ArrowFunctionTree arrowFunction(
    Optional<InternalSyntaxToken> asyncToken, Optional<FlowGenericParameterClauseTree> genericParameterClause, Tree parameters,
    Optional<FlowTypeAnnotationTree> returnType,  Tree spacingNoLB, InternalSyntaxToken doubleArrow, Tree body
  ) {
    return new ArrowFunctionTreeImpl(asyncToken.orNull(), genericParameterClause.orNull(), parameters, returnType.orNull(), doubleArrow, body);
  }

  public IdentifierTree identifierName(InternalSyntaxToken identifier) {
    return new IdentifierTreeImpl(Kind.PROPERTY_IDENTIFIER, identifier);
  }

  public SuperTree superExpression(InternalSyntaxToken superToken) {
    return new SuperTreeImpl(superToken);
  }

  public ImportTree importExpression(InternalSyntaxToken importToken) {
    return new ImportTreeImpl(importToken);
  }

  public NewTargetTree newTarget(SyntaxToken newKeyword, SyntaxToken dot, SyntaxToken target) {
    return new NewTargetTreeImpl(newKeyword, dot, target);
  }

  public ExpressionTree memberExpression(ExpressionTree object, Optional<List<ExpressionTail>> tails) {
    return tailedExpression(object, tails);
  }

  public <T> SeparatedList<T> parameterListWithTrailingComma(
    T parameter,
    Optional<List<Tuple<InternalSyntaxToken, T>>> restParameters,
    Optional<InternalSyntaxToken> trailingComma
  ) {
    List<T> parameters = Lists.newArrayList();
    List<InternalSyntaxToken> commas = Lists.newArrayList();

    parameters.add(parameter);

    if (restParameters.isPresent()) {
      for (Tuple<InternalSyntaxToken, T> t : restParameters.get()) {
        commas.add(t.first());
        parameters.add(t.second());
      }
    }

    if (trailingComma.isPresent()) {
      commas.add(trailingComma.get());
    }
    return new SeparatedListImpl<>(parameters, commas);
  }

  public ArgumentListTree argumentClause(InternalSyntaxToken openParenToken, Optional<SeparatedList<ExpressionTree>> arguments, InternalSyntaxToken closeParenToken) {
    return new ArgumentListTreeImpl(
      openParenToken,
      arguments.isPresent() ? arguments.get() : new SeparatedListImpl<>(Collections.emptyList(), Collections.emptyList()),
      closeParenToken);
  }

  public CallExpressionTree simpleCallExpression(ExpressionTree expression, ArgumentListTree arguments) {
    return new CallExpressionTreeImpl(expression, arguments);
  }

  public ExpressionTree callExpression(CallExpressionTree callExpression, Optional<List<ExpressionTail>> tails) {
    return tailedExpression(callExpression, tails);
  }

  private static ExpressionTree tailedExpression(ExpressionTree mainExpression, Optional<List<ExpressionTail>> tails) {
    if (!tails.isPresent()) {
      return mainExpression;
    }

    ExpressionTree result = mainExpression;

    for (ExpressionTail tail : tails.get()) {
      if (tail instanceof BracketAccessTail) {
        BracketAccessTail bracketAccessTail = (BracketAccessTail) tail;
        result = new BracketMemberExpressionTreeImpl(result, bracketAccessTail.lBracket, bracketAccessTail.expressionTree, bracketAccessTail.rBracket);

      } else if (tail instanceof DotAccessTail) {
        DotAccessTail dotAccessTail = (DotAccessTail) tail;
        result = new DotMemberExpressionTreeImpl(result, dotAccessTail.dot, dotAccessTail.identifierTree);

      } else if (tail instanceof TemplateLiteralTail) {
        result = new TaggedTemplateTreeImpl(result, ((TemplateLiteralTail) tail).templateLiteralTree);

      } else {
        result = new CallExpressionTreeImpl(result, ((ArgumentsTail) tail).argumentClause);
      }
    }
    return result;
  }

  public ParenthesisedExpressionTree parenthesisedExpression(InternalSyntaxToken openParenToken, ExpressionTree expression, InternalSyntaxToken closeParenToken) {
    return new ParenthesisedExpressionTreeImpl(openParenToken, expression, closeParenToken);
  }

  public ClassTree classExpression(
    Optional<List<DecoratorTree>> decorators, InternalSyntaxToken classToken, Optional<IdentifierTree> name,
    Optional<FlowGenericParameterClauseTree> genericParameterClause, Optional<ExtendsClauseTree> extendsClause, Optional<FlowImplementsClauseTree> implementsClause,
    InternalSyntaxToken openCurlyBraceToken, Optional<List<Tree>> members, InternalSyntaxToken closeCurlyBraceToken
  ) {

    List<Tree> elements = Lists.newArrayList();

    if (members.isPresent()) {
      for (Tree member : members.get()) {
        elements.add(member);
      }
    }

    return ClassTreeImpl.newClassExpression(
      optionalList(decorators),
      classToken, name.orNull(),
      genericParameterClause.orNull(),
      extendsClause.orNull(),
      implementsClause.orNull(),
      openCurlyBraceToken,
      elements,
      closeCurlyBraceToken);
  }

  public ComputedPropertyNameTree computedPropertyName(InternalSyntaxToken openBracketToken, ExpressionTree expression, InternalSyntaxToken closeBracketToken) {
    return new ComputedPropertyNameTreeImpl(openBracketToken, expression, closeBracketToken);
  }

  public PairPropertyTree pairProperty(Tree name, InternalSyntaxToken colonToken, ExpressionTree value) {
    return new PairPropertyTreeImpl(name, colonToken, value);
  }

  public SpreadElementTree spreadElement(InternalSyntaxToken ellipsis, ExpressionTree expression) {
    return new SpreadElementTreeImpl(ellipsis, expression);
  }

  public SeparatedList<Tree> properties(Tree property, Optional<List<Tuple<InternalSyntaxToken, Tree>>> restProperties, Optional<InternalSyntaxToken> trailingComma) {
    List<InternalSyntaxToken> commas = Lists.newArrayList();
    List<Tree> properties = Lists.newArrayList();

    properties.add(property);

    if (restProperties.isPresent()) {
      for (Tuple<InternalSyntaxToken, Tree> t : restProperties.get()) {
        commas.add(t.first());

        properties.add(t.second());
      }
    }

    if (trailingComma.isPresent()) {
      commas.add(trailingComma.get());
    }

    return new SeparatedListImpl(properties, commas);
  }

  public ObjectLiteralTree objectLiteral(InternalSyntaxToken openCurlyToken, Optional<SeparatedList<Tree>> properties, InternalSyntaxToken closeCurlyToken) {
    return new ObjectLiteralTreeImpl(openCurlyToken, properties.or(new SeparatedListImpl<>(ImmutableList.of(), ImmutableList.of())), closeCurlyToken);
  }

  public NewExpressionTree newExpressionWithArgument(InternalSyntaxToken newToken, ExpressionTree expression, ArgumentListTree arguments) {
    return new NewExpressionTreeImpl(
      expression.is(Kind.SUPER) ? Kind.NEW_SUPER : Kind.NEW_EXPRESSION,
      newToken,
      expression,
      arguments);
  }

  public ExpressionTree newExpression(InternalSyntaxToken newToken, ExpressionTree expression) {
    return new NewExpressionTreeImpl(
      expression.is(Kind.SUPER) ? Kind.NEW_SUPER : Kind.NEW_EXPRESSION,
      newToken,
      expression);
  }

  public TemplateLiteralTree noSubstitutionTemplate(
    InternalSyntaxToken openBacktickToken,
    Optional<TemplateCharactersTree> templateCharacters,
    InternalSyntaxToken closeBacktickToken
  ) {
    return new TemplateLiteralTreeImpl(
      openBacktickToken,
      templateCharacters.isPresent() ? Collections.<Tree>singletonList(templateCharacters.get()) : Collections.<Tree>emptyList(),
      closeBacktickToken);
  }

  public TemplateExpressionTree templateExpression(
    InternalSyntaxToken dollar, InternalSyntaxToken openCurlyBrace,
    ExpressionTree expression, InternalSyntaxToken closeCurlyBrace
  ) {
    return new TemplateExpressionTreeImpl(dollar, openCurlyBrace, expression, closeCurlyBrace);
  }

  public TemplateLiteralTree substitutionTemplate(
    InternalSyntaxToken openBacktick, Optional<TemplateCharactersTree> firstCharacters,
    Optional<List<Tuple<TemplateExpressionTree, Optional<TemplateCharactersTree>>>> list, InternalSyntaxToken closeBacktick
  ) {
    List<Tree> elements = new ArrayList<>();

    if (firstCharacters.isPresent()) {
      elements.add(firstCharacters.get());
    }

    if (list.isPresent()) {
      for (Tuple<TemplateExpressionTree, Optional<TemplateCharactersTree>> tuple : list.get()) {
        elements.add(tuple.first());
        if (tuple.second().isPresent()) {
          elements.add(tuple.second().get());
        }
      }
    }

    return new TemplateLiteralTreeImpl(openBacktick, elements, closeBacktick);
  }

  public TemplateCharactersTree templateCharacters(List<InternalSyntaxToken> characters) {
    List<InternalSyntaxToken> characterTokens = new ArrayList<>();
    for (InternalSyntaxToken character : characters) {
      characterTokens.add(character);
    }
    return new TemplateCharactersTreeImpl(characterTokens);
  }

  public IdentifierTree thisExpression(InternalSyntaxToken thisKeyword) {
    return new IdentifierTreeImpl(Kind.THIS, thisKeyword);
  }

  public InternalSyntaxToken labelToken(Tree spacing, InternalSyntaxToken labelToken) {
    return labelToken;
  }

  public ExpressionTree assignmentExpression(ExpressionTree variable, InternalSyntaxToken operator, ExpressionTree expression) {
    return commonAssignmentExpression(variable, operator, expression);
  }

  public ExpressionTree assignmentWithArrayDestructuring(ExpressionTree variable, InternalSyntaxToken operator, ExpressionTree expression) {
    return commonAssignmentExpression(variable, operator, expression);
  }

  private static ExpressionTree commonAssignmentExpression(ExpressionTree variable, InternalSyntaxToken operator, ExpressionTree expression) {
    return new AssignmentExpressionTreeImpl(EXPRESSION_KIND_BY_VALUE.get(operator.text()), variable, operator, expression);
  }

  public ExpressionTree expression(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree expressionNoLineBreak(Tree spacingNoLineBreak, ExpressionTree expression) {
    return expression;
  }

  public FromClauseTree fromClause(InternalSyntaxToken fromToken, LiteralTree module) {
    return new FromClauseTreeImpl(fromToken, module);
  }

  public DefaultExportDeclarationTree defaultExportDeclaration(
    Optional<List<DecoratorTree>> decorators, InternalSyntaxToken exportToken, InternalSyntaxToken defaultToken, Object declaration) {

    Tree deducedDeclaration;
    InternalSyntaxToken eos = null;
    if (declaration instanceof Tuple) {
      deducedDeclaration = (Tree) ((Tuple) declaration).first();
      eos = nullableSemicolonToken((Tree) ((Tuple) declaration).second());
    } else {
      deducedDeclaration = (Tree) declaration;
    }

    return new DefaultExportDeclarationTreeImpl(
      decorators.or(ImmutableList.of()),
      exportToken,
      defaultToken,
      deducedDeclaration,
      eos);
  }

  public NamedExportDeclarationTree namedExportDeclaration(Optional<List<DecoratorTree>> decorators, InternalSyntaxToken exportToken, Tree object) {
    return new NamedExportDeclarationTreeImpl(decorators.or(ImmutableList.of()), exportToken, object);
  }

  public SpecifierTree exportSpecifier(IdentifierTree name1, InternalSyntaxToken asToken, IdentifierTree name2) {
    return new SpecifierTreeImpl(Kind.EXPORT_SPECIFIER, null, name1, asToken, name2);
  }

  public SpecifierTree exportSpecifier(IdentifierTree name) {
    return new SpecifierTreeImpl(Kind.EXPORT_SPECIFIER, null, name);
  }

  public SeparatedList<SpecifierTree> exportListBody(
    SpecifierTree specifier, Optional<List<Tuple<InternalSyntaxToken, SpecifierTree>>> restSpecifier,
    Optional<InternalSyntaxToken> trailingComma
  ) {
    List<InternalSyntaxToken> commas = Lists.newArrayList();
    List<SpecifierTree> specifiers = Lists.newArrayList();

    specifiers.add(specifier);

    if (restSpecifier.isPresent()) {
      for (Tuple<InternalSyntaxToken, SpecifierTree> t : restSpecifier.get()) {
        commas.add(t.first());
        specifiers.add(t.second());
      }
    }

    if (trailingComma.isPresent()) {
      commas.add(trailingComma.get());
    }

    return new SeparatedListImpl(specifiers, commas);
  }

  public NamedImportExportClauseTree exportList(
    InternalSyntaxToken openCurlyBraceToken,
    Optional<SeparatedList<SpecifierTree>> specifierList,
    InternalSyntaxToken closeCurlyBraceToken
  ) {
    return new NamedImportExportClauseTreeImpl(
      Kind.EXPORT_LIST,
      openCurlyBraceToken,
      specifierList.or(new SeparatedListImpl<>(ImmutableList.of(), ImmutableList.of())), closeCurlyBraceToken);
  }

  public NameSpaceExportDeclarationTree namespaceExportDeclaration(
    InternalSyntaxToken exportToken, Optional<InternalSyntaxToken> flowTypeKeywordToken, InternalSyntaxToken starToken,
    Optional<Tuple<InternalSyntaxToken, IdentifierTree>> nameSpaceExport, FromClauseTree fromClause, Tree semicolonToken
  ) {
    InternalSyntaxToken asToken = null;
    IdentifierTree synonymIdentifier = null;
    if (nameSpaceExport.isPresent()) {
      asToken = nameSpaceExport.get().first;
      synonymIdentifier = nameSpaceExport.get().second;
    }
    return new NameSpaceExportDeclarationTreeImpl(
      exportToken,
      flowTypeKeywordToken.orNull(),
      starToken, asToken, synonymIdentifier,
      fromClause, nullableSemicolonToken(semicolonToken));
  }

  public ExportClauseTree exportClause(
    Optional<InternalSyntaxToken> flowTypeKeywordToken,
    NamedImportExportClauseTree exportList, Optional<FromClauseTree> fromClause, Tree semicolonToken
  ) {
    return new ExportClauseTreeImpl(flowTypeKeywordToken.orNull(), exportList, fromClause.orNull(), nullableSemicolonToken(semicolonToken));
  }

  public ExportDefaultBinding exportDefaultBinding(IdentifierTree identifierTree, FromClauseTree fromClauseTree, Tree semicolonToken) {
    return new ExportDefaultBindingImpl(identifierTree, fromClauseTree, nullableSemicolonToken(semicolonToken));
  }

  public ExportDefaultBindingWithNameSpaceExport exportDefaultBindingWithNameSpaceExport(
    IdentifierTree identifierTree, InternalSyntaxToken commaToken, InternalSyntaxToken starToken, InternalSyntaxToken asToken, IdentifierTree synonymIdentifier,
    FromClauseTree fromClause, Tree semicolon
  ) {
    return new ExportDefaultBindingWithNameSpaceExportImpl(
      identifierTree,
      commaToken,
      starToken,
      asToken,
      synonymIdentifier,
      fromClause,
      nullableSemicolonToken(semicolon));
  }

  public ExportDefaultBindingWithExportList exportDefaultBindingWithExportList(
    IdentifierTree identifierTree, InternalSyntaxToken commaToken, NamedImportExportClauseTree namedImportsTree,
    FromClauseTree fromClauseTree, Tree semicolon
  ) {
    return new ExportDefaultBindingWithExportListImpl(
      identifierTree,
      commaToken,
      namedImportsTree,
      fromClauseTree,
      nullableSemicolonToken(semicolon));
  }

  public ImportModuleDeclarationTree importModuleDeclaration(InternalSyntaxToken importToken, LiteralTree moduleName, Tree semicolonToken) {
    return new ImportModuleDeclarationTreeImpl(importToken, moduleName, nullableSemicolonToken(semicolonToken));
  }

  public SpecifierTree importSpecifier(IdentifierTree name, InternalSyntaxToken asToken, IdentifierTree identifier) {
    return new SpecifierTreeImpl(Kind.IMPORT_SPECIFIER, null, name, asToken, identifier);
  }

  public SpecifierTree importSpecifier(IdentifierTree name) {
    return new SpecifierTreeImpl(Kind.IMPORT_SPECIFIER, null, name);
  }

  public SpecifierTree importSpecifier(InternalSyntaxToken typeToken, IdentifierTree name, InternalSyntaxToken asToken, IdentifierTree identifier) {
    return new SpecifierTreeImpl(Kind.IMPORT_SPECIFIER, typeToken, name, asToken, identifier);
  }

  public SpecifierTree importSpecifier(InternalSyntaxToken typeToken, IdentifierTree name) {
    return new SpecifierTreeImpl(Kind.IMPORT_SPECIFIER, typeToken, name);
  }

  public SeparatedList<SpecifierTree> newImportSpecifierList(
    SpecifierTree specifier, Optional<List<Tuple<InternalSyntaxToken, SpecifierTree>>> restSpecifier,
    Optional<InternalSyntaxToken> trailingComma
  ) {
    List<InternalSyntaxToken> commas = Lists.newArrayList();
    List<SpecifierTree> specifiers = Lists.newArrayList();

    specifiers.add(specifier);

    if (restSpecifier.isPresent()) {
      for (Tuple<InternalSyntaxToken, SpecifierTree> t : restSpecifier.get()) {
        commas.add(t.first());
        specifiers.add(t.second());
      }
    }

    if (trailingComma.isPresent()) {
      commas.add(trailingComma.get());
    }

    return new SeparatedListImpl(specifiers, commas);
  }

  public NamedImportExportClauseTree namedImports(
    InternalSyntaxToken openCurlyBraceToken,
    Optional<SeparatedList<SpecifierTree>> specifierList,
    InternalSyntaxToken closeCurlyBraceToken
  ) {
    return new NamedImportExportClauseTreeImpl(
      Kind.NAMED_IMPORTS,
      openCurlyBraceToken,
      specifierList.or(new SeparatedListImpl(ImmutableList.of(), ImmutableList.of())), closeCurlyBraceToken);
  }

  public NameSpaceImportTree nameSpaceImport(InternalSyntaxToken starToken, InternalSyntaxToken asToken, IdentifierTree localName) {
    return new NameSpaceImportTreeImpl(starToken, asToken, localName);
  }

  public ImportClauseTree importClauseWithTwoParts(IdentifierTree identifierTree, InternalSyntaxToken commaToken, ImportSubClauseTree secondSubClause) {
    return new ImportClauseTreeImpl(identifierTree, commaToken, secondSubClause);
  }

  public ImportClauseTree importClause(ImportSubClauseTree firstSubClause) {
    return new ImportClauseTreeImpl(firstSubClause);
  }

  public ImportDeclarationTree importDeclaration(InternalSyntaxToken importToken, ImportClauseTree importClause, FromClauseTree fromClause, Tree semicolonToken) {
    return new ImportDeclarationTreeImpl(importToken, null, importClause, fromClause, nullableSemicolonToken(semicolonToken));
  }

  public ImportDeclarationTree importDeclaration(
    InternalSyntaxToken importToken,
    InternalSyntaxToken typeToken,
    ImportClauseTree importClause,
    FromClauseTree fromClause,
    Tree semicolonToken
  ) {
    return new ImportDeclarationTreeImpl(importToken, typeToken, importClause, fromClause, nullableSemicolonToken(semicolonToken));
  }

  public ModuleTree module(List<Tree> items) {
    return new ModuleTreeImpl(items);
  }

  // [START] Classes, methods, functions & generators

  public ClassTree classDeclaration(
    Optional<List<DecoratorTree>> decorators, InternalSyntaxToken classToken, IdentifierTree name,
    Optional<FlowGenericParameterClauseTree> genericParameterClause,
    Optional<ExtendsClauseTree> extendsClause, Optional<FlowImplementsClauseTree> implementsClause,
    InternalSyntaxToken openCurlyBraceToken, Optional<List<Tree>> members, InternalSyntaxToken closeCurlyBraceToken
  ) {

    List<Tree> elements = Lists.newArrayList();

    if (members.isPresent()) {
      for (Tree member : members.get()) {
        elements.add(member);
      }
    }
    return ClassTreeImpl.newClassDeclaration(
      optionalList(decorators), classToken, name,
      genericParameterClause.orNull(),
      extendsClause.orNull(),
      implementsClause.orNull(),
      openCurlyBraceToken,
      elements,
      closeCurlyBraceToken);
  }

  public MethodDeclarationTree generatorMethod(
    Optional<List<DecoratorTree>> decorators, Optional<InternalSyntaxToken> staticToken, InternalSyntaxToken starToken,
    Tree name, Optional<FlowGenericParameterClauseTree> genericParameterClause, ParameterListTree parameters, Optional<FlowTypeAnnotationTree> returnType,
    BlockTree body
  ) {
    return MethodDeclarationTreeImpl.generator(optionalList(decorators), staticToken.orNull(), starToken, name, genericParameterClause.orNull(), parameters, returnType.orNull(), body);
  }

  public MethodDeclarationTree method(
    Optional<List<DecoratorTree>> decorators, Optional<InternalSyntaxToken> staticToken, Optional<InternalSyntaxToken> asyncToken, Tree name,
    Optional<FlowGenericParameterClauseTree> genericParameterClause, ParameterListTree parameters,
    Optional<FlowTypeAnnotationTree> returnType, BlockTree body
  ) {
    return MethodDeclarationTreeImpl.method(optionalList(decorators), staticToken.orNull(), asyncToken.orNull(), name, genericParameterClause.orNull(), parameters, returnType.orNull(), body);
  }

  public AccessorMethodDeclarationTree accessor(
    Optional<List<DecoratorTree>> decorators, Optional<InternalSyntaxToken> staticToken, InternalSyntaxToken accessorToken, Tree name,
    Optional<FlowGenericParameterClauseTree> genericParameterClause, ParameterListTree parameters, Optional<FlowTypeAnnotationTree> returnType,
    BlockTree body
  ) {

    return new AccessorMethodDeclarationTreeImpl(optionalList(decorators), staticToken.orNull(), accessorToken, name, genericParameterClause.orNull(), parameters, returnType.orNull(), body);
  }

  public FunctionDeclarationTree functionAndGeneratorDeclaration(
    Optional<InternalSyntaxToken> asyncToken, InternalSyntaxToken functionToken, Optional<InternalSyntaxToken> starToken,
    IdentifierTree name, Optional<FlowGenericParameterClauseTree> genericParameterClause, ParameterListTree parameters, Optional<FlowTypeAnnotationTree> returnType, BlockTree body
  ) {

    return starToken.isPresent() ?
      FunctionDeclarationTreeImpl.createGenerator(functionToken, starToken.get(), name, genericParameterClause.orNull(), parameters, returnType.orNull(), body) :
      FunctionDeclarationTreeImpl.create(asyncToken.orNull(), functionToken, name, genericParameterClause.orNull(), parameters, returnType.orNull(), body);
  }

  // [START] Destructuring pattern

  public InitializedBindingElementTree initializedBindingElement(BindingElementTree left, InternalSyntaxToken equalToken, ExpressionTree expression) {
    return new InitializedBindingElementTreeImpl(left, equalToken, expression);
  }

  public BindingPropertyTree bindingProperty(Tree propertyName, InternalSyntaxToken colonToken, BindingElementTree bindingElement) {
    return new BindingPropertyTreeImpl(propertyName, colonToken, bindingElement);
  }

  public RestElementTree restObjectBindingElement(InternalSyntaxToken ellipsis, BindingElementTree bindingElement) {
    return new RestElementTreeImpl(ellipsis, bindingElement);
  }

  public SeparatedList<BindingElementTree> bindingPropertyList(
    BindingElementTree bindingProperty,
    Optional<List<Tuple<InternalSyntaxToken, BindingElementTree>>> restProperties
  ) {
    List<BindingElementTree> properties = Lists.newArrayList();
    List<InternalSyntaxToken> commas = Lists.newArrayList();

    properties.add(bindingProperty);

    if (restProperties.isPresent()) {
      for (Tuple<InternalSyntaxToken, BindingElementTree> tuple : restProperties.get()) {
        // Comma
        commas.add(tuple.first());

        // Property
        properties.add(tuple.second());
      }
    }

    return new SeparatedListImpl<>(properties, commas);
  }

  public ObjectBindingPatternTree objectBindingPattern(
    InternalSyntaxToken lCurlyBrace,
    Optional<SeparatedList<BindingElementTree>> list,
    Optional<Tuple<InternalSyntaxToken, RestElementTree>> commaAndRest,
    Optional<InternalSyntaxToken> trailingComma,
    InternalSyntaxToken rCurlyBrace
  ) {

    SeparatedList<BindingElementTree> elements;

    if (list.isPresent()) {
      elements = list.get();
    } else {
      elements = new SeparatedListImpl<>(new ArrayList<BindingElementTree>(), new ArrayList<InternalSyntaxToken>());
    }

    if (commaAndRest.isPresent()) {
      elements.getSeparators().add(commaAndRest.get().first);
      elements.add(commaAndRest.get().second);
    }
    if (trailingComma.isPresent()) {
      elements.getSeparators().add(trailingComma.get());
    }

    return new ObjectBindingPatternTreeImpl(
      lCurlyBrace,
      elements,
      rCurlyBrace);
  }

  public ObjectBindingPatternTree objectBindingPattern2(InternalSyntaxToken lCurlyBrace, RestElementTree rest,
                                                        Optional<InternalSyntaxToken> trailingComma,
                                                        InternalSyntaxToken rCurlyBrace) {
    List<InternalSyntaxToken> separators = trailingComma.isPresent() ?
        ImmutableList.of(trailingComma.get()) : ImmutableList.of();
    SeparatedListImpl<BindingElementTree> elements = new SeparatedListImpl<>(ImmutableList.of(rest), separators);
    return new ObjectBindingPatternTreeImpl(lCurlyBrace, elements, rCurlyBrace);
  }

  public ArrayBindingPatternTree arrayBindingPattern(
    InternalSyntaxToken openBracketToken,
    Optional<BindingElementTree> firstElement,
    Optional<List<Tuple<InternalSyntaxToken, Optional<BindingElementTree>>>> optionalElements,
    Optional<BindingElementTree> restElement,
    InternalSyntaxToken closeBracketToken
  ) {
    return new ArrayBindingPatternTreeImpl(
      openBracketToken,
      getSeparatedListOfOptional(firstElement, optionalElements, restElement),
      closeBracketToken);
  }

  public ArrayAssignmentPatternTree arrayAssignmentPattern(
    InternalSyntaxToken openBracketToken,
    Optional<Tree> firstElement,
    Optional<List<Tuple<InternalSyntaxToken, Optional<Tree>>>> optionalElements,
    Optional<Tree> restElement,
    InternalSyntaxToken closeBracketToken
  ) {
    return new ArrayAssignmentPatternTreeImpl(
      openBracketToken,
      getSeparatedListOfOptional(firstElement, optionalElements, restElement),
      closeBracketToken);
  }

  private static <T extends Tree> SeparatedList<java.util.Optional<T>> getSeparatedListOfOptional(
    Optional<T> firstElement,
    Optional<List<Tuple<InternalSyntaxToken, Optional<T>>>> optionalElements,
    Optional<T> restElement
  ) {

    ImmutableList.Builder<java.util.Optional<T>> elements = ImmutableList.builder();
    ImmutableList.Builder<InternalSyntaxToken> separators = ImmutableList.builder();

    boolean skipComma = false;

    if (firstElement.isPresent()) {
      elements.add(convertOptional(firstElement));
      skipComma = true;
    }

    if (optionalElements.isPresent()) {
      List<Tuple<InternalSyntaxToken, Optional<T>>> list = optionalElements.get();
      for (Tuple<InternalSyntaxToken, Optional<T>> pair : list) {
        if (!skipComma) {
          elements.add(java.util.Optional.empty());
        }

        InternalSyntaxToken commaToken = pair.first();
        separators.add(commaToken);

        if (pair.second().isPresent()) {
          elements.add(convertOptional(pair.second()));
          skipComma = true;
        } else {
          skipComma = false;
        }
      }
    }

    if (restElement.isPresent()) {
      elements.add(convertOptional(restElement));
    }

    return new SeparatedListImpl<>(elements.build(), separators.build());
  }

  private static <T extends Tree> java.util.Optional<T> convertOptional(Optional<T> optional) {
    if (optional.isPresent()) {
      return java.util.Optional.of(optional.get());
    } else {
      return java.util.Optional.empty();
    }
  }

  public ExpressionTree assignmentNoCurly(Tree lookahead, ExpressionTree expression) {
    return expression;
  }

  public ExpressionTree skipLookahead(Tree lookahead, ExpressionTree expression) {
    return expression;
  }

  public ExpressionTree skipLookaheadAfter(ExpressionTree expression, Tree lookahead) {
    return expression;
  }

  // [END] Destructuring pattern

  // [END] Classes, methods, functions & generators

  public ScriptTree script(Optional<InternalSyntaxToken> shebangToken, Optional<ModuleTree> items, Tree spacing, InternalSyntaxToken eof) {
    return new ScriptTreeImpl(
      shebangToken.isPresent() ? shebangToken.get() : null,
      items.isPresent() ? items.get() : null,
      eof);
  }

  public ExpressionTree defaultExportExpression(Tree lookahead, ExpressionTree expression) {
    return expression;
  }

  // [START] JSX

  public JsxSelfClosingElementTree jsxSelfClosingElement(
    InternalSyntaxToken ltToken,
    JsxElementNameTree jsxElementNameTree,
    Optional<List<JsxAttributeTree>> attributes,
    InternalSyntaxToken divToken, InternalSyntaxToken gtToken
  ) {
    return new JsxSelfClosingElementTreeImpl(ltToken, jsxElementNameTree, optionalList(attributes), divToken, gtToken);
  }

  public JsxStandardElementTree jsxStandardElement(
    JsxOpeningElementTree jsxOpeningElementTree,
    Optional<List<JsxChildTree>> children,
    JsxClosingElementTree jsxClosingElementTree
  ) {
    return new JsxStandardElementTreeImpl(jsxOpeningElementTree, optionalList(children), jsxClosingElementTree);
  }

  public JsxShortFragmentElementTree jsxShortFragmentElement(
    JsxEmptyOpeningElementTree jsxOpeningElementTree,
    Optional<List<JsxChildTree>> children,
    JsxEmptyClosingElementTree jsxClosingElementTree
  ) {
    return new JsxShortFragmentElementTreeImpl(jsxOpeningElementTree, optionalList(children), jsxClosingElementTree);
  }

  public JsxOpeningElementTree jsxOpeningElement(
    InternalSyntaxToken ltToken,
    JsxElementNameTree jsxElementNameTree,
    Optional<List<JsxAttributeTree>> attributes,
    InternalSyntaxToken gtToken
  ) {
    return new JsxOpeningElementTreeImpl(
      ltToken,
      jsxElementNameTree,
      optionalList(attributes),
      gtToken);
  }

  public JsxClosingElementTree jsxClosingElement(InternalSyntaxToken ltToken, InternalSyntaxToken divToken, JsxElementNameTree jsxElementNameTree, InternalSyntaxToken gtToken) {
    return new JsxClosingElementTreeImpl(ltToken, divToken, jsxElementNameTree, gtToken);
  }

  public JsxEmptyOpeningElementTree jsxEmptyOpeningElement(InternalSyntaxToken ltToken, InternalSyntaxToken gtToken) {
    return new JsxEmptyOpeningElementTreeImpl(ltToken, gtToken);
  }

  public JsxEmptyClosingElementTree jsxEmptyClosingElement(InternalSyntaxToken ltToken, InternalSyntaxToken divToken, InternalSyntaxToken gtToken) {
    return new JsxEmptyClosingElementTreeImpl(ltToken, divToken, gtToken);
  }

  public JsxJavaScriptExpressionTree jsxJavaScriptExpression(InternalSyntaxToken lCurlyBraceToken, Optional<ExpressionTree> expression, InternalSyntaxToken rCurlyBraceToken) {
    return new JsxJavaScriptExpressionTreeImpl(lCurlyBraceToken, expression.orNull(), rCurlyBraceToken);
  }

  public JsxJavaScriptExpressionTree jsxJavaScriptExpression(InternalSyntaxToken lCurlyBraceToken, ExpressionTree expression, InternalSyntaxToken rCurlyBraceToken) {
    return new JsxJavaScriptExpressionTreeImpl(lCurlyBraceToken, expression, rCurlyBraceToken);
  }

  public JsxStandardAttributeTree jsxStandardAttribute(JsxIdentifierTree name, InternalSyntaxToken equalToken, JsxAttributeValueTree jsxAttributeValueTree) {
    return new JsxStandardAttributeTreeImpl(name, equalToken, jsxAttributeValueTree);
  }

  public JsxSpreadAttributeTree jsxSpreadAttribute(
    InternalSyntaxToken lCurlyBraceToken,
    InternalSyntaxToken ellipsisToken,
    ExpressionTree expressionTree,
    InternalSyntaxToken rCurlyBraceToken
  ) {
    return new JsxSpreadAttributeTreeImpl(lCurlyBraceToken, ellipsisToken, expressionTree, rCurlyBraceToken);
  }

  public JsxTextTree jsxTextTree(InternalSyntaxToken token) {
    return new JsxTextTreeImpl(token);
  }

  public JsxIdentifierTree jsxIdentifier(InternalSyntaxToken identifierToken) {
    return new JsxIdentifierTreeImpl(identifierToken);
  }

  public JsxIdentifierTree jsxHtmlTag(InternalSyntaxToken htmlTagToken) {
    return new JsxIdentifierTreeImpl(htmlTagToken);
  }

  public ExpressionTree jsxMemberExpression(IdentifierTree identifierTree, List<Tuple<InternalSyntaxToken, IdentifierTree>> rest) {
    ExpressionTree currentObject = identifierTree;
    for (Tuple<InternalSyntaxToken, IdentifierTree> tuple : rest) {
      currentObject = new DotMemberExpressionTreeImpl(currentObject, tuple.first, tuple.second);
    }

    return currentObject;
  }

  public FieldDeclarationTree fieldDeclaration(
    Optional<List<DecoratorTree>> decorators, Optional<InternalSyntaxToken> staticToken, Tree propertyName, Optional<FlowTypeAnnotationTree> typeAnnotation,
    Optional<Tuple<InternalSyntaxToken, ExpressionTree>> initializer,
    Tree semicolonToken
  ) {
    if (initializer.isPresent()) {
      return new FieldDeclarationTreeImpl(
        optionalList(decorators),
        staticToken.orNull(),
        propertyName,
        typeAnnotation.orNull(),
        initializer.get().first,
        initializer.get().second,
        nullableSemicolonToken(semicolonToken));
    }

    return new FieldDeclarationTreeImpl(optionalList(decorators), staticToken.orNull(), propertyName, typeAnnotation.orNull(), null, null, nullableSemicolonToken(semicolonToken));
  }

  public DecoratorTree decorator(
    InternalSyntaxToken atToken, IdentifierTree name,
    Optional<List<Tuple<InternalSyntaxToken, IdentifierTree>>> rest, Optional<ArgumentListTree> arguments
  ) {
    Builder<IdentifierTree> listBuilder = ImmutableList.builder();
    Builder<InternalSyntaxToken> dotsListBuilder = ImmutableList.builder();
    listBuilder.add(name);

    for (Tuple<InternalSyntaxToken, IdentifierTree> tuple : rest.or(new ArrayList<>())) {
      dotsListBuilder.add(tuple.first);
      listBuilder.add(tuple.second);
    }

    SeparatedListImpl<IdentifierTree> body = new SeparatedListImpl<>(listBuilder.build(), dotsListBuilder.build());

    return new DecoratorTreeImpl(atToken, body, arguments.orNull());
  }

  public AssignmentPatternRestElementTree assignmentPatternRestElement(InternalSyntaxToken ellipsisToken, ExpressionTree rest) {
    return new AssignmentPatternRestElementTreeImpl(ellipsisToken, rest);
  }

  public InitializedAssignmentPatternElementTree initializedAssignmentPatternElement(ExpressionTree expression, InternalSyntaxToken equal, ExpressionTree initValue) {
    return new InitializedAssignmentPatternElementTreeImpl(expression, equal, initValue);
  }

  public ObjectAssignmentPatternPairElementTree objectAssignmentPatternPairElement(IdentifierTree identifierName, InternalSyntaxToken colonToken, Tree rhs) {
    return new ObjectAssignmentPatternPairElementTreeImpl(identifierName, colonToken, rhs);
  }

  public ObjectAssignmentPatternTree emptyObjectAssignmentPattern(InternalSyntaxToken lBrace, InternalSyntaxToken rBrace) {
    return new ObjectAssignmentPatternTreeImpl(lBrace, new SeparatedListImpl<>(new ArrayList<>(), new ArrayList<>()), rBrace);
  }

  public ObjectAssignmentPatternTree objectAssignmentPattern(
    InternalSyntaxToken lBrace,
    Tree firstProperty,
    Optional<List<Tuple<InternalSyntaxToken, Tree>>> properties,
    Optional<InternalSyntaxToken> comma,
    InternalSyntaxToken rBrace
  ) {
    ArrayList<Tree> propertyList = new ArrayList<>();
    ArrayList<InternalSyntaxToken> separators = new ArrayList<>();

    propertyList.add(firstProperty);

    for (Tuple<InternalSyntaxToken, Tree> tuple : properties.or(new ArrayList<>())) {
      separators.add(tuple.first);
      propertyList.add(tuple.second);
    }

    if (comma.isPresent()) {
      separators.add(comma.get());
    }

    return new ObjectAssignmentPatternTreeImpl(lBrace, new SeparatedListImpl<>(propertyList, separators), rBrace);
  }

  public YieldExpressionTree yieldExpression(InternalSyntaxToken yieldToken, Optional<Tuple<InternalSyntaxToken, Tuple<Optional<InternalSyntaxToken>, ExpressionTree>>> optional) {
    InternalSyntaxToken starToken = null;
    ExpressionTree expressionTree = null;

    if (optional.isPresent()) {
      starToken = optional.get().second.first.orNull();
      expressionTree = optional.get().second.second;
    }
    return new YieldExpressionTreeImpl(yieldToken, starToken, expressionTree);
  }

  public ConditionalExpressionTail conditionalExpressionTail(InternalSyntaxToken queryToken, ExpressionTree trueExpr, InternalSyntaxToken colonToken, ExpressionTree falseExpr) {
    return new ConditionalExpressionTail(queryToken, trueExpr, colonToken, falseExpr);
  }

  public BracketAccessTail newBracketAccess(InternalSyntaxToken lBracket, ExpressionTree expression, InternalSyntaxToken rBracket) {
    return new BracketAccessTail(lBracket, expression, rBracket);
  }

  public ArgumentsTail argumentClauseTail(ArgumentListTree argumentListTree) {
    return new ArgumentsTail(argumentListTree);
  }

  public DotAccessTail dotAccess(InternalSyntaxToken dotToken, IdentifierTree identifierTree) {
    return new DotAccessTail(dotToken, identifierTree);
  }

  public TemplateLiteralTail templateLiteralTailForMember(TemplateLiteralTree templateLiteralTree) {
    return new TemplateLiteralTail(templateLiteralTree);
  }

  public TemplateLiteralTail templateLiteralTailForCall(TemplateLiteralTree templateLiteralTree) {
    return new TemplateLiteralTail(templateLiteralTree);
  }

  public ExtendsClauseTree extendsClause(InternalSyntaxToken extendsToken, Tree superClass) {
    return new ExtendsClauseTreeImpl(extendsToken, superClass);
  }

  public ScriptTree vueScript(Optional<List<VueElement>> vueElements, Tree noSpacing, InternalSyntaxToken eofToken) {
    if (vueElements.isPresent()) {
      for (VueElement vueElement : vueElements.get()) {
        if (vueElement instanceof ScriptVueElement) {
          ScriptVueElement scriptVueElement = (ScriptVueElement) vueElement;
          return new ScriptTreeImpl(scriptVueElement.shebang, scriptVueElement.moduleTree, eofToken);
        }
      }
    }
    return new ScriptTreeImpl(null, null, eofToken);
  }

  public VueElement vueElement(InternalSyntaxToken token) {
    return new VueElement();
  }

  public ScriptVueElement scriptVueElement(
    VueScriptTag scriptOpenTag,
    Optional<InternalSyntaxToken> shebangToken, Optional<ModuleTree> items,
    InternalSyntaxToken scriptCloseTag
  ) {

    return new ScriptVueElement(shebangToken.orNull(), items.orNull());
  }

  public FlowSimpleTypeTree flowSimpleType(IdentifierTree identifierTree) {
    return new FlowSimpleTypeTreeImpl(identifierTree);
  }

  public FlowSimpleTypeTree flowSimpleType(SyntaxToken token) {
    return new FlowSimpleTypeTreeImpl(token);
  }

  public FlowTypeAnnotationTree flowTypeAnnotation(InternalSyntaxToken colonToken, FlowTypeTree flowTypeTree) {
    return new FlowTypeAnnotationTreeImpl(colonToken, flowTypeTree);
  }

  public FlowTypedBindingElementTree flowTypedBindingElement(BindingElementTree bindingElementTree, FlowTypeAnnotationTree flowTypeAnnotationTree) {
    return new FlowTypedBindingElementTreeImpl(bindingElementTree, flowTypeAnnotationTree);
  }

  public FlowOptionalTypeTree flowOptionalType(InternalSyntaxToken questionType, FlowTypeTree type) {
    return new FlowOptionalTypeTreeImpl(questionType, type);
  }

  public FlowLiteralTypeTree flowLiteralType(Optional<InternalSyntaxToken> minusToken, InternalSyntaxToken token) {
    return new FlowLiteralTypeTreeImpl(minusToken.orNull(), token);
  }

  public FlowLiteralTypeTree flowLiteralType(InternalSyntaxToken token) {
    return new FlowLiteralTypeTreeImpl(null, token);
  }

  public FlowFunctionTypeTree flowFunctionType(
    Optional<FlowGenericParameterClauseTree> genericParameterClause,
    FlowFunctionTypeParameterClauseTree parameterClause,
    InternalSyntaxToken doubleArrow,
    FlowTypeTree returnType
  ) {
    return new FlowFunctionTypeTreeImpl(genericParameterClause.orNull(), parameterClause, doubleArrow, returnType);
  }

  public FlowFunctionTypeParameterClauseTree flowFunctionTypeParameterClause(
    InternalSyntaxToken lParenthesis,
    SeparatedList<FlowFunctionTypeParameterTree> parameters,
    Optional<InternalSyntaxToken> comma,
    InternalSyntaxToken rParenthesis
  ) {
    SeparatedList<FlowFunctionTypeParameterTree> newParameters = parameters;
    if (comma.isPresent()) {
      List<InternalSyntaxToken> newSeparators = parameters.getSeparators();
      newSeparators.add(comma.get());
      newParameters = new SeparatedListImpl<>(parameters, newSeparators);
    }

    return new FlowFunctionTypeParameterClauseTreeImpl(lParenthesis, newParameters, rParenthesis);
  }

  public FlowFunctionTypeParameterClauseTree flowFunctionTypeParameterClause(
    InternalSyntaxToken lParenthesis,
    SeparatedList<FlowFunctionTypeParameterTree> parameters,
    InternalSyntaxToken comma,
    FlowFunctionTypeParameterTree restParameter,
    InternalSyntaxToken rParenthesis
  ) {
    List<FlowFunctionTypeParameterTree> newParameters = parameters;
    List<InternalSyntaxToken> newSeparators = parameters.getSeparators();
    newSeparators.add(comma);
    newParameters.add(restParameter);

    return new FlowFunctionTypeParameterClauseTreeImpl(lParenthesis, new SeparatedListImpl<>(newParameters, newSeparators), rParenthesis);
  }

  public FlowFunctionTypeParameterClauseTree flowFunctionTypeParameterClause(
    InternalSyntaxToken lParenthesis,
    Optional<FlowFunctionTypeParameterTree> restParameter,
    InternalSyntaxToken rParenthesis
  ) {
    List<FlowFunctionTypeParameterTree> parameters = ImmutableList.of();
    if (restParameter.isPresent()) {
      parameters = ImmutableList.of(restParameter.get());
    }
    return new FlowFunctionTypeParameterClauseTreeImpl(lParenthesis, new SeparatedListImpl(parameters, ImmutableList.of()), rParenthesis);
  }

  public FlowFunctionTypeParameterClauseTree flowFunctionTypeSingleParameterClause(FlowTypeTree parameter) {
    return new FlowFunctionTypeParameterClauseTreeImpl(null, parameterList(flowFunctionTypeParameter(parameter), Optional.absent()), null);
  }

  public <T> SeparatedList<T> parameterList(
    T parameter,
    Optional<List<Tuple<InternalSyntaxToken, T>>> otherParameters
  ) {
    return parameterListWithTrailingComma(parameter, otherParameters, Optional.absent());
  }

  public FlowFunctionTypeParameterTree flowFunctionTypeParameter(IdentifierTree identifier, Optional<SyntaxToken> query, FlowTypeAnnotationTree typeAnnotation) {
    return new FlowFunctionTypeParameterTreeImpl(identifier, query.orNull(), typeAnnotation);
  }

  public FlowFunctionTypeParameterTree flowFunctionTypeParameter(FlowTypeTree type) {
    return new FlowFunctionTypeParameterTreeImpl(type);
  }

  public FlowFunctionTypeParameterTree flowFunctionTypeRestParameter(InternalSyntaxToken ellipsis, FlowFunctionTypeParameterTree typeParameter) {
    return new FlowFunctionTypeParameterTreeImpl(ellipsis, typeParameter);
  }

  public FlowObjectTypeTree flowObjectType(SyntaxToken lcurly, Optional<SeparatedList<Tree>> properties, SyntaxToken rcurly) {
    return new FlowObjectTypeTreeImpl(lcurly, null, properties.or(SeparatedListImpl.emptyImmutableList()), null, rcurly);
  }

  public FlowObjectTypeTree flowStrictObjectType(
    SyntaxToken lcurly, SyntaxToken lpipe, Optional<SeparatedList<Tree>> properties, SyntaxToken rpipe, SyntaxToken rcurly
  ) {
    return new FlowObjectTypeTreeImpl(lcurly, lpipe, properties.or(SeparatedListImpl.emptyImmutableList()), rpipe, rcurly);
  }

  public FlowPropertyDefinitionTree flowPropertyDefinition(InternalSyntaxToken staticToken, Optional<InternalSyntaxToken> plusOrMinusToken, FlowPropertyDefinitionKeyTree key, FlowTypeAnnotationTree typeAnnotation) {
    return new FlowPropertyDefinitionTreeImpl(staticToken, plusOrMinusToken.orNull(), key, typeAnnotation);
  }

  public FlowPropertyDefinitionTree flowPropertyDefinition(Optional<InternalSyntaxToken> plusOrMinusToken, FlowPropertyDefinitionKeyTree key, FlowTypeAnnotationTree typeAnnotation) {
    return new FlowPropertyDefinitionTreeImpl(null, plusOrMinusToken.orNull(), key, typeAnnotation);
  }

  public FlowSimplePropertyDefinitionKeyTree flowSimplePropertyDefinitionKeyTree(SyntaxToken name, Optional<SyntaxToken> queryToken) {
    return new FlowSimplePropertyDefinitionKeyTreeImpl(name, queryToken.orNull());
  }

  public FlowIndexerPropertyDefinitionKeyTree flowIndexerPropertyDefinitionKey(
    InternalSyntaxToken lbracket, Optional<Tuple<IdentifierTree, InternalSyntaxToken>> name, FlowTypeTree type, InternalSyntaxToken rbracket
  ) {

    if (name.isPresent()) {
      return new FlowIndexerPropertyDefinitionKeyTreeImpl(lbracket, name.get().first, name.get().second, type, rbracket);
    } else {
      return new FlowIndexerPropertyDefinitionKeyTreeImpl(lbracket, null, null, type, rbracket);
    }
  }

  public FlowOptionalBindingElementTree flowOptionalBindingElement(BindingElementTree bindingElementTree, InternalSyntaxToken questionToken) {
    return new FlowOptionalBindingElementTreeImpl(bindingElementTree, questionToken);
  }

  public FlowTypeAliasStatementTree flowTypeAliasStatement(
    Optional<InternalSyntaxToken> opaqueToken, InternalSyntaxToken typeToken,
    IdentifierTree identifierTree, Optional<FlowGenericParameterClauseTree> generic, Optional<FlowTypeAnnotationTree> superTypeAnnotation,
    InternalSyntaxToken equalToken, FlowTypeTree flowTypeTree, Tree semicolonToken
  ) {
    return new FlowTypeAliasStatementTreeImpl(
      opaqueToken.orNull(),
      typeToken,
      identifierTree,
      generic.orNull(), superTypeAnnotation.orNull(),
      equalToken,
      flowTypeTree,
      nullableSemicolonToken(semicolonToken));
  }

  public FlowInterfaceDeclarationTree flowInterfaceDeclaration(
    InternalSyntaxToken interfaceToken,
    IdentifierTree identifierTree,
    Optional<FlowGenericParameterClauseTree> genericParameterClause,
    Optional<FlowImplementsClauseTree> extendsClause,
    InternalSyntaxToken openCurlyBraceToken,
    Optional<SeparatedList<Tree>> properties,
    InternalSyntaxToken closeCurlyBraceToken
  ) {
    return new FlowInterfaceDeclarationTreeImpl(
      interfaceToken,
      identifierTree,
      genericParameterClause.orNull(),
      extendsClause.orNull(),
      openCurlyBraceToken,
      properties.or(SeparatedListImpl.emptyImmutableList()),
      closeCurlyBraceToken);
  }

  public FlowModuleTree flowModule(
    InternalSyntaxToken moduleToken, InternalSyntaxToken name, InternalSyntaxToken lCurly, Optional<List<FlowDeclareTree>> elements, InternalSyntaxToken rCurly
  ) {
    return new FlowModuleTreeImpl(moduleToken, name, lCurly, elements.or(Collections.emptyList()), rCurly);
  }

  public FlowDeclareTree flowDeclare(InternalSyntaxToken declareToken, Tree declaredObject, Optional<Tree> eosToken) {
    SyntaxToken semicolonToken = null;
    if (eosToken.isPresent()) {
      semicolonToken = nullableSemicolonToken(eosToken.get());
    }
    return new FlowDeclareTreeImpl(declareToken, declaredObject, semicolonToken);
  }

  public FlowModuleExportsTree flowModuleExports(
    InternalSyntaxToken moduleToken, InternalSyntaxToken dotToken, InternalSyntaxToken exportsToken, FlowTypeAnnotationTree flowTypeAnnotation
  ) {
    return new FlowModuleExportsTreeImpl(moduleToken, dotToken, exportsToken, flowTypeAnnotation);
  }

  public FlowFunctionSignatureTree flowFunctionSignature(
    InternalSyntaxToken functionToken, IdentifierTree name,
    Optional<FlowGenericParameterClauseTree> genericParameterClause,
    FlowFunctionTypeParameterClauseTree parameterClause, FlowTypeAnnotationTree returnType
  ) {
    return new FlowFunctionSignatureTreeImpl(functionToken, name, genericParameterClause.orNull(), parameterClause, returnType);
  }

  public DefaultExportDeclarationTree flowExportDefaultType(InternalSyntaxToken exportToken, InternalSyntaxToken defaultToken, FlowTypeTree type, Tree eos) {
    return new DefaultExportDeclarationTreeImpl(Collections.emptyList(), exportToken, defaultToken, type, nullableSemicolonToken(eos));
  }

  public FlowOpaqueTypeTree flowOpaqueType(InternalSyntaxToken opaque, InternalSyntaxToken type, IdentifierTree name) {
    return new FlowOpaqueTypeTreeImpl(opaque, type, name);
  }

  public FlowArrayTypeShorthandTree flowArrayTypeShorthand(FlowTypeTree flowTypeTree, InternalSyntaxToken lbracket, InternalSyntaxToken rbracket) {
    return new FlowArrayTypeShorthandTreeImpl(flowTypeTree, lbracket, rbracket);
  }

  public FlowArrayTypeWithKeywordTree flowArrayTypeWithKeyword(InternalSyntaxToken arrayToken, InternalSyntaxToken lbracket, FlowTypeTree type, InternalSyntaxToken rbracket) {
    return new FlowArrayTypeWithKeywordTreeImpl(arrayToken, lbracket, type, rbracket);
  }

  public FlowArrayTypeShorthandTree flowArrayTypeShorthand(FlowTypeTree flowTypeTree, List<Tuple<InternalSyntaxToken, InternalSyntaxToken>> tails) {
    FlowTypeTree currentType = flowTypeTree;
    for (Tuple<InternalSyntaxToken, InternalSyntaxToken> tail : tails) {
      currentType = new FlowArrayTypeShorthandTreeImpl(currentType, tail.first, tail.second);
    }
    return (FlowArrayTypeShorthandTree) currentType;
  }

  public FlowParenthesisedTypeTree flowParenthesisedType(InternalSyntaxToken leftParenthesis, FlowTypeTree flowTypeTree, InternalSyntaxToken rightParenthesis) {
    return new FlowParenthesisedTypeTreeImpl(leftParenthesis, flowTypeTree, rightParenthesis);
  }

  public FlowTupleTypeTree flowTupleType(
    InternalSyntaxToken leftBracket,
    Optional<SeparatedList<FlowTypeTree>> elements,
    InternalSyntaxToken rightBracket
  ) {
    return new FlowTupleTypeTreeImpl(leftBracket, elements.or(new SeparatedListImpl(ImmutableList.of(), ImmutableList.of())), rightBracket);
  }

  public SeparatedList<FlowTypeTree> flowTupleTypeElements(
    FlowTypeTree type,
    Optional<List<Tuple<InternalSyntaxToken, FlowTypeTree>>> restTypes,
    Optional<InternalSyntaxToken> trailingComma
  ) {
    return parameterListWithTrailingComma(type, restTypes, trailingComma);
  }

  public FlowNamespacedTypeTree flowNamespacedType(IdentifierTree identifierTree, List<Tuple<InternalSyntaxToken, IdentifierTree>> rest) {
    List<IdentifierTree> identifiers = new ArrayList<>();
    List<InternalSyntaxToken> dots = new ArrayList<>();
    identifiers.add(identifierTree);

    for (Tuple<InternalSyntaxToken, IdentifierTree> tuple : rest) {
      identifiers.add(tuple.second);
      dots.add(tuple.first);
    }

    return new FlowNamespacedTypeTreeImpl(new SeparatedListImpl<>(identifiers, dots));
  }

  public FlowUnionTypeTree flowUnionType(Optional<SyntaxToken> startPipe, SeparatedList<FlowTypeTree> elements) {
    return new FlowUnionTypeTreeImpl(startPipe.orNull(), elements);
  }

  public FlowIntersectionTypeTree flowIntersectionType(Optional<SyntaxToken> startAnd, SeparatedList<FlowTypeTree> elements) {
    return new FlowIntersectionTypeTreeImpl(startAnd.orNull(), elements);
  }

  public SeparatedList<FlowTypeTree> flowTypeElements(FlowTypeTree type, List<Tuple<InternalSyntaxToken, FlowTypeTree>> rest) {
    return parameterList(type, Optional.of(rest));
  }

  public FlowMethodPropertyDefinitionKeyTree flowMethodPropertyDefinitionKeyTree(
    Optional<IdentifierTree> identifierTree, Optional<FlowGenericParameterClauseTree> genericClause, FlowFunctionTypeParameterClauseTree parameterClauseTree
  ) {
    return new FlowMethodPropertyDefinitionKeyTreeImpl(identifierTree.orNull(), genericClause.orNull(), parameterClauseTree);
  }

  public FlowGenericParameterTree flowGenericParameter(
    IdentifierTree identifierTree, Optional<FlowTypeAnnotationTree> superType,
    Optional<Tuple<InternalSyntaxToken, FlowTypeTree>> defaultValue
  ) {
    if (defaultValue.isPresent()) {
      return new FlowGenericParameterTreeImpl(identifierTree, superType.orNull(), defaultValue.get().first, defaultValue.get().second);
    } else {
      return new FlowGenericParameterTreeImpl(identifierTree, superType.orNull(), null, null);
    }
  }

  public FlowGenericParameterClauseTree flowGenericParameterClause(
    InternalSyntaxToken left,
    FlowGenericParameterTree first,
    Optional<List<Tuple<InternalSyntaxToken, FlowGenericParameterTree>>> rest,
    Optional<InternalSyntaxToken> trailingComma,
    InternalSyntaxToken right
  ) {
    return new FlowGenericParameterClauseTreeImpl(left, parameterListWithTrailingComma(first, rest, trailingComma), right);
  }

  public FlowParameterizedGenericsTypeTree flowParameterizedGenericsClause(
    FlowTypeTree type,
    InternalSyntaxToken left, Optional<FlowTypeTree> first,
    Optional<List<Tuple<InternalSyntaxToken, FlowTypeTree>>> rest,
    Optional<InternalSyntaxToken> trailingComma, InternalSyntaxToken right
  ) {
    if (!first.isPresent()) {
      return new FlowParameterizedGenericsTypeTreeImpl(type, left, SeparatedListImpl.emptyImmutableList(), right);
    }
    return new FlowParameterizedGenericsTypeTreeImpl(type, left, parameterListWithTrailingComma(first.get(), rest, trailingComma), right);
  }

  public FlowTypeofTypeTree flowTypeofType(InternalSyntaxToken typeofToken, Tree value) {
    return new FlowTypeofTypeTreeImpl(typeofToken, value);
  }

  public FlowCastingExpressionTree flowCastingExpression(
    InternalSyntaxToken lParenthesis, ExpressionTree expression, InternalSyntaxToken colon,
    FlowTypeTree flowTypeTree, InternalSyntaxToken rParenthesis
  ) {
    return new FlowCastingExpressionTreeImpl(lParenthesis, expression, colon, flowTypeTree, rParenthesis);
  }

  public FlowImplementsClauseTree flowImplementsClause(InternalSyntaxToken implementsToken, FlowTypeTree first, Optional<List<Tuple<InternalSyntaxToken, FlowTypeTree>>> rest) {
    return new FlowImplementsClauseTreeImpl(implementsToken, parameterList(first, rest));
  }

  public VueScriptTag vueScriptTag(InternalSyntaxToken token, Optional<List<JsxAttributeTree>> optional, InternalSyntaxToken token1) {
    return new VueScriptTag();
  }

  public static class ConditionalExpressionTail {
    InternalSyntaxToken queryToken;
    ExpressionTree trueExpr;
    InternalSyntaxToken colonToken;
    ExpressionTree falseExpr;

    ConditionalExpressionTail(InternalSyntaxToken queryToken, ExpressionTree trueExpr, InternalSyntaxToken colonToken, ExpressionTree falseExpr) {
      this.queryToken = queryToken;
      this.trueExpr = trueExpr;
      this.colonToken = colonToken;
      this.falseExpr = falseExpr;
    }
  }

  interface ExpressionTail {
  }

  private static class ArgumentsTail implements ExpressionTail {
    ArgumentListTree argumentClause;

    private ArgumentsTail(ArgumentListTree argumentClause) {
      this.argumentClause = argumentClause;
    }
  }

  private static class TemplateLiteralTail implements ExpressionTail {
    TemplateLiteralTree templateLiteralTree;

    private TemplateLiteralTail(TemplateLiteralTree templateLiteralTree) {
      this.templateLiteralTree = templateLiteralTree;
    }
  }

  static class BracketAccessTail implements ExpressionTail {
    SyntaxToken lBracket;
    ExpressionTree expressionTree;
    SyntaxToken rBracket;

    private BracketAccessTail(SyntaxToken lBracket, ExpressionTree expressionTree, SyntaxToken rBracket) {
      this.lBracket = lBracket;
      this.expressionTree = expressionTree;
      this.rBracket = rBracket;
    }
  }

  static class DotAccessTail implements ExpressionTail {
    SyntaxToken dot;
    IdentifierTree identifierTree;

    private DotAccessTail(SyntaxToken dot, IdentifierTree identifierTree) {
      this.dot = dot;
      this.identifierTree = identifierTree;
    }
  }

  static class VueScriptTag {
  }


  static class VueElement {
  }

  static class ScriptVueElement extends VueElement {
    InternalSyntaxToken shebang;
    ModuleTree moduleTree;

    public ScriptVueElement(InternalSyntaxToken shebang, ModuleTree moduleTree) {
      this.shebang = shebang;
      this.moduleTree = moduleTree;
    }
  }

  public static class Tuple<T, U> {

    private final T first;
    private final U second;

    public Tuple(T first, U second) {
      super();

      this.first = first;
      this.second = second;
    }

    public T first() {
      return first;
    }

    public U second() {
      return second;
    }
  }

  private static <T> List<T> optionalList(Optional<List<T>> list) {
    if (list.isPresent()) {
      return list.get();
    } else {
      return Collections.emptyList();
    }
  }

  public <T, U> Tuple<T, U> newTuple(T first, U second) {
    return new Tuple<>(first, second);
  }

}
