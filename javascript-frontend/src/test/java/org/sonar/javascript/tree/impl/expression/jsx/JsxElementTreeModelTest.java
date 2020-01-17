/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
 * mailto:info AT sonarsource DOT com
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
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.javascript.tree.impl.expression.jsx;

import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxSelfClosingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxShortFragmentElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxSpreadAttributeTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxStandardAttributeTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxStandardElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxTextTree;

import static org.assertj.core.api.Assertions.assertThat;

public class JsxElementTreeModelTest extends JavaScriptTreeModelTest {


  @Test
  public void self_closing() throws Exception {
    JsxSelfClosingElementTree tree = parse("<foo attr1='value1' attr2={value2} my-attr3=<bar/> {...bar()} attr5/>", Kind.JSX_SELF_CLOSING_ELEMENT);

    assertThat(tree.is(Kind.JSX_SELF_CLOSING_ELEMENT)).isTrue();
    assertThat(tree.openAngleBracketToken().text()).isEqualTo("<");
    assertThat(tree.slashToken().text()).isEqualTo("/");
    assertThat(tree.closeAngleBracketToken().text()).isEqualTo(">");

    assertThat(tree.elementName().is(Kind.JSX_IDENTIFIER)).isTrue();
    assertThat(expressionToString(tree.elementName())).isEqualTo("foo");

    assertThat(tree.attributes()).hasSize(5);

    assertThat(tree.attributes().get(0).is(Kind.JSX_STANDARD_ATTRIBUTE)).isTrue();
    JsxStandardAttributeTree attr1 = (JsxStandardAttributeTree) tree.attributes().get(0);
    assertThat(expressionToString(attr1.name())).isEqualTo("attr1");
    assertThat(attr1.value().is(Kind.STRING_LITERAL)).isTrue();
    assertThat(attr1.equalToken().text()).isEqualTo("=");

    assertThat(tree.attributes().get(1).is(Kind.JSX_STANDARD_ATTRIBUTE)).isTrue();
    JsxStandardAttributeTree attr2 = (JsxStandardAttributeTree) tree.attributes().get(1);
    assertThat(expressionToString(attr2.name())).isEqualTo("attr2");
    assertThat(attr2.value().is(Kind.JSX_JAVASCRIPT_EXPRESSION)).isTrue();

    assertThat(tree.attributes().get(2).is(Kind.JSX_STANDARD_ATTRIBUTE)).isTrue();
    JsxStandardAttributeTree attr3 = (JsxStandardAttributeTree) tree.attributes().get(2);
    assertThat(attr3.value().is(Kind.JSX_SELF_CLOSING_ELEMENT)).isTrue();

    assertThat(tree.attributes().get(3).is(Kind.JSX_SPREAD_ATTRIBUTE)).isTrue();
    JsxSpreadAttributeTree attr4 = (JsxSpreadAttributeTree) tree.attributes().get(3);
    assertThat(attr4.expressionTree().is(Kind.CALL_EXPRESSION)).isTrue();

    assertThat(tree.attributes().get(4).is(Kind.JSX_IDENTIFIER)).isTrue();
  }

  @Test
  public void standard() throws Exception {
    JsxStandardElementTree tree = parse("<foo> Hello my <bar>world</bar> ! </foo>", Kind.JSX_STANDARD_ELEMENT);

    assertThat(tree.is(Kind.JSX_STANDARD_ELEMENT)).isTrue();

    assertThat(tree.openingElement().openAngleBracketToken().text()).isEqualTo("<");
    assertThat(tree.openingElement().closeAngleBracketToken().text()).isEqualTo(">");
    assertThat(tree.openingElement().attributes()).isEmpty();
    assertThat(expressionToString(tree.openingElement().elementName())).isEqualTo("foo");

    assertThat(tree.closingElement().openAngleBracketToken().text()).isEqualTo("<");
    assertThat(tree.closingElement().closeAngleBracketToken().text()).isEqualTo(">");
    assertThat(tree.closingElement().slashToken().text()).isEqualTo("/");
    assertThat(expressionToString(tree.closingElement().elementName())).isEqualTo("foo");

    assertThat(tree.children()).hasSize(3);

    assertThat(tree.children().get(0).is(Kind.JSX_TEXT)).isTrue();
    assertThat(((JsxTextTree) tree.children().get(0)).token().text()).isEqualTo(" Hello my ");

    assertThat(tree.children().get(1).is(Kind.JSX_STANDARD_ELEMENT)).isTrue();

    assertThat(tree.children().get(2).is(Kind.JSX_TEXT)).isTrue();
    assertThat(expressionToString(tree.children().get(2))).isEqualTo("!");
  }

