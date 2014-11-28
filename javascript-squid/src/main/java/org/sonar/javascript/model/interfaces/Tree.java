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
package org.sonar.javascript.model.interfaces;

import com.sonar.sslr.api.AstNodeType;
import org.sonar.javascript.model.interfaces.lexical.IdentifierTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.lexical.SyntaxTrivia;
import org.sonar.javascript.model.interfaces.statement.BlockTree;
import org.sonar.javascript.model.interfaces.statement.BreakStatementTree;
import org.sonar.javascript.model.interfaces.statement.CatchBlockTree;
import org.sonar.javascript.model.interfaces.statement.ContinueStatementTree;
import org.sonar.javascript.model.interfaces.statement.DebuggerStatementTree;
import org.sonar.javascript.model.interfaces.statement.EmptyStatementTree;
import org.sonar.javascript.model.interfaces.statement.LabelledStatementTree;
import org.sonar.javascript.model.interfaces.statement.ReturnStatementTree;
import org.sonar.javascript.model.interfaces.statement.ThrowStatementTree;
import org.sonar.javascript.model.interfaces.statement.TryStatementTree;
import org.sonar.javascript.model.interfaces.statement.VariableStatementTree;
import org.sonar.javascript.model.interfaces.statement.WithStatementTree;
import org.sonar.sslr.grammar.GrammarRuleKey;

/**
 * Common interface for all nodes in an abstract syntax tree.
 *
 * <p>This interface is not intended to be implemented by clients.</p>
 */
public interface Tree {

  boolean is(Kind... kind);

//  void accept(TreeVisitor visitor);

  public enum Kind implements AstNodeType, GrammarRuleKey {

    /**
     * {@link EmptyStatementTree}
     */
    EMPTY_STATEMENT(EmptyStatementTree.class),

    /**
     * {@link DebuggerStatementTree}
     */
    DEBUGGER_STATEMENT(DebuggerStatementTree.class),

    /**
     * {@link VariableStatementTree}
     */
    VARIABLE_STATEMENT(VariableStatementTree.class),

    /**
     * {@link LabelledStatementTree}
     */
    LABELLED_STATEMENT(LabelledStatementTree.class),

    /**
     * {@link ContinueStatementTree}
     */
    CONTINUE_STATEMENT(ContinueStatementTree.class),

    /**
     * {@link BreakStatementTree}
     */
    BREAK_STATEMENT(BreakStatementTree.class),

    /**
     * {@link ReturnStatementTree}
     */
    RETURN_STATEMENT(ReturnStatementTree.class),

    /**
     * {@link ThrowStatementTree}
     */
    THROW_STATEMENT(ThrowStatementTree.class),

    /**
     * {@link WithStatementTree}
     */
    WITH_STATEMENT(WithStatementTree.class),

    /**
     * {@link BlockTree}
     */
    BLOCK(BlockTree.class),

    /**
     * {@link TryStatementTree}
     */
    TRY_STATEMENT(TryStatementTree.class),

    /**
     * {@link CatchBlockTree}
     */
    CATCH_BLOCK(CatchBlockTree.class),

    /**
     * {@link IdentifierTree}
     */
    IDENTIFIER(IdentifierTree.class),

    TOKEN(SyntaxToken.class),

    TRIVIA(SyntaxTrivia.class);

    final Class<? extends Tree> associatedInterface;

    private Kind(Class<? extends Tree> associatedInterface) {
      this.associatedInterface = associatedInterface;
    }

    public Class<? extends Tree> getAssociatedInterface() {
      return associatedInterface;
    }
  }

}
