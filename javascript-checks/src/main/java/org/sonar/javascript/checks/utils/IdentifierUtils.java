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
package org.sonar.javascript.checks.utils;

import com.google.common.base.Preconditions;
import com.google.common.collect.Lists;
import com.sonar.sslr.api.AstNode;
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.declaration.ObjectBindingPatternTree;
import org.sonar.javascript.parser.EcmaScriptGrammar;

import javax.annotation.Nullable;

import java.util.List;

public class IdentifierUtils {

  private IdentifierUtils() {
  }

  public static List<AstNode> getCatchIdentifiers(AstNode catchNode) {
    Preconditions.checkArgument(catchNode.is(Kind.CATCH_BLOCK));

    AstNode parameterChild = catchNode.getFirstChild(EcmaScriptGrammar.CATCH_PARAMETER).getFirstChild();
    List<AstNode> identifiers = Lists.newArrayList();

    if (parameterChild.is(Kind.BINDING_IDENTIFIER)) {
      AstNode identifier = parameterChild.getFirstChild(EcmaScriptTokenType.IDENTIFIER);
      if (identifier != null) {
        identifiers.add(identifier);
      }
    } else {
      identifiers.addAll(getBindingPatternIdentifiers(parameterChild));
    }
    return identifiers;
  }

  public static List<AstNode> getVariableIdentifiers(AstNode variableDeclaration) {
    Preconditions.checkArgument(variableDeclaration.is(
      Kind.VARIABLE_DECLARATION,
      EcmaScriptGrammar.VARIABLE_DECLARATION_NO_IN,
      EcmaScriptGrammar.LEXICAL_BINDING,
      EcmaScriptGrammar.LEXICAL_DECLARATION_NO_IN,
      EcmaScriptGrammar.FOR_BINDING));

    List<AstNode> identifiers = Lists.newArrayList();
    AstNode child = variableDeclaration.getFirstChild();

    if (child.is(EcmaScriptGrammar.BINDING_IDENTIFIER_INITIALISER, EcmaScriptGrammar.BINDING_IDENTIFIER_INITIALISER_NO_IN, Kind.BINDING_IDENTIFIER)) {
      AstNode identifier = child.is(Kind.BINDING_IDENTIFIER) ?
        child.getFirstChild(EcmaScriptTokenType.IDENTIFIER)
        : child.getFirstChild(Kind.BINDING_IDENTIFIER).getFirstChild(EcmaScriptTokenType.IDENTIFIER);

      if (identifier != null) {
        identifiers.add(identifier);
      }

    } else {
      AstNode bindingPattern = child.is(EcmaScriptGrammar.BINDING_PATTERN) ? child : child.getFirstChild(EcmaScriptGrammar.BINDING_PATTERN);
      identifiers.addAll(getBindingPatternIdentifiers(bindingPattern));
    }

    return identifiers;
  }

  /**
   * Return list of AstNode corresponding to the function parameter(s).
   */
  public static List<AstNode> getArrowParametersIdentifier(AstNode arrowParameters) {
    Preconditions.checkArgument(arrowParameters.is(Kind.FORMAL_PARAMETER_LIST, Kind.BINDING_IDENTIFIER));

    if (arrowParameters.is(Kind.BINDING_IDENTIFIER)) {
      return Lists.newArrayList(arrowParameters.getFirstChild());
    } else {
      return getParametersIdentifier(arrowParameters);
    }
  }

  public static List<AstNode> getParametersIdentifier(AstNode formalParameterList) {
    Preconditions.checkArgument(formalParameterList.is(Kind.FORMAL_PARAMETER_LIST));
    List<AstNode> identifiers = Lists.newArrayList();

    for (AstNode parameter : formalParameterList.getChildren(Kind.BINDING_IDENTIFIER, Kind.BINDING_ELEMENT, EcmaScriptGrammar.BINDING_PATTERN, Kind.REST_ELEMENT)) {

      if (parameter.is(Kind.BINDING_IDENTIFIER, Kind.BINDING_ELEMENT, EcmaScriptGrammar.BINDING_PATTERN)) {
        identifiers.addAll(getBindingElementIdentifiers(parameter));
      } else {
        AstNode id = getRestIdentifier(parameter);
        if (id != null) {
          identifiers.add(id);
        }
      }
    }
    return identifiers;
  }

