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
import org.sonar.javascript.JavaScriptAstScanner;
import org.sonar.javascript.JavaScriptFileScanner;
import org.sonar.javascript.ast.visitors.VisitorsBridge;
import org.sonar.squidbridge.api.SourceFile;

import java.io.File;

public class TreeCheckTest {

  public SourceFile scanFile(String fileName, JavaScriptFileScanner check) {
    return JavaScriptAstScanner.scanSingleFile(new File(fileName), new VisitorsBridge(Lists.newArrayList(check)));
  }

}
