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

import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.model.implementations.declaration.MethodDeclarationTreeImpl;
import org.sonar.javascript.model.implementations.expression.FunctionExpressionTreeImpl;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.statement.BlockTree;
import org.sonar.squidbridge.annotations.Tags;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstNode;

@Rule(
  key = "EmptyBlock",
  priority = Priority.MAJOR,
  tags = {Tags.BUG})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class EmptyBlockCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(Kind.BLOCK);
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (!isFunctionBody(astNode) && ((BlockTree) astNode).statements().isEmpty() && !hasComment(astNode)) {
      getContext().createLineViolation(this, "Either remove or fill this block of code.", astNode);
    }
  }

  private static boolean hasComment(AstNode blockNode) {
    return blockNode.getFirstChild(EcmaScriptPunctuator.RCURLYBRACE).getToken().hasTrivia();
  }

  private static boolean isFunctionBody(AstNode block) {
    AstNode parent = block.getParent();

   return parent instanceof MethodDeclarationTreeImpl
     || parent instanceof FunctionExpressionTreeImpl
     || parent.is(Kind.FUNCTION_DECLARATION, Kind.GENERATOR_DECLARATION);
  }
}
