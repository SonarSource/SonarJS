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
package org.sonar.javascript.model.implementations.expression;

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.apache.commons.collections.ListUtils;
import org.sonar.javascript.ast.visitors.TreeVisitor;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.TemplateCharactersTree;
import org.sonar.javascript.model.interfaces.expression.TemplateExpressionTree;
import org.sonar.javascript.model.interfaces.expression.TemplateLiteralTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import java.util.Iterator;
import java.util.List;

public class TemplateLiteralTreeImpl extends JavaScriptTree implements TemplateLiteralTree {

  private final SyntaxToken openBacktick;
  private final List<TemplateCharactersTree> strings;
  private final List<TemplateExpressionTree> expressions;
  private final SyntaxToken closeBacktick;

  public TemplateLiteralTreeImpl(InternalSyntaxToken openBacktick, List<TemplateCharactersTree> strings,
    List<TemplateExpressionTree> expressions, InternalSyntaxToken closeBacktick, List<AstNode> children) {

    super(Kind.TEMPLATE_LITERAL);
    this.openBacktick = openBacktick;
    this.strings = strings;
    this.expressions = expressions;
    this.closeBacktick = closeBacktick;

    for (AstNode child : children) {
      addChild(child);
    }
  }

  public TemplateLiteralTreeImpl(InternalSyntaxToken openBacktick, List<TemplateCharactersTree> strings,
    InternalSyntaxToken closeBacktick) {

    super(Kind.TEMPLATE_LITERAL);
    this.openBacktick = openBacktick;
    this.strings = strings;
    this.expressions = ListUtils.EMPTY_LIST;
    this.closeBacktick = closeBacktick;

    addChild(openBacktick);
    addChildren(strings.toArray(new AstNode[strings.size()]));
    addChild(closeBacktick);
  }

  @Override
  public SyntaxToken openBacktick() {
    return openBacktick;
  }

  @Override
  public List<TemplateCharactersTree> strings() {
    return strings;
  }

  @Override
  public List<TemplateExpressionTree> expressions() {
    return expressions;
  }

  @Override
  public SyntaxToken closeBacktick() {
    return closeBacktick;
  }

  @Override
  public Kind getKind() {
    return Kind.TEMPLATE_LITERAL;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>concat(
      strings.iterator(),
      expressions.iterator()
    );
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitTemplateLiteral(this);
  }
}
