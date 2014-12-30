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
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.javascript.model.interfaces.Tree.Kind;
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

    if (parameterChild.is(Kind.IDENTIFIER)) {
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

    if (child.is(EcmaScriptGrammar.BINDING_IDENTIFIER_INITIALISER, EcmaScriptGrammar.BINDING_IDENTIFIER_INITIALISER_NO_IN, Kind.IDENTIFIER)) {
      AstNode identifier = child.is(Kind.IDENTIFIER) ?
        child.getFirstChild(EcmaScriptTokenType.IDENTIFIER)
        : child.getFirstChild(Kind.IDENTIFIER).getFirstChild(EcmaScriptTokenType.IDENTIFIER);

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
    Preconditions.checkArgument(arrowParameters.is(Kind.ARROW_PARAMETER_LIST, Kind.IDENTIFIER));
    List<AstNode> identifiers = Lists.newArrayList();

    if (arrowParameters.is(Kind.IDENTIFIER) && arrowParameters.getFirstChild().is(EcmaScriptTokenType.IDENTIFIER)) {
      identifiers.add(arrowParameters.getFirstChild());
    } else {
      // Retrieve parameters from expression
      AstNode expression = arrowParameters.getFirstChild(EcmaScriptGrammar.EXPRESSION);
      if (expression != null) {
        for (AstNode expressionChild : expression.getChildren()) {
          if (expressionChild.isNot(EcmaScriptPunctuator.COMMA)) {
            identifiers.add(expressionChild);
          }
        }
      }
      // Rest parameter
      AstNode restParameter = arrowParameters.getFirstChild(Kind.REST_ELEMENT);
      if (restParameter != null) {
        identifiers.add(getRestIdentifier(restParameter));
      }
    }
    return identifiers;
  }

  public static List<AstNode> getParametersIdentifier(AstNode formalParameterList) {
    Preconditions.checkArgument(formalParameterList.is(Kind.FORMAL_PARAMETER_LIST, EcmaScriptGrammar.PROPERTY_SET_PARAMETER_LIST));
    List<AstNode> identifiers = Lists.newArrayList();

    for (AstNode parameter : formalParameterList.getChildren(EcmaScriptGrammar.BINDING_ELEMENT, Kind.REST_ELEMENT)) {

      if (parameter.is(EcmaScriptGrammar.BINDING_ELEMENT)) {
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
    Preconditions.checkArgument(bindingElement.is(EcmaScriptGrammar.BINDING_ELEMENT));

    AstNode child = bindingElement.getFirstChild();

    if (child.is(EcmaScriptGrammar.SINGLE_NAME_BINDING)) {
      return getSingleNameIdentifier(child);
    } else {
      return getBindingPatternIdentifiers(child);
    }

  }

  private static List<AstNode> getBindingPatternIdentifiers(AstNode bindingPattern) {
    Preconditions.checkArgument(bindingPattern.is(EcmaScriptGrammar.BINDING_PATTERN));
    AstNode child = bindingPattern.getFirstChild();

    if (child.is(EcmaScriptGrammar.OBJECT_BINDING_PATTERN)) {
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
        identifiers.addAll(getBindingElementIdentifiers(elisionElement.getFirstChild(EcmaScriptGrammar.BINDING_ELEMENT)));
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

    return bindingRestElement.getFirstChild(Kind.IDENTIFIER);
  }

  private static List<AstNode> getObjectBindingIdentifiers(AstNode objectBindingPattern) {
    Preconditions.checkArgument(objectBindingPattern.is(EcmaScriptGrammar.OBJECT_BINDING_PATTERN));
    List<AstNode> identifiers = Lists.newArrayList();
    AstNode propertyList = objectBindingPattern.getFirstChild(EcmaScriptGrammar.BINDING_PROPERTY_LIST);

    if (propertyList != null) {

      for (AstNode property : propertyList.getChildren(EcmaScriptGrammar.BINDING_PROPERTY)) {
        AstNode propertyChild = property.getFirstChild();

        if (propertyChild.is(EcmaScriptGrammar.SINGLE_NAME_BINDING)) {
          identifiers.addAll(getSingleNameIdentifier(propertyChild));
        } else {
          identifiers.addAll(getBindingElementIdentifiers(property.getFirstChild(EcmaScriptGrammar.BINDING_ELEMENT)));
        }
      }
    }
    return identifiers;
  }

  private static List<AstNode> getSingleNameIdentifier(AstNode singleNameBinding) {
    Preconditions.checkArgument(singleNameBinding.is(EcmaScriptGrammar.SINGLE_NAME_BINDING));
    List<AstNode> identifier = Lists.newArrayList();

    AstNode id = singleNameBinding.getFirstChild(Kind.IDENTIFIER).getFirstChild(EcmaScriptTokenType.IDENTIFIER);
    if (id != null) {
      identifier.add(id);
    }
    return identifier;
  }
}
