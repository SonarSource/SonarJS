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
import org.sonar.javascript.parser.EcmaScriptGrammar;

import javax.annotation.Nullable;
import java.util.List;

public class CheckUtils {

  private CheckUtils() {
  }

  public static List<AstNode> getCatchIdentifiers(AstNode catchNode) {
    Preconditions.checkArgument(catchNode.is(EcmaScriptGrammar.CATCH));

    AstNode parameterChild = catchNode.getFirstChild(EcmaScriptGrammar.CATCH_PARAMETER).getFirstChild();
    List<AstNode> identifiers = Lists.newArrayList();

    if (parameterChild.is(EcmaScriptGrammar.BINDING_IDENTIFIER)) {
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
    Preconditions.checkArgument(variableDeclaration.is(EcmaScriptGrammar.VARIABLE_DECLARATION, EcmaScriptGrammar.VARIABLE_DECLARATION_NO_IN));

    List<AstNode> identifiers = Lists.newArrayList();
    AstNode child = variableDeclaration.getFirstChild();

    if (child.is(EcmaScriptGrammar.BINDING_IDENTIFIER_INITIALISER, EcmaScriptGrammar.BINDING_IDENTIFIER_INITIALISER_NO_IN)) {
      AstNode identifier = child.getFirstChild(EcmaScriptGrammar.BINDING_IDENTIFIER).getFirstChild(EcmaScriptTokenType.IDENTIFIER);
      if (identifier != null) {
        identifiers.add(identifier);
      }
    } else {
      identifiers.addAll(getBindingPatternIdentifiers(child.getFirstChild(EcmaScriptGrammar.BINDING_PATTERN)));
    }

    return identifiers;
  }

  public static List<AstNode> getParametersIdentifier(AstNode formalParameterList) {
    Preconditions.checkArgument(formalParameterList.is(EcmaScriptGrammar.FORMAL_PARAMETER_LIST, EcmaScriptGrammar.PROPERTY_SET_PARAMETER_LIST));
    List<AstNode> identifiers = Lists.newArrayList();

    for (AstNode parameter : formalParameterList.getChildren(EcmaScriptGrammar.FORMAL_PARAMETER, EcmaScriptGrammar.REST_PARAMETER)) {

      if (parameter.is(EcmaScriptGrammar.FORMAL_PARAMETER)) {
        identifiers.addAll(getFormalParameterIdentifiers(parameter));
      } else {
        AstNode id = getRestIdentifier(parameter.getFirstChild());
        if (id != null) {
          identifiers.add(id);
        }
      }
    }
    return identifiers;
  }

  private static List<AstNode> getFormalParameterIdentifiers(AstNode formalParameter) {
    Preconditions.checkArgument(formalParameter.is(EcmaScriptGrammar.FORMAL_PARAMETER));

    return getBindingElementIdentifiers(formalParameter.getFirstChild());
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
    AstNode restElement = arrayBindingPatter.getFirstChild(EcmaScriptGrammar.BINDING_REST_ELEMENT);

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
    Preconditions.checkArgument(bindingRestElement.is(EcmaScriptGrammar.BINDING_REST_ELEMENT));

    return bindingRestElement.getFirstChild(EcmaScriptGrammar.BINDING_IDENTIFIER).getFirstChild(EcmaScriptTokenType.IDENTIFIER);
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

    AstNode id = singleNameBinding.getFirstChild(EcmaScriptGrammar.BINDING_IDENTIFIER).getFirstChild(EcmaScriptTokenType.IDENTIFIER);
    if (id != null) {
      identifier.add(id);
    }
    return identifier;
  }
}
