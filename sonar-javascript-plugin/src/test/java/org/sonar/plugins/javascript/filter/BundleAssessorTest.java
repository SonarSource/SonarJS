/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
package org.sonar.plugins.javascript.filter;

import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import org.junit.jupiter.api.Test;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;

import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;

class BundleAssessorTest {

  private static final String BOOTSTRAP = "/*!\n" +
    "  * Bootstrap v5.2.2 (https://getbootstrap.com/)\n" +
    "  * Copyright 2011-2022 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)\n" +
    "  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)\n" +
    "  */\n" +
    "!function(t,e){\"object\"==typeof exports&&\"undefined\"!";

  private static final String PDFJS = "/**\n" +
    " * @licstart The following is the entire license notice for the\n" +
    " * Javascript code in this page\n" +
    " *\n" +
    " * Copyright 2019 Mozilla Foundation\n" +
    " *\n" +
    " * Licensed under the Apache License, Version 2.0 (the \"License\");\n" +
    " * you may not use this file except in compliance with the License.\n" +
    " * You may obtain a copy of the License at\n" +
    " *\n" +
    " *     http://www.apache.org/licenses/LICENSE-2.0\n" +
    " *\n" +
    " * Unless required by applicable law or agreed to in writing, software\n" +
    " * distributed under the License is distributed on an \"AS IS\" BASIS,\n" +
    " * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n" +
    " * See the License for the specific language governing permissions and\n" +
    " * limitations under the License.\n" +
    " *\n" +
    " * @licend The above is the entire license notice for the\n" +
    " * Javascript code in this page\n" +
    " */\n" +
    "\n" +
    "(function webpackUniversalModuleDefinition(root, factory) {\n" +
    "\tif(typeof exports === 'object' && typeof module === ";



  @Test
  void test() {
    var assessor = new BundleAssessor();
    assertThat(assessor.test(getInputFile(BOOTSTRAP))).isTrue();
    assertThat(assessor.test(getInputFile(PDFJS))).isTrue();
    assertThat(assessor.test(getInputFile("var x = foo()"))).isFalse();
  }

  private static DefaultInputFile getInputFile(String content) {
    return new TestInputFileBuilder("module1", "foo.js")
      .setModuleBaseDir(Paths.get(""))
      .setCharset(StandardCharsets.UTF_8)
      .setContents(content)
      .build();
  }

}
