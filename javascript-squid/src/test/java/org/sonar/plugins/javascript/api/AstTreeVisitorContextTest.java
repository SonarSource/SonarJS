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
package org.sonar.plugins.javascript.api;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.config.Settings;
import org.sonar.javascript.JavaScriptAstScanner;
import org.sonar.javascript.TestUtils;
import org.sonar.javascript.ast.resolve.SymbolModelImpl;
import org.sonar.javascript.ast.visitors.AstTreeVisitorContextImpl;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.internal.declaration.ScriptTreeImpl;
import org.sonar.squidbridge.api.CheckMessage;
import org.sonar.squidbridge.api.SourceFile;

import java.io.File;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Mockito.mock;

public class AstTreeVisitorContextTest extends JavaScriptTreeModelTest {

  private AstTreeVisitorContext context;
  private SourceFile sourceFile;
  private File file;

  @Before
  public void setUp() throws Exception {
    file = TestUtils.getResource("/metrics/lines.js");
    sourceFile = JavaScriptAstScanner.scanSingleFile(file);
    ScriptTreeImpl scriptTree = new ScriptTreeImpl(null, null, null, null);
    Settings settings = new Settings();
    context = new AstTreeVisitorContextImpl(scriptTree, sourceFile, file, SymbolModelImpl.create(scriptTree, null, null), settings);
  }

  @Test
  public void getTree() throws Exception {
    assertThat(context.getTree()).isNotNull();
  }

  @Test
  public void addIssue_with_line_number() throws Exception {
    context.addIssue(mock(JavaScriptCheck.class), 1, "msg");
    assertThat(sourceFile.getCheckMessages().size()).isEqualTo(1);

    CheckMessage checkMessage = sourceFile.getCheckMessages().iterator().next();
    assertThat(checkMessage.getLine()).isEqualTo(1);
    assertThat(checkMessage.formatDefaultMessage()).isEqualTo("msg");
  }

  @Test
  public void addIssue_without_number() throws Exception {
    context.addIssue(mock(JavaScriptCheck.class), 0, "msg");
    assertThat(sourceFile.getCheckMessages().size()).isEqualTo(1);

    CheckMessage checkMessage = sourceFile.getCheckMessages().iterator().next();
    assertThat(checkMessage.getLine()).isNull();
    assertThat(checkMessage.formatDefaultMessage()).isEqualTo("msg");
  }

  @Test
  public void getFileKey() throws Exception {
    assertThat(context.getFileKey()).isNotNull();
  }

  @Test
  public void getFile() throws Exception {
    assertThat(context.getFile()).isEqualTo(file);
  }

}
