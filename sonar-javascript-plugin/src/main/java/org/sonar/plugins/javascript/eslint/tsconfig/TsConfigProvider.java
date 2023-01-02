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
package org.sonar.plugins.javascript.eslint.tsconfig;

import java.io.IOException;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.eslint.ProjectChecker;

import static java.util.Collections.emptyList;

public class TsConfigProvider {

  private static final Logger LOG = Loggers.get(TsConfigProvider.class);

  public static List<String> generateDefaultTsConfigFile(SensorContext context, @Nullable ProjectChecker projectChecker,
    TsConfigFileCreator tsConfigFileCreator) throws IOException {
    return getTsConfigFiles(context, projectChecker, tsConfigFileCreator);
  }

  public static List<String> searchForTsConfigFiles(SensorContext context) throws IOException {
    // When searching for tsconfig.json files we don't generate default files therefore we don't need either
    // TSConfigFileCreator or ProjectChecker. The later aims at verifying there are not too many files for
    // TypeScript when using the default tsconfig.json file.
    return getTsConfigFiles(context, null, null);
  }

  /**
   * Relying on (in order of priority)
   * 1. Property sonar.typescript.tsconfigPath(s) if no tsconfig.json file creator
   * 2. Looking up file system if no tsconfig.json file creator
   * 3. Creating a tmp tsconfig.json if SonarQube or SonarLint below limit (see SonarLintProjectChecker)
   */
  private static List<String> getTsConfigFiles(SensorContext context, @Nullable ProjectChecker projectChecker,
    @Nullable TsConfigFileCreator tsConfigFileCreator) throws IOException {
    List<Provider> providers;
    if (tsConfigFileCreator == null) {
      providers = List.of(new PropertyTsConfigProvider(), new LookupTsConfigProvider());
    } else if (!isBeyondLimit(context, projectChecker)) {
      providers = List.of(new DefaultTsConfigProvider(tsConfigFileCreator));
    } else {
      providers = emptyList();
    }
    var tsConfigProvider = new TsConfigProvider(context, providers);
    List<String> tsconfigs = tsConfigProvider.tsconfigs();
    LOG.info("Generated the list of tsconfig files: {}", tsconfigs);
    return tsconfigs;
  }

  private static boolean isBeyondLimit(SensorContext context, @Nullable ProjectChecker projectChecker) {
    if (context.runtime().getProduct() == SonarProduct.SONARQUBE) {
      return true;
    } else if (projectChecker == null) {
      return true;
    } else {
      projectChecker.checkOnce(context);
      return projectChecker.isBeyondLimit();
    }
  }

  private final SensorContext context;
  private final List<Provider> providers;

  public TsConfigProvider(SensorContext context, List<Provider> providers) {
    this.context = context;
    this.providers = List.copyOf(providers);
  }

  public List<String> tsconfigs() throws IOException {
    for (Provider provider : providers) {
      List<String> tsconfigs = provider.tsconfigs(context);
      if (!tsconfigs.isEmpty()) {
        return tsconfigs;
      }
    }
    return emptyList();
  }

}
