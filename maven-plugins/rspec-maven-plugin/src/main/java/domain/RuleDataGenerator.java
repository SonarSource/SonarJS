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
package domain;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sonarsource.ruleapi.domain.Profile;
import java.util.ArrayList;

public class RuleDataGenerator {

  private final Logger logger;
  private final RuleRepository ruleRepository;
  private final FileSystem fileSystem;

  public RuleDataGenerator(Logger logger, RuleRepository ruleRepository, FileSystem fileSystem) {
    this.logger = logger;
    this.ruleRepository = ruleRepository;
    this.fileSystem = fileSystem;
  }

  public void execute(String ruleSubdirectory, String targetDirectory) throws Exception {
    logger.log(String.format("Generating %s rule data into %s", ruleSubdirectory, targetDirectory));

    var ruleManifests = ruleRepository.getRuleManifestsByRuleSubdirectory(ruleSubdirectory);
    var serializer = new GsonBuilder().setPrettyPrinting().create();

    for (var ruleManifest : ruleManifests) {
      var name = ruleManifest.getKey();

      var documentationFileName = name + ".html";
      var documentationFile = this.fileSystem.resolve(targetDirectory, documentationFileName);

      this.fileSystem.write(documentationFile, ruleManifest.getDescription());

      var manifestFileName = name + ".json";
      var manifestFile = this.fileSystem.resolve(targetDirectory, manifestFileName);

      var manifest = ruleManifest.getMetadata();

      var qualityProfiles = ruleManifest
        .getQualityProfiles()
        .stream()
        .map(Profile::getName)
        .toList();

      manifest.add("defaultQualityProfiles", serializer.toJsonTree(qualityProfiles));

      this.fileSystem.write(manifestFile, serializer.toJson(manifest));
    }
  }
}
