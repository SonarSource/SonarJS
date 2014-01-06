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

import com.google.common.base.Charsets;
import com.google.common.collect.ImmutableList;
import com.sonar.sslr.impl.Parser;
import com.sonar.sslr.impl.ast.AstWalker;
import org.junit.Test;
import org.sonar.javascript.EcmaScriptConfiguration;
import org.sonar.javascript.parser.EcmaScriptParser;

import static org.mockito.Matchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyZeroInteractions;

public class TreeVisitorsBridgeTest {

  private Parser p = EcmaScriptParser.create(new EcmaScriptConfiguration(Charsets.UTF_8));

  @Test
  public void test() {
    MyTreeVisitor visitor = mock(MyTreeVisitor.class);
    new AstWalker(new TreeVisitorsBridge(ImmutableList.of(visitor))).walkAndVisit(p.parse("if (true) {}"));
    verify(visitor).visit(any(IfStatementTree.class));
  }

  @Test
  public void parse_error() {
    MyTreeVisitor visitor = mock(MyTreeVisitor.class);
    new TreeVisitorsBridge(ImmutableList.of(visitor)).visitFile(null);
    verifyZeroInteractions(visitor);
  }


  private static abstract class MyTreeVisitor implements TreeVisitor {
    public abstract void visit(IfStatementTree ifStatement);
  }

}
