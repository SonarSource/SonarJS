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
package org.sonar.javascript.model;

import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.Iterables;
import com.google.common.collect.Maps;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.javascript.parser.EcmaScriptGrammar;

import javax.annotation.Nullable;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@SuppressWarnings({"unchecked"})
public final class ASTMaker {

  private final Map<AstNodeType, Maker> makers = Maps.newHashMap();

  /**
   * {@link #create()} should be used to construct instances of this class.
   */
  private ASTMaker() {
  }

  public Tree makeFrom(AstNode astNode) {
    Preconditions.checkNotNull(astNode);
    TreesImpl trees = new TreesImpl();
    visit(astNode, trees);
    return (Tree) trees.get(astNode);
  }

  /**
   * Bottom-up traversal.
   */
  private void visit(AstNode astNode, TreesImpl trees) {
    for (AstNode child : astNode.getChildren()) {
      visit(child, trees);
    }
    trees.put(astNode, make(astNode, trees));
  }

  @Nullable
  private Tree make(AstNode astNode, ASTMaker.Trees trees) {
    Maker maker = makers.get(astNode.getType());
    if (maker == null) {
      return null;
    }
    return maker.make(astNode, trees);
  }

  private interface Maker {
    Tree make(AstNode astNode, Trees t);
  }

  private interface Trees {
    Object get(AstNode astNode);

    List getList(AstNode astNode);
  }

  private void register(Maker maker, AstNodeType... types) {
    for (AstNodeType type : types) {
      makers.put(type, maker);
    }
  }

