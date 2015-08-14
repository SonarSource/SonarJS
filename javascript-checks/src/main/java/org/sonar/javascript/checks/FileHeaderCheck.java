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

import com.google.common.io.Files;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.tree.visitors.CharsetAwareVisitor;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.squidbridge.annotations.NoSqale;

import java.io.IOException;
import java.nio.charset.Charset;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;

@Rule(
  key = "S1451",
  name = "Copyright and license headers should be defined",
  priority = Priority.BLOCKER)
//@ActivatedByDefault
@NoSqale
public class FileHeaderCheck extends BaseTreeVisitor implements CharsetAwareVisitor {

  private static final Logger LOG = LoggerFactory.getLogger(FileHeaderCheck.class);
  private static final String DEFAULT_HEADER_FORMAT = "";

  @RuleProperty(
    key = "headerFormat",
    type = "TEXT",
    description = "Expected copyright and license header (plain text)",
    defaultValue = DEFAULT_HEADER_FORMAT)
  public String headerFormat = DEFAULT_HEADER_FORMAT;

  private Charset charset;
  private String[] expectedLines;

  @Override
  public void setCharset(Charset charset) {
    this.charset = charset;
  }

  @Override
  public void scanFile(TreeVisitorContext context) {
    // TODO martin: should be done in a init method
    expectedLines = headerFormat.split("(?:\r)?\n|\r");

    List<String> lines = Collections.emptyList();

    try {
      lines = Files.readLines(context.getFile(), charset);

    } catch (IOException e) {
      LOG.error("Unable to execute rule \"TabCharacter\" for file {} because of error: {}",
        context.getFile().getName(), e);
    }

    if (!matches(expectedLines, lines)) {
      context.addFileIssue(this, "Add or update the header of this file.");
    }
  }

  private static boolean matches(String[] expectedLines, List<String> lines) {
    boolean result;

    if (expectedLines.length <= lines.size()) {
      result = true;

      Iterator<String> it = lines.iterator();
      for (int i = 0; i < expectedLines.length; i++) {
        String line = it.next();
        if (!line.equals(expectedLines[i])) {
          result = false;
          break;
        }
      }
    } else {
      result = false;
    }

    return result;
  }

}
