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
package org.sonar.javascript.ast.parser;

import com.google.common.base.Preconditions;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;
import org.sonar.javascript.parser.sslr.Optional;

import java.util.List;

public class TreeFactory {

  // Statements

//  public EmptyStatementTreeImpl emptyStatement(AstNode semicolon) {
//    return new EmptyStatementTreeImpl(semicolon);
//  }

  // End of statements

  // Helpers

  public static final AstNodeType WRAPPER_AST_NODE = new AstNodeType() {
    @Override
    public String toString() {
      return "WRAPPER_AST_NODE";
    }
  };

  public AstNode newWrapperAstNode(Optional<List<AstNode>> e1, AstNode e2) {
    if (e1.isPresent()) {
      AstNode astNode = new AstNode(WRAPPER_AST_NODE, WRAPPER_AST_NODE.toString(), null);
      for (AstNode child : e1.get()) {
        astNode.addChild(child);
      }
      astNode.addChild(e2);
      return astNode;
    } else {
      return e2;
    }
  }

  public AstNode newWrapperAstNode(AstNode e1, Optional<List<AstNode>> e2, AstNode e3) {
    AstNode astNode = new AstNode(WRAPPER_AST_NODE, WRAPPER_AST_NODE.toString(), null);
    astNode.addChild(e1);
    if (e2.isPresent()) {
      for (AstNode child : e2.get()) {
        astNode.addChild(child);
      }
    }
    astNode.addChild(e3);
    return astNode;
  }

  public AstNode newWrapperAstNode(AstNode e1, AstNode e2) {
    AstNode astNode = new AstNode(WRAPPER_AST_NODE, WRAPPER_AST_NODE.toString(), null);
    astNode.addChild(e1);
    astNode.addChild(e2);
    return astNode;
  }

  public AstNode newWrapperAstNode(AstNode e1, Optional<AstNode> e2) {
    AstNode astNode = new AstNode(WRAPPER_AST_NODE, WRAPPER_AST_NODE.toString(), null);
    astNode.addChild(e1);
    if (e2.isPresent()) {
      astNode.addChild(e2.get());
    }
    return astNode;
  }

  // TODO Enable the same method call multiple times

  public AstNode newWrapperAstNode2(AstNode e1, AstNode e2) {
    return newWrapperAstNode(e1, e2);
  }

  public AstNode newWrapperAstNode3(AstNode e1, AstNode e2) {
    return newWrapperAstNode(e1, e2);
  }

  public AstNode newWrapperAstNode4(AstNode e1, AstNode e2) {
    return newWrapperAstNode(e1, e2);
  }

  public AstNode newWrapperAstNode5(Optional<List<AstNode>> e1, AstNode e2) {
    return newWrapperAstNode(e1, e2);
  }

  public AstNode newWrapperAstNode6(AstNode e1, AstNode e2) {
    return newWrapperAstNode(e1, e2);
  }

  public AstNode newWrapperAstNode7(AstNode e1, AstNode e2) {
    return newWrapperAstNode(e1, e2);
  }

  public AstNode newWrapperAstNode8(AstNode e1, AstNode e2) {
    return newWrapperAstNode(e1, e2);
  }

  public AstNode newWrapperAstNode9(AstNode e1, AstNode e2) {
    return newWrapperAstNode(e1, e2);
  }

  public AstNode newWrapperAstNode10(AstNode e1, AstNode e2) {
    return newWrapperAstNode(e1, e2);
  }

  public AstNode newWrapperAstNode11(Optional<List<AstNode>> e1, AstNode e2) {
    return newWrapperAstNode(e1, e2);
  }

  public AstNode newWrapperAstNode12(AstNode e1, AstNode e2) {
    return newWrapperAstNode(e1, e2);
  }

  public AstNode newWrapperAstNode13(AstNode e1, AstNode e2) {
    return newWrapperAstNode(e1, e2);
  }

  public AstNode newWrapperAstNode14(AstNode e1, Optional<AstNode> e2) {
    return newWrapperAstNode(e1, e2);
  }

  public AstNode newWrapperAstNode15(AstNode e1, Optional<AstNode> e2) {
    return newWrapperAstNode(e1, e2);
  }

  public static class Tuple<T, U> extends AstNode {

    private final T first;
    private final U second;

    public Tuple(T first, U second) {
      super(WRAPPER_AST_NODE, WRAPPER_AST_NODE.toString(), null);

      this.first = first;
      this.second = second;

      add(first);
      add(second);
    }

    public T first() {
      return first;
    }

    public U second() {
      return second;
    }

    private void add(Object o) {
      if (o instanceof AstNode) {
        addChild((AstNode) o);
      } else if (o instanceof Optional) {
        Optional opt = (Optional) o;
        if (opt.isPresent()) {
          Object o2 = opt.get();
          if (o2 instanceof AstNode) {
            addChild((AstNode) o2);
          } else if (o2 instanceof List) {
            for (Object o3 : (List) o2) {
              Preconditions.checkArgument(o3 instanceof AstNode, "Unsupported type: " + o3.getClass().getSimpleName());
              addChild((AstNode) o3);
            }
          } else {
            throw new IllegalArgumentException("Unsupported type: " + o2.getClass().getSimpleName());
          }
        }
      } else {
        throw new IllegalStateException("Unsupported argument type: " + o.getClass().getSimpleName());
      }
    }

  }

  private <T, U> Tuple<T, U> newTuple(T first, U second) {
    return new Tuple<T, U>(first, second);
  }

  public <T, U> Tuple<T, U> newTuple1(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple2(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple3(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple4(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple5(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple6(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple7(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple8(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple9(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple10(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple11(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple12(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple13(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple14(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple15(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple16(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple17(T first, U second) {
    return newTuple(first, second);
  }

  // End

}