  public static ASTMaker create() {
    ASTMaker dispatcher = new ASTMaker();

    dispatcher.register(new Maker() {
      public IdentifierTree make(AstNode astNode, Trees t) {
        return new TreeImpl.IdentifierTreeImpl(astNode,
          astNode.getTokenValue()
        );
      }
    }, EcmaScriptGrammar.IDENTIFIER_NAME, EcmaScriptTokenType.IDENTIFIER, EcmaScriptKeyword.THIS);

    dispatcher.register(new Maker() {
      public LiteralTree make(AstNode astNode, Trees t) {
        return new TreeImpl.LiteralTreeImpl(astNode);
      }
    },
      EcmaScriptGrammar.NULL_LITERAL,
      EcmaScriptGrammar.BOOLEAN_LITERAL,
      EcmaScriptTokenType.NUMERIC_LITERAL,
      EcmaScriptGrammar.STRING_LITERAL,
      EcmaScriptTokenType.REGULAR_EXPRESSION_LITERAL);

    // Expressions

    dispatcher.register(new Maker() {
      public ExpressionTree make(AstNode astNode, Trees t) {
        AstNode primararyChild = astNode.getFirstChild();
        if (primararyChild.is(EcmaScriptGrammar.COVER_PARENTHESIZED_EXPRESSION_AND_ARROW_PARAMETER_LIST)) {
          AstNode expression = primararyChild.getFirstChild(EcmaScriptGrammar.EXPRESSION);
          return new TreeImpl.ParenthesizedTreeImpl(astNode,
            expression == null ? null : (ExpressionTree) t.get(expression)
          );
        } else {
          return (ExpressionTree) t.get(astNode.getFirstChild());
        }
      }
    }, EcmaScriptGrammar.PRIMARY_EXPRESSION);

    dispatcher.register(new Maker() {
      public ArrayLiteralTree make(AstNode astNode, Trees t) {
        ImmutableList.Builder list = ImmutableList.builder();
        AstNode elementList = astNode.getFirstChild(EcmaScriptGrammar.ELEMENT_LIST);
        if (elementList != null) {
          for (AstNode arrayElement : elementList.getChildren(EcmaScriptGrammar.ARRAY_INITIALIZER_ELEMENT)) {
            if (arrayElement.isNot(EcmaScriptGrammar.SPREAD_ELEMENT)) {
              list.add(t.get(arrayElement.getFirstChild()));
            }
          }
        }
        return new TreeImpl.ArrayLiteralTreeImpl(astNode,
          list.build()
        );
      }
    }, EcmaScriptGrammar.ARRAY_LITERAL);

    dispatcher.register(new Maker() {
      public ObjectLiteralTree make(AstNode astNode, Trees t) {
        ImmutableList.Builder<PropertyAssignmentTree> list = ImmutableList.builder();
        for (AstNode propertyAssignment : astNode.getChildren(EcmaScriptGrammar.PROPERTY_DEFINITION)) {
          list.add((PropertyAssignmentTree) t.get(propertyAssignment));
        }
        return new TreeImpl.ObjectLiteralTreeImpl(astNode,
          list.build()
        );
      }
    }, EcmaScriptGrammar.OBJECT_LITERAL);

    dispatcher.register(new Maker() {
      public PropertyAssignmentTree make(AstNode astNode, Trees t) {
        AstNode objectProperty = astNode.getFirstChild();

        // method
        if (objectProperty.is(EcmaScriptGrammar.METHOD_DEFINITION)) {
          AstNode method = objectProperty.getFirstChild();
          AstNode parametersList = method.getFirstChild(EcmaScriptGrammar.FORMAL_PARAMETER_LIST, EcmaScriptGrammar.PROPERTY_SET_PARAMETER_LIST);

          return new TreeImpl.PropertyAssignmentTreeImpl(astNode,
            (Tree) t.get(method.getFirstChild(EcmaScriptGrammar.PROPERTY_NAME)),
            null,
            parametersList == null ? null : (List<IdentifierTree>) t.getList(parametersList),
            (List<? extends SourceElementTree>) t.getList(method.getFirstChild(EcmaScriptGrammar.FUNCTION_BODY))
          );
        } else {
          // property
          return new TreeImpl.PropertyAssignmentTreeImpl(astNode,
            (Tree) t.get(objectProperty.getFirstChild(EcmaScriptGrammar.PROPERTY_NAME)),
            (ExpressionTree) t.get(objectProperty.getLastChild()),
            null,
            null
          );
        }
      }
    }, EcmaScriptGrammar.PROPERTY_DEFINITION);

    dispatcher.register(new Maker() {
      public ExpressionTree make(AstNode astNode, Trees t) {
        ExpressionTree result;
        int i;
        if (astNode.getFirstChild().is(EcmaScriptKeyword.NEW)) {
          i = 3;
          result = new TreeImpl.NewOperatorTreeImpl(astNode,
            (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.MEMBER_EXPRESSION)),
            (List<? extends ExpressionTree>) t.getList(astNode.getFirstChild(EcmaScriptGrammar.ARGUMENTS))
          );
        } else {
          i = 1;
          result = (ExpressionTree) t.get(astNode.getFirstChild());
        }
        while (i < astNode.getNumberOfChildren()) {
          if (astNode.getChild(i).is(EcmaScriptPunctuator.LBRACKET)) {
            result = new TreeImpl.IndexAccessTreeImpl(astNode,
              result,
              (ExpressionTree) t.get(astNode.getChild(i + 1))
            );
            i += 3;
          } else if (astNode.getChild(i).is(EcmaScriptPunctuator.DOT)) {
            result = new TreeImpl.PropertyAccessTreeImpl(astNode,
              result,
              (IdentifierTree) t.get(astNode.getChild(i + 1))
            );
            i += 2;
          } else {
            throw new IllegalStateException();
          }
        }
        return result;
      }
    }, EcmaScriptGrammar.MEMBER_EXPRESSION);

