/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.javascript.tree.symbols;

import com.google.common.annotations.VisibleForTesting;
import com.google.common.collect.ImmutableSet;
import com.google.common.io.CharStreams;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import javax.annotation.Nullable;
import org.sonar.api.config.Configuration;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

public class GlobalVariableNames {

  private static final Gson gson = new Gson();

  private static final String GLOBALS_FILE = "globals.json";

  public static final String ENVIRONMENTS_PROPERTY_KEY = "sonar.javascript.environments";
  public static final String ENVIRONMENTS_DEFAULT_VALUE = "amd, applescript, atomtest, browser, commonjs, couch, embertest, flow, greasemonkey, jasmine, jest, jquery, " +
    "meteor, mocha, mongo, nashorn, node, phantomjs, prototypejs, protractor, qunit, rhino, serviceworker, shared-node-browser, shelljs, webextensions, worker, wsh, yui";

  public static final String GLOBALS_PROPERTY_KEY = "sonar.javascript.globals";
  public static final String GLOBALS_DEFAULT_VALUE = "angular,goog,google,OpenLayers,d3,dojo,dojox,dijit,Backbone,moment,casper";

  private static final Map<String, Set<String>> ENVIRONMENTS = environments();
  private static final Logger LOGGER = Loggers.get(GlobalVariableNames.class);

  private final Set<String> names;

  public GlobalVariableNames(@Nullable Configuration configuration) {
    ImmutableSet.Builder<String> namesBuilder = ImmutableSet.builder();

    Optional<Set<String>> builtin = globalsFromEnvironment("builtin");
    builtin.ifPresent(namesBuilder::addAll);

    if (configuration != null) {
      namesBuilder.add(configuration.getStringArray(GLOBALS_PROPERTY_KEY));
      for (String environmentName : configuration.getStringArray(ENVIRONMENTS_PROPERTY_KEY)) {
        Optional<Set<String>> namesFromCurrentEnvironment = globalsFromEnvironment(environmentName);

        if (namesFromCurrentEnvironment.isPresent()) {
          namesBuilder.addAll(namesFromCurrentEnvironment.get());

        } else {
          LOGGER.warn(ENVIRONMENTS_PROPERTY_KEY + " contains an unknown environment: " + environmentName);
        }
      }
    }
    this.names = namesBuilder.build();
  }

  @VisibleForTesting
  static Map<String, Set<String>> environments() {
    InputStream stream = GlobalVariableNames.class.getResourceAsStream(GLOBALS_FILE);
    InputStreamReader reader = new InputStreamReader(stream, StandardCharsets.UTF_8);
    try {
      String str = CharStreams.toString(reader);
      Type stringStringMap = new TypeToken<Map<String, Set<String>>>(){}.getType();
      return gson.fromJson(str, stringStringMap);

    } catch (IOException e) {
      throw new IllegalStateException("Cannot load " + GLOBALS_FILE, e);
    }
  }

  public Set<String> names() {
    return names;
  }

  private static Optional<Set<String>> globalsFromEnvironment(String environment) {
    if (ENVIRONMENTS.containsKey(environment)) {
      return Optional.of(ENVIRONMENTS.get(environment));
    } else {
      return Optional.empty();
    }
  }
}
