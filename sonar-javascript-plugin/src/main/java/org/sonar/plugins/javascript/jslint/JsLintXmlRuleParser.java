/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
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
package org.sonar.plugins.javascript.jslint;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.util.ArrayList;
import java.util.List;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamException;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.CharEncoding;
import org.apache.commons.lang.StringUtils;
import org.codehaus.staxmate.SMInputFactory;
import org.codehaus.staxmate.in.SMHierarchicCursor;
import org.codehaus.staxmate.in.SMInputCursor;
import org.sonar.api.ServerComponent;
import org.sonar.api.rules.RuleParam;
import org.sonar.api.rules.RulePriority;
import org.sonar.api.utils.SonarException;

public final class JsLintXmlRuleParser implements ServerComponent {

  public List<JsLintRule> parse(File file) {
    Reader reader = null;
    try {
      reader = new InputStreamReader(FileUtils.openInputStream(file), CharEncoding.UTF_8);
      return parse(reader);

    } catch (IOException e) {
      throw new SonarException("Fail to load the file: " + file, e);

    } finally {
      IOUtils.closeQuietly(reader);
    }
  }

  /**
   * Warning : the input stream is closed in this method
   */
  public List<JsLintRule> parse(InputStream input) {
    Reader reader = null;
    try {
      reader = new InputStreamReader(input, CharEncoding.UTF_8);
      return parse(reader);

    } catch (IOException e) {
      throw new SonarException("Fail to load the xml stream", e);

    } finally {
      IOUtils.closeQuietly(reader);
    }
  }

  public List<JsLintRule> parse(Reader reader) {
    XMLInputFactory xmlFactory = XMLInputFactory.newInstance();
    xmlFactory.setProperty(XMLInputFactory.IS_COALESCING, Boolean.TRUE);
    xmlFactory.setProperty(XMLInputFactory.IS_NAMESPACE_AWARE, Boolean.FALSE);
    // just so it won't try to load DTD in if there's DOCTYPE
    xmlFactory.setProperty(XMLInputFactory.SUPPORT_DTD, Boolean.FALSE);
    xmlFactory.setProperty(XMLInputFactory.IS_VALIDATING, Boolean.FALSE);
    SMInputFactory inputFactory = new SMInputFactory(xmlFactory);
    try {
      SMHierarchicCursor rootC = inputFactory.rootElementCursor(reader);
      rootC.advance(); // <rules>
      List<JsLintRule> rules = new ArrayList<JsLintRule>();

      SMInputCursor rulesC = rootC.childElementCursor("rule");
      while (rulesC.getNext() != null) {
        // <rule>
        JsLintRule rule = new JsLintRule();
        rules.add(rule);

        processRule(rule, rulesC);
      }
      return rules;

    } catch (XMLStreamException e) {
      throw new SonarException("XML is not valid", e);
    }
  }

  private static void processRule(JsLintRule rule, SMInputCursor ruleC) throws XMLStreamException {

    SMInputCursor cursor = ruleC.childElementCursor();

    while (cursor.getNext() != null) {
      String nodeName = cursor.getLocalName();

      if (StringUtils.equalsIgnoreCase("name", nodeName)) {
        rule.setName(StringUtils.trim(cursor.collectDescendantText(false)));
      } else if (StringUtils.equalsIgnoreCase("description", nodeName)) {
        rule.setDescription(StringUtils.trim(cursor.collectDescendantText(false)));
      } else if (StringUtils.equalsIgnoreCase("key", nodeName)) {
        rule.setKey(StringUtils.trim(cursor.collectDescendantText(false)));
      } else if (StringUtils.equalsIgnoreCase("priority", nodeName)) {
        rule.setPriority(RulePriority.valueOf(StringUtils.trim(cursor.collectDescendantText(false))));
      } else if (StringUtils.equalsIgnoreCase("inverse", nodeName)) {
        rule.setInverse(Boolean.valueOf(StringUtils.trim(cursor.collectDescendantText(false))));
      } else if (StringUtils.equalsIgnoreCase("param", nodeName)) {
        processParameter(rule, cursor);
      } else if (StringUtils.equalsIgnoreCase("messages", nodeName)) {
        processMessages(rule, cursor);
      }
    }
    if (StringUtils.isEmpty(rule.getKey())) {
      throw new SonarException("Node <key> is missing in <rule>");
    }
    if (StringUtils.isEmpty(rule.getName())) {
      throw new SonarException("Node <name> is missing in <rule>");
    }
  }

  private static void processMessages(JsLintRule rule, SMInputCursor cursor) throws XMLStreamException {
    List<String> messageList = new ArrayList<String>();

    SMInputCursor messagesCursor = cursor.childElementCursor();

    while (messagesCursor.getNext() != null) {
      String nodeName = messagesCursor.getLocalName();
      String nodeValue = StringUtils.trim(messagesCursor.collectDescendantText(false));

      if (StringUtils.equalsIgnoreCase("message", nodeName)) {
        messageList.add(nodeValue);

      }
    }
    rule.setMessages(messageList);
  }

  private static void processParameter(JsLintRule rule, SMInputCursor ruleC) throws XMLStreamException {
    RuleParam param = rule.createParameter();

    SMInputCursor paramC = ruleC.childElementCursor();
    while (paramC.getNext() != null) {
      String propNodeName = paramC.getLocalName();
      String propText = StringUtils.trim(paramC.collectDescendantText(false));
      if (StringUtils.equalsIgnoreCase("key", propNodeName)) {
        param.setKey(propText);

      } else if (StringUtils.equalsIgnoreCase("description", propNodeName)) {
        param.setDescription(propText);

      } else if (StringUtils.equalsIgnoreCase("type", propNodeName)) {
        param.setType(propText);

      } else if (StringUtils.equalsIgnoreCase("defaultValue", propNodeName)) {
        param.setDefaultValue(propText);
      }
    }
    if (StringUtils.isEmpty(param.getKey())) {
      throw new SonarException("Node <key> is missing in <param>");
    }
  }
}
