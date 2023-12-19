/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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

import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import org.junit.jupiter.api.Test;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;

class BundleAssessorTest {

  static final String BOOTSTRAP =
    "/*!\n" +
    "  * Bootstrap v5.2.2 (https://getbootstrap.com/)\n" +
    "  * Copyright 2011-2022 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)\n" +
    "  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)\n" +
    "  */\n" +
    "!function(t,e){\"object\"==typeof exports&&\"undefined\"!";

  private static final String PDFJS =
    "/**\n" +
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

  private static final String FONT_AWESOME =
    "/*!\n" +
    " * Font Awesome Free 6.2.0 by @fontawesome - https://fontawesome.com\n" +
    " * License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License)\n" +
    " * Copyright 2022 Fonticons, Inc.\n" +
    " */\n" +
    "(function (global, factory) {\n" +
    "  typeof exports === 'object' && typeof module !== 'undefined' ? factory() :\n" +
    "  typeof define === 'function' && define.amd ? define(factory) :\n" +
    "  (factory());\n" +
    "}(this,";

  private static final String BOOTSTRAP_DATEPICKER =
    "/* =========================================================\n" +
    " * bootstrap-datepicker.js\n" +
    " * Repo: https://github.com/eternicode/bootstrap-datepicker/\n" +
    " * Demo: http://eternicode.github.io/bootstrap-datepicker/\n" +
    " * Docs: http://bootstrap-datepicker.readthedocs.org/\n" +
    " * Forked from http://www.eyecon.ro/bootstrap-datepicker\n" +
    " * =========================================================\n" +
    " * Started by Stefan Petre; improvements by Andrew Rowls + contributors\n" +
    " *\n" +
    " * Licensed under the Apache License, Version 2.0 (the \"License\");\n" +
    " * you may not use this file except in compliance with the License.\n" +
    " * You may obtain a copy of the License at\n" +
    " *\n" +
    " * http://www.apache.org/licenses/LICENSE-2.0\n" +
    " *\n" +
    " * Unless required by applicable law or agreed to in writing, software\n" +
    " * distributed under the License is distributed on an \"AS IS\" BASIS,\n" +
    " * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n" +
    " * See the License for the specific language governing permissions and\n" +
    " * limitations under the License.\n" +
    " * ========================================================= */\n" +
    "(function($, undefined){\n" +
    "\tvar $window = $(window);";

  private static final String JQUERY =
    "/*!\n" +
    " * jQuery JavaScript Library v1.4.3\n" +
    " * http://jquery.com/\n" +
    " *\n" +
    " * Copyright 2010, John Resig\n" +
    " * Dual licensed under the MIT or GPL Version 2 licenses.\n" +
    " * http://jquery.org/license\n" +
    " *\n" +
    " * Includes Sizzle.js\n" +
    " * http://sizzlejs.com/\n" +
    " * Copyright 2010, The Dojo Foundation\n" +
    " * Released under the MIT, BSD, and GPL Licenses.\n" +
    " *\n" +
    " * Date: Thu Oct 14 23:10:06 2010 -0400\n" +
    " */\n" +
    "(function( window, undefined ) {\n" +
    "\n" +
    "// Use the correct document accordingly with window argument (sandbox)\n" +
    "var document = window.document;\n" +
    "var jQuery = (function() {";

  @Test
  void test() {
    var assessor = new BundleAssessor();
    assertThat(assessor.test(getInputFile(BOOTSTRAP))).isTrue();
    assertThat(assessor.test(getInputFile(PDFJS))).isTrue();
    assertThat(assessor.test(getInputFile(FONT_AWESOME))).isTrue();
    assertThat(assessor.test(getInputFile(BOOTSTRAP_DATEPICKER))).isTrue();
    assertThat(assessor.test(getInputFile("var x = foo()"))).isFalse();
    assertThat(assessor.test(getInputFile(JQUERY))).isTrue();
  }

  private static DefaultInputFile getInputFile(String content) {
    return new TestInputFileBuilder("module1", "foo.js")
      .setModuleBaseDir(Paths.get(""))
      .setCharset(StandardCharsets.UTF_8)
      .setContents(content)
      .build();
  }
}