  @Test
  public void complex_tag_name() throws Exception {
    JsxStandardElementTree tree = parse("<foo:bar-baz.qux>Hello</foo:bar-baz.qux>", Kind.JSX_STANDARD_ELEMENT);
    assertThat(tree.is(Kind.JSX_STANDARD_ELEMENT)).isTrue();
    assertThat(expressionToString(tree.openingElement().elementName())).isEqualTo("foo:bar-baz.qux");
    assertThat(expressionToString(tree.closingElement().elementName())).isEqualTo("foo:bar-baz.qux");
  }

  @Test
  public void short_fragment_syntax() throws Exception {
    JsxShortFragmentElementTree tree = parse("<> Hello <div/><div/></>", Kind.JSX_SHORT_FRAGMENT_ELEMENT);

    assertThat(tree.is(Kind.JSX_SHORT_FRAGMENT_ELEMENT)).isTrue();
    assertThat(tree.openingElement().is(Kind.JSX_EMPTY_OPENING_ELEMENT)).isTrue();
    assertThat(expressionToString(tree.openingElement())).isEqualTo("<>");
    assertThat(tree.openingElement().openAngleBracketToken().text()).isEqualTo("<");
    assertThat(tree.openingElement().closeAngleBracketToken().text()).isEqualTo(">");

    assertThat(expressionToString(tree.closingElement())).isEqualTo("</>");
    assertThat(tree.closingElement().openAngleBracketToken().text()).isEqualTo("<");
    assertThat(tree.closingElement().slashToken().text()).isEqualTo("/");
    assertThat(tree.closingElement().closeAngleBracketToken().text()).isEqualTo(">");

    assertThat(tree.closingElement().is(Kind.JSX_EMPTY_CLOSING_ELEMENT)).isTrue();
    assertThat(tree.children()).hasSize(3);
    assertThat(tree.children().get(0).is(Kind.JSX_TEXT)).isTrue();
    assertThat(tree.children().get(1).is(Kind.JSX_SELF_CLOSING_ELEMENT)).isTrue();
    assertThat(tree.children().get(2).is(Kind.JSX_SELF_CLOSING_ELEMENT)).isTrue();
  }

  @Test
  public void element_name() throws Exception {
    JsxSelfClosingElementTree tree = parse("<foo/>", Kind.JSX_SELF_CLOSING_ELEMENT);
    assertThat(tree.elementName().is(Kind.JSX_IDENTIFIER)).isTrue();

    tree = parse("<Foo/>", Kind.JSX_SELF_CLOSING_ELEMENT);
    assertThat(tree.elementName().is(Kind.IDENTIFIER_REFERENCE)).isTrue();

    tree = parse("<this/>", Kind.JSX_SELF_CLOSING_ELEMENT);
    assertThat(tree.elementName().is(Kind.THIS)).isTrue();

    tree = parse("<foo.bar />", Kind.JSX_SELF_CLOSING_ELEMENT);
    assertThat(tree.elementName().is(Kind.DOT_MEMBER_EXPRESSION)).isTrue();
    DotMemberExpressionTree dotMember = (DotMemberExpressionTree) tree.elementName();
    assertThat(dotMember.object().is(Kind.IDENTIFIER_REFERENCE)).isTrue();
    assertThat(dotMember.property().is(Kind.PROPERTY_IDENTIFIER)).isTrue();

    tree = parse("<Foo.bar />", Kind.JSX_SELF_CLOSING_ELEMENT);
    assertThat(tree.elementName().is(Kind.DOT_MEMBER_EXPRESSION)).isTrue();

  }
}
