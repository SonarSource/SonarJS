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

import com.google.common.collect.Lists;
import org.apache.commons.collections.map.HashedMap;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.component.ResourcePerspectives;
import org.sonar.api.config.Settings;
import org.sonar.javascript.JavaScriptAstScanner;
import org.sonar.plugins.javascript.api.JavaScriptFileScanner;
import org.sonar.javascript.ast.visitors.VisitorsBridge;
import org.sonar.javascript.checks.AbstractJQueryCheck;
import org.sonar.squidbridge.api.SourceFile;

import java.io.File;
import java.util.Map;

import static org.mockito.Mockito.mock;

public class TreeCheckTest {

  public SourceFile scanFile(String fileName, JavaScriptFileScanner check) {
    Settings settings = new Settings();
    Map<String, String> properties = new HashedMap();
    properties.put(AbstractJQueryCheck.JQUERY_OBJECT_ALIASES, AbstractJQueryCheck.JQUERY_OBJECT_ALIASES_DEFAULT_VALUE);
    settings.addProperties(properties);
    return JavaScriptAstScanner.scanSingleFile(
      new File(fileName),
      new VisitorsBridge(Lists.newArrayList(check), mock(ResourcePerspectives.class), new DefaultFileSystem(), settings));
  }

}
