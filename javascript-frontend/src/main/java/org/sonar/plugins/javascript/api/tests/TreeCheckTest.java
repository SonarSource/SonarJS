/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.plugins.javascript.api.tests;

import java.io.File;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import org.sonar.api.config.Settings;
import org.sonar.javascript.tree.symbols.type.JQuery;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.squidbridge.api.CheckMessage;

public class TreeCheckTest {

  protected TestCheckContext getContext(File file, JavaScriptCheck check) {
    return new TestCheckContext(file, settings(), check);
  }

  public Collection<CheckMessage> getIssues(String relativePath, JavaScriptCheck check) {
    TestCheckContext context = getContext(new File(relativePath), check);
    check.scanFile(context);
    return context.getIssues();
  }

  protected Settings settings() {
    Settings settings = new Settings();

    Map<String, String> properties = new HashMap<>();
    properties.put(JQuery.JQUERY_OBJECT_ALIASES, JQuery.JQUERY_OBJECT_ALIASES_DEFAULT_VALUE);
    settings.addProperties(properties);

    return settings;
  }
}