  private static List<AstNode> getBindingElementIdentifiers(AstNode bindingElement) {
    Preconditions.checkArgument(bindingElement.is(Kind.BINDING_IDENTIFIER, Kind.BINDING_ELEMENT, EcmaScriptGrammar.BINDING_PATTERN));

    if (bindingElement.is(Kind.BINDING_IDENTIFIER)) {
      return getSingleNameIdentifier(bindingElement);
    } else if (bindingElement.is(Kind.BINDING_ELEMENT)) {
      return getSingleNameIdentifier(bindingElement.getFirstChild());
    } else {
      return getBindingPatternIdentifiers(bindingElement);
    }

  }

  private static List<AstNode> getBindingPatternIdentifiers(AstNode bindingPattern) {
    Preconditions.checkArgument(bindingPattern.is(EcmaScriptGrammar.BINDING_PATTERN));
    AstNode child = bindingPattern.getFirstChild();

    if (child.is(Kind.OBJECT_BINDING_PATTERN)) {
      return getObjectBindingIdentifiers(child);
    } else {
      return getArrayBindingIdentifiers(child);
    }
  }

  private static List<AstNode> getArrayBindingIdentifiers(AstNode arrayBindingPatter) {
    Preconditions.checkArgument(arrayBindingPatter.is(EcmaScriptGrammar.ARRAY_BINDING_PATTERN));
    AstNode elementList = arrayBindingPatter.getFirstChild(EcmaScriptGrammar.BINDING_ELEMENT_LIST);
    List<AstNode> identifiers = Lists.newArrayList();

    if (elementList != null) {

      for (AstNode elisionElement : elementList.getChildren(EcmaScriptGrammar.BINDING_ELISION_ELEMENT)) {
        identifiers.addAll(getBindingElementIdentifiers(elisionElement.getFirstChild(Kind.BINDING_IDENTIFIER, Kind.BINDING_ELEMENT)));
      }
    }
    AstNode restElement = arrayBindingPatter.getFirstChild(EcmaScriptGrammar.BINDING_REST_ELEMENT, Kind.REST_ELEMENT);

    if (restElement != null) {
      AstNode id = getRestIdentifier(restElement);
      if (id != null) {
        identifiers.add(id);
      }
    }
    return identifiers;
  }

  @Nullable
  private static AstNode getRestIdentifier(AstNode bindingRestElement) {
    Preconditions.checkArgument(bindingRestElement.is(Kind.REST_ELEMENT));

    return bindingRestElement.getFirstChild(Kind.BINDING_IDENTIFIER);
  }

  private static List<AstNode> getObjectBindingIdentifiers(AstNode objectBindingPattern) {
    Preconditions.checkArgument(objectBindingPattern.is(Kind.OBJECT_BINDING_PATTERN));
    List<AstNode> identifiers = Lists.newArrayList();

    for (Tree property : ((ObjectBindingPatternTree) objectBindingPattern).elements()) {
      if (((AstNode)property).is(EcmaScriptGrammar.BINDING_PATTERN)) {
        identifiers.addAll(getBindingElementIdentifiers((AstNode) property));
      } else if (property.is(Kind.BINDING_PROPERTY)) {
        identifiers.addAll(getBindingElementIdentifiers(((AstNode) property).getLastChild()));
      } else {
        identifiers.addAll(getSingleNameIdentifier((AstNode) property));
      }
    }
    return identifiers;
  }

  private static List<AstNode> getSingleNameIdentifier(AstNode singleNameBinding) {
    Preconditions.checkArgument(singleNameBinding.is(Kind.BINDING_IDENTIFIER, Kind.BINDING_ELEMENT));
    List<AstNode> identifier = Lists.newArrayList();
    AstNode id;

    if (singleNameBinding.is(Kind.BINDING_ELEMENT)) {
      id = singleNameBinding.getFirstChild(Kind.BINDING_IDENTIFIER).getFirstChild(EcmaScriptTokenType.IDENTIFIER);
    } else {
      id = singleNameBinding.getFirstChild(EcmaScriptTokenType.IDENTIFIER);
    }

    if (id != null) {
      identifier.add(id);
    }
    return identifier;
  }
}
