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
import java.util.ArrayList;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.plugins.javascript.eslint.ProjectChecker;

import static java.util.Collections.emptyList;

public class TsConfigProvider {

  public static Builder builder(SensorContext context) {
    return new Builder(context);
  }

  public static TsConfigProvider build(SensorContext context) {
    return builder(context).build();
  }

  /**
   * Relying on (in order of priority)
   * 1. Property sonar.typescript.tsconfigPath(s) if not skipSearchForTsConfigFiles
   * 2. Looking up file system if not skipSearchForTsConfigFiles
   * 3. Creating a tmp tsconfig.json if SonarQube or SonarLint below limit (see SonarLintProjectChecker)
   */
  public static class Builder {
    private final SensorContext context;
    private boolean search = true;
    private TsConfigFileCreator tsConfigFileCreator;
    private ProjectChecker projectChecker;

    private Builder(SensorContext context) {
      this.context = context;
    }

    public Builder skipSearchForTsConfigFiles() {
      search = false;
      return this;
    }

    public Builder with(TsConfigFileCreator tsConfigFileCreator) {
      this.tsConfigFileCreator = tsConfigFileCreator;
      return this;
    }

    public Builder with(@Nullable ProjectChecker projectChecker) {
      this.projectChecker = projectChecker;
      return this;
    }

    public TsConfigProvider build() {
      var providers = new ArrayList<Provider>();
      if (search) {
        providers.addAll(List.of(new PropertyTsConfigProvider(), new LookupTsConfigProvider()));
      }
      if (!isBeyondLimit() && tsConfigFileCreator != null) {
        providers.add(new DefaultTsConfigProvider(tsConfigFileCreator));
      }
      return new TsConfigProvider(context, providers);
    }

    boolean isBeyondLimit() {
      if (context.runtime().getProduct() == SonarProduct.SONARQUBE) {
        return false;
      } else if (projectChecker == null) {
        return true;
      } else {
        projectChecker.checkOnce(context);
        return projectChecker.isBeyondLimit();
      }
    }
  }

  private final SensorContext context;
  private final List<Provider> providers;

  private TsConfigProvider(SensorContext context, List<Provider> providers) {
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
