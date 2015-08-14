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
package org.sonar.javascript.checks;

import java.io.IOException;
import java.nio.charset.Charset;
import java.util.Collections;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.visitors.CharsetAwareVisitor;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import com.google.common.io.Files;

@Rule(
  key = "TabCharacter",
  name = "Tabulation characters should not be used",
  priority = Priority.MINOR,
  tags = {Tags.CONVENTION})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.READABILITY)
@SqaleConstantRemediation("2min")
public class TabCharacterCheck extends BaseTreeVisitor implements CharsetAwareVisitor {

  private static final Logger LOG = LoggerFactory.getLogger(TabCharacterCheck.class);
  private Charset charset;

  @Override
  public void scanFile(TreeVisitorContext context) {
    super.scanFile(context);

    List<String> lines = Collections.emptyList();

    try {
      lines = Files.readLines(getContext().getFile(), charset);

    } catch (IOException e) {
      LOG.error("Unable to execute rule \"TabCharacter\" for file {} because of error: {}",
        getContext().getFile().getName(), e);
    }

    for (int i = 0; i < lines.size(); i++) {
      if (lines.get(i).contains("\t")) {
        getContext().addIssue(this, i + 1, "Replace all tab characters in this file by sequences of white-spaces.");
        break;
      }
    }
  }

  @Override
  public void setCharset(Charset charset) {
    this.charset = charset;
  }

}
