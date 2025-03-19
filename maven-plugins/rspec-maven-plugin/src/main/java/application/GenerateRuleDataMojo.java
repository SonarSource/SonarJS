/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package application;

import domain.*;
import domain.Exception;
import infrastructure.JVMHost;
import java.io.IOException;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

@Mojo(name = "generate-rule-data")
public class GenerateRuleDataMojo extends AbstractMojo {

  @Parameter(required = true)
  private String ruleSubdirectory;

  @Parameter(required = true)
  private String targetDirectory;

  @Parameter(defaultValue = "https://github.com/SonarSource/rspec.git")
  private String vcsRepositoryUrl;

  @Parameter(defaultValue = "master")
  private String vcsBranchName;

  @Override
  public void execute() throws MojoExecutionException {
    var host = new JVMHost();
    var logger = this.getLog();

    try {
      var generator = new RuleDataGenerator(
        logger::info,
        new RuleRepository(this.vcsRepositoryUrl, this.vcsBranchName, logger),
        new FileSystem(host)
      );

      generator.execute(this.ruleSubdirectory, this.targetDirectory);
    } catch (Exception | IOException e) {
      throw new MojoExecutionException(e);
    }
  }
}
