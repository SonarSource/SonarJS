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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.AstTreeVisitorContext;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.io.IOException;
import java.io.RandomAccessFile;

@Rule(
  key = "MissingNewlineAtEndOfFile",
  name = "Files should contain an empty new line at the end",
  priority = Priority.MINOR,
  tags = {Tags.CONVENTION})
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.READABILITY)
@SqaleConstantRemediation("1min")
public class MissingNewlineAtEndOfFileCheck extends BaseTreeVisitor {

  private static final Logger LOG = LoggerFactory.getLogger(MissingNewlineAtEndOfFileCheck.class);

  @Override
  public void scanFile(AstTreeVisitorContext context) {
    super.scanFile(context);

    try (RandomAccessFile randomAccessFile = new RandomAccessFile(getContext().getFile(), "r")) {

      if (!endsWithNewline(randomAccessFile)) {
        getContext().addFileIssue(this, "Add a new line at the end of this file.");
      }

    } catch (IOException e) {
      LOG.error("Unable to execute rule \"MissingNewlineAtEndOfFile\" for file {} because of error: {}",
        getContext().getFile().getName(), e);
    }
  }

  private static boolean endsWithNewline(RandomAccessFile randomAccessFile) throws IOException {
    if (randomAccessFile.length() < 1) {
      return false;
    }
    randomAccessFile.seek(randomAccessFile.length() - 1);
    byte[] chars = new byte[1];
    if (randomAccessFile.read(chars) < 1) {
      return false;
    }
    String ch = new String(chars);
    return "\n".equals(ch) || "\r".equals(ch);
  }

}