    dispatcher.register(new Maker() {
      public ExpressionTree make(AstNode astNode, Trees t) {
        if (astNode.getNumberOfChildren() > 1) {
          return new TreeImpl.NewOperatorTreeImpl(astNode,
            (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.NEW_EXPRESSION)),
            Collections.<ExpressionTree>emptyList()
          );
        } else {
          return (ExpressionTree) t.get(astNode.getFirstChild());
        }
      }
    }, EcmaScriptGrammar.NEW_EXPRESSION);

    dispatcher.register(new Maker() {
      public ExpressionTree make(AstNode astNode, Trees t) {
        ExpressionTree result = new TreeImpl.FunctionCallTreeImpl(astNode,
          (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.MEMBER_EXPRESSION)),
          (List<? extends ExpressionTree>) t.getList(astNode.getFirstChild(EcmaScriptGrammar.ARGUMENTS))
        );
        int i = 2;
        while (i < astNode.getNumberOfChildren()) {
          if (astNode.getChild(i).is(EcmaScriptGrammar.ARGUMENTS)) {
            result = new TreeImpl.FunctionCallTreeImpl(astNode,
              result,
              (List<? extends ExpressionTree>) t.getList(astNode.getChild(i))
            );
            i += 1;
          } else if (astNode.getChild(i).is(EcmaScriptPunctuator.LBRACKET)) {
            result = new TreeImpl.IndexAccessTreeImpl(astNode,
              result,
              (ExpressionTree) t.get(astNode.getChild(i + 1))
            );
            i += 3;
          } else if (astNode.getChild(i).is(EcmaScriptPunctuator.DOT)) {
            result = new TreeImpl.PropertyAccessTreeImpl(astNode,
              result,
              (IdentifierTree) t.get(astNode.getChild(i + 1))
            );
            i += 2;
          } else {
            throw new IllegalStateException();
          }
        }
        return result;
      }
    }, EcmaScriptGrammar.CALL_EXPRESSION);

    dispatcher.register(new Maker() {
      public ExpressionTree make(AstNode astNode, Trees t) {
        if (astNode.getNumberOfChildren() > 1) {
          return new TreeImpl.UnaryOperatorTreeImpl(astNode,
            astNode.getFirstChild(EcmaScriptPunctuator.INC, EcmaScriptPunctuator.DEC).getType(),
            (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.LEFT_HAND_SIDE_EXPRESSION))
          );
        } else {
          return (ExpressionTree) t.get(astNode.getFirstChild());
        }
      }
    }, EcmaScriptGrammar.POSTFIX_EXPRESSION);

    dispatcher.register(new Maker() {
      public ExpressionTree make(AstNode astNode, Trees t) {
        if (astNode.getNumberOfChildren() > 1) {
          return new TreeImpl.UnaryOperatorTreeImpl(astNode,
            astNode.getFirstChild().getType(),
            (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.UNARY_EXPRESSION))
          );
        } else {
          return (ExpressionTree) t.get(astNode.getFirstChild());
        }
      }
    }, EcmaScriptGrammar.UNARY_EXPRESSION);

    dispatcher.register(new Maker() {
      public BinaryOperatorTree make(AstNode astNode, Trees t) {
        ExpressionTree rightOperand = (ExpressionTree) t.get(Iterables.getLast(astNode.getChildren()));
        for (int i = astNode.getNumberOfChildren() - 3; i >= 0; i -= 2) {
          rightOperand = new TreeImpl.BinaryOperatorTreeImpl(astNode, i, (ExpressionTree) t.get(astNode.getChild(i)), rightOperand);
        }
        return (BinaryOperatorTree) rightOperand;
      }
    }, EcmaScriptGrammar.MULTIPLICATIVE_EXPRESSION, EcmaScriptGrammar.ADDITIVE_EXPRESSION, EcmaScriptGrammar.SHIFT_EXPRESSION,
      EcmaScriptGrammar.RELATIONAL_EXPRESSION, EcmaScriptGrammar.RELATIONAL_EXPRESSION_NO_IN,
      EcmaScriptGrammar.EQUALITY_EXPRESSION, EcmaScriptGrammar.EQUALITY_EXPRESSION_NO_IN,
      EcmaScriptGrammar.BITWISE_AND_EXPRESSION, EcmaScriptGrammar.BITWISE_AND_EXPRESSION_NO_IN,
      EcmaScriptGrammar.BITWISE_XOR_EXPRESSION, EcmaScriptGrammar.BITWISE_XOR_EXPRESSION_NO_IN,
      EcmaScriptGrammar.BITWISE_OR_EXPRESSION, EcmaScriptGrammar.BITWISE_OR_EXPRESSION_NO_IN,
      EcmaScriptGrammar.LOGICAL_AND_EXPRESSION, EcmaScriptGrammar.LOGICAL_AND_EXPRESSION_NO_IN,
      EcmaScriptGrammar.LOGICAL_OR_EXPRESSION, EcmaScriptGrammar.LOGICAL_OR_EXPRESSION_NO_IN,
      EcmaScriptGrammar.ASSIGNMENT_EXPRESSION, EcmaScriptGrammar.ASSIGNMENT_EXPRESSION_NO_IN);

    dispatcher.register(new Maker() {
      public ConditionalOperatorTree make(AstNode astNode, Trees t) {
        return new TreeImpl.ConditionalOperatorTreeImpl(astNode,
          // TODO getChild is ugly - see SSLR-323
          (ExpressionTree) t.get(astNode.getChild(0)),
          (ExpressionTree) t.get(astNode.getChild(2)),
          (ExpressionTree) t.get(astNode.getChild(4))
        );
      }
    }, EcmaScriptGrammar.CONDITIONAL_EXPRESSION, EcmaScriptGrammar.CONDITIONAL_EXPRESSION_NO_IN);

    dispatcher.register(new Maker() {
      public ExpressionTree make(AstNode astNode, Trees t) {
        if (astNode.getNumberOfChildren() > 1) {
          ImmutableList.Builder list = ImmutableList.builder();
          for (int i = 0; i < astNode.getNumberOfChildren(); i += 2) {
            list.add(t.get(astNode.getChild(i)));
          }
          return new TreeImpl.CommaOperatorTreeImpl(astNode, list.build());
        } else {
          return (ExpressionTree) t.get(astNode.getFirstChild());
        }
      }
    }, EcmaScriptGrammar.EXPRESSION, EcmaScriptGrammar.EXPRESSION_NO_IN);

    // Statements

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.BlockTreeImpl(astNode,
          (List<? extends StatementTree>) t.getList(astNode.getFirstChild(EcmaScriptGrammar.STATEMENT_LIST))
        );
      }
    }, EcmaScriptGrammar.BLOCK);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.VariableStatementTreeImpl(astNode,
          (List<VariableDeclarationTree>) t.getList(astNode.getFirstChild(EcmaScriptGrammar.VARIABLE_DECLARATION_LIST))
        );
      }
    }, EcmaScriptGrammar.VARIABLE_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.VariableDeclarationTreeImpl(astNode,
          (IdentifierTree) t.get(astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER)),
          (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.INITIALISER))
        );
      }
    }, EcmaScriptGrammar.VARIABLE_DECLARATION);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.VariableDeclarationTreeImpl(astNode,
          (IdentifierTree) t.get(astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER)),
          (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.INITIALISER_NO_IN))
        );
      }
    }, EcmaScriptGrammar.VARIABLE_DECLARATION_NO_IN);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.BreakStatementTreeImpl(astNode,
          (IdentifierTree) t.get(astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER))
        );
      }
    }, EcmaScriptGrammar.BREAK_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.ContinueStatementTreeImpl(astNode,
          (IdentifierTree) t.get(astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER))
        );
      }
    }, EcmaScriptGrammar.CONTINUE_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.DebuggerStatementTreeImpl(astNode);
      }
    }, EcmaScriptGrammar.DEBUGGER_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.EmptyStatementTreeImpl(astNode);
      }
    }, EcmaScriptGrammar.EMPTY_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.ExpressionStatementTreeImpl(astNode,
          (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.EXPRESSION))
        );
      }
    }, EcmaScriptGrammar.EXPRESSION_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.IfStatementTreeImpl(astNode,
          (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.CONDITION)),
          (StatementTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.STATEMENT)),
          (StatementTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.ELSE_CLAUSE))
        );
      }
    }, EcmaScriptGrammar.IF_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.LabelledStatementTreeImpl(astNode,
          (IdentifierTree) t.get(astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER)),
          (StatementTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.STATEMENT))
        );
      }
    }, EcmaScriptGrammar.LABELLED_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.ReturnStatementTreeImpl(astNode,
          (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.EXPRESSION))
        );
      }
    }, EcmaScriptGrammar.RETURN_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.ThrowStatementTreeImpl(astNode,
          (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.EXPRESSION))
        );
      }
    }, EcmaScriptGrammar.THROW_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.WhileStatementTreeImpl(astNode,
          (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.CONDITION)),
          (StatementTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.STATEMENT))
        );
      }
    }, EcmaScriptGrammar.WHILE_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.DoWhileStatementTreeImpl(astNode,
          (StatementTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.STATEMENT)),
          (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.CONDITION))
        );
      }
    }, EcmaScriptGrammar.DO_WHILE_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        AstNode variableDeclarationList = astNode.getFirstChild(EcmaScriptGrammar.VARIABLE_DECLARATION_LIST_NO_IN);
        if (variableDeclarationList != null) {
          return new TreeImpl.ForStatementTreeImpl(astNode,
            (List<VariableDeclarationTree>) t.getList(variableDeclarationList),
            (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.CONDITION)),
            (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.EXPRESSION)),
            (StatementTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.STATEMENT))
          );
        } else {
          return new TreeImpl.ForStatementTreeImpl(astNode,
            (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.EXPRESSION_NO_IN)),
            (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.CONDITION)),
            (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.EXPRESSION)),
            (StatementTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.STATEMENT))
          );
        }
      }
    }, EcmaScriptGrammar.FOR_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        AstNode variableDeclarationList = astNode.getFirstChild(EcmaScriptGrammar.VARIABLE_DECLARATION_LIST_NO_IN);
        if (variableDeclarationList != null) {
          return new TreeImpl.ForInStatementTreeImpl(astNode,
            (List<VariableDeclarationTree>) t.getList(variableDeclarationList),
            (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.EXPRESSION)),
            (StatementTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.STATEMENT))
          );
        } else {
          return new TreeImpl.ForInStatementTreeImpl(astNode,
            (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.LEFT_HAND_SIDE_EXPRESSION)),
            (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.EXPRESSION)),
            (StatementTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.STATEMENT))
          );
        }
      }
    }, EcmaScriptGrammar.FOR_IN_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.WithStatementTreeImpl(astNode,
          (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.EXPRESSION)),
          (StatementTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.STATEMENT))
        );
      }
    }, EcmaScriptGrammar.WITH_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.SwitchStatementTreeImpl(astNode,
          (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.EXPRESSION)),
          (List<CaseClauseTree>) t.getList(astNode.getFirstChild(EcmaScriptGrammar.CASE_BLOCK))
        );
      }
    }, EcmaScriptGrammar.SWITCH_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.CaseClauseTreeImpl(astNode,
          (ExpressionTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.EXPRESSION)),
          (List<? extends StatementTree>) t.getList(astNode.getFirstChild(EcmaScriptGrammar.STATEMENT_LIST))
        );
      }
    }, EcmaScriptGrammar.CASE_CLAUSE);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.CaseClauseTreeImpl(astNode,
          null,
          (List<? extends StatementTree>) t.getList(astNode.getFirstChild(EcmaScriptGrammar.STATEMENT_LIST))
        );
      }
    }, EcmaScriptGrammar.DEFAULT_CLAUSE);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.TryStatementTreeImpl(astNode,
          (BlockTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.BLOCK)),
          (CatchBlockTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.CATCH)),
          (BlockTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.FINALLY))
        );
      }
    }, EcmaScriptGrammar.TRY_STATEMENT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.CatchBlockTreeImpl(astNode,
          (IdentifierTree) t.get(astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER)),
          (BlockTree) t.get(astNode.getFirstChild(EcmaScriptGrammar.BLOCK))
        );
      }
    }, EcmaScriptGrammar.CATCH);

    // Functions and Programs

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        return new TreeImpl.ProgramTreeImpl(astNode,
          (List<? extends SourceElementTree>) t.getList(astNode.getFirstChild(EcmaScriptGrammar.SCRIPT_BODY))
        );
      }
    }, EcmaScriptGrammar.SCRIPT);

    dispatcher.register(new Maker() {
      public Tree make(AstNode astNode, Trees t) {
        AstNode functionBody = astNode.getFirstChild(EcmaScriptGrammar.FUNCTION_BODY);
        return new TreeImpl.FunctionTreeImpl(astNode,
          (IdentifierTree) t.get(astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER)),
          (List<IdentifierTree>) t.getList(astNode.getFirstChild(EcmaScriptGrammar.FORMAL_PARAMETER_LIST)),
          (List<? extends SourceElementTree>) t.getList(functionBody)
        );
      }
    }, EcmaScriptGrammar.FUNCTION_DECLARATION, EcmaScriptGrammar.FUNCTION_EXPRESSION);

    return dispatcher;
  }

  private static class TreesImpl implements ASTMaker.Trees {

    private final Map<AstNode, Object> map = Maps.newHashMap();

    public Object get(AstNode astNode) {
      return map.get(astNode);
    }

    public List getList(AstNode astNode) {
      Object o = map.get(astNode);
      if (o == null) {
        return ImmutableList.of();
      }
      if (o instanceof List) {
        return (List) o;
      }
      return ImmutableList.of(o);
    }

    public void put(AstNode astNode, @Nullable Object tree) {
      if (tree == null) {
        ImmutableList.Builder<Object> list = ImmutableList.builder();
        for (AstNode child : astNode.getChildren()) {
          Object childTree = get(child);
          if (childTree != null) {
            if (childTree instanceof List) {
              list.addAll((List) childTree);
            } else {
              list.add(childTree);
            }
          }
        }
        ImmutableList<Object> result = list.build();
        if (result.isEmpty()) {
          tree = null;
        } else if (result.size() == 1) {
          tree = result.get(0);
        } else {
          tree = result;
        }
      }
      if (tree != null) {
        map.put(astNode, tree);
      }
    }
  }

}
