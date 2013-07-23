/*
 * Sonar JavaScript Plugin
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

import com.google.common.collect.ImmutableList;
import org.junit.Test;
import org.mockito.InOrder;
import org.mockito.Mockito;

public class VisitorsDispatcherTest {

  @Test
  public void test() {
    StatementTree emptyStatement = new TreeImpl.EmptyStatementTreeImpl(null);
    IfStatementTree ifStatement = new TreeImpl.IfStatementTreeImpl(null, new TreeImpl.IdentifierTreeImpl(null, "i"), emptyStatement, null);

    MyTreeVisitor visitor1 = Mockito.mock(MyTreeVisitor.class);
    MyTreeVisitor visitor2 = Mockito.mock(MyTreeVisitor.class);
    VisitorsDispatcher dispatcher = new VisitorsDispatcher(ImmutableList.of(visitor1, visitor2));
    TreeImpl.scan(ifStatement, dispatcher);

    InOrder inOrder = Mockito.inOrder(visitor1, visitor2);
    inOrder.verify(visitor1).visit(ifStatement);
    inOrder.verify(visitor2).visit(ifStatement);
    inOrder.verify(visitor1).visit(emptyStatement);
    inOrder.verify(visitor2).visit(emptyStatement);
    inOrder.verify(visitor2).leave(emptyStatement);
    inOrder.verify(visitor1).leave(emptyStatement);
    inOrder.verify(visitor2).leave(ifStatement);
    inOrder.verify(visitor1).leave(ifStatement);
    inOrder.verifyNoMoreInteractions();
  }

  private static abstract class MyTreeVisitor implements TreeVisitor {
    public abstract void visit(StatementTree statement);
    public abstract void leave(StatementTree statement);
    public abstract void visit(IfStatementTree ifStatement);
    public abstract void leave(IfStatementTree ifStatement);
  }

}
