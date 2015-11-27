/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
package org.sonar.javascript.tree.impl.declaration;

import com.google.common.base.Function;
import com.google.common.collect.Iterators;
import com.google.common.collect.Lists;
import com.sonar.sslr.api.typed.Optional;
import java.util.Iterator;
import java.util.List;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.SeparatedList;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.ArrayBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.RestElementTree;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;

public class ArrayBindingPatternTreeImpl extends JavaScriptTree implements ArrayBindingPatternTree {

  private final InternalSyntaxToken openBracketToken;
  private final SeparatedList<Optional<BindingElementTree>> elements;
  private final InternalSyntaxToken closeBracketToken;

  public ArrayBindingPatternTreeImpl(
    InternalSyntaxToken openBracketToken,
    SeparatedList<Optional<BindingElementTree>> elements,
    InternalSyntaxToken closeBracketToken
  ) {

    this.openBracketToken = openBracketToken;
    this.elements = elements;
    this.closeBracketToken = closeBracketToken;
  }

  @Override
  public InternalSyntaxToken openBracketToken() {
    return openBracketToken;
  }

  @Override
  public SeparatedList<Optional<BindingElementTree>> elements() {
    return elements;
  }

  @Override
  public InternalSyntaxToken closeBracketToken() {
    return closeBracketToken;
  }

  @Override
  public Kind getKind() {
    return Kind.ARRAY_BINDING_PATTERN;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.singletonIterator(openBracketToken),
      elements.elementsAndSeparators(new ElidedElementFilter()),
      Iterators.singletonIterator(closeBracketToken)
    );
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitArrayBindingPattern(this);
  }

  /**
   * Return the list of new binding names introduced by this array binding pattern.
   * <p/>
   * Example:
   * <pre>
   *   [a, , , b, ...c] // will return [a, b, c]
   * </pre>
   */
  public List<IdentifierTree> bindingIdentifiers() {
    List<IdentifierTree> bindingIdentifiers = Lists.newArrayList();

    for (Optional<BindingElementTree> element : elements) {
      if (element.isPresent()) {

        if (element.get().is(Kind.BINDING_IDENTIFIER)) {
          bindingIdentifiers.add((IdentifierTree) element.get());

        } else if (element.get().is(Kind.REST_ELEMENT)) {
          bindingIdentifiers.add((IdentifierTree) ((RestElementTree) element.get()).element());

        } else if (element.get().is(Kind.OBJECT_BINDING_PATTERN)) {
          bindingIdentifiers.addAll(((ObjectBindingPatternTreeImpl) element.get()).bindingIdentifiers());

        } else {
          bindingIdentifiers.addAll(((ArrayBindingPatternTreeImpl) element.get()).bindingIdentifiers());
        }
      }
    }
    return bindingIdentifiers;
  }

  private static class ElidedElementFilter implements Function<Optional<BindingElementTree>, BindingElementTree> {

    @Override
    public BindingElementTree apply(Optional<BindingElementTree> e) {
      if (e.isPresent()) {
        return e.get();
      }
      return null;
    }

  }
}
