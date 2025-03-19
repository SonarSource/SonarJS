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

import com.sonarsource.ruleapi.domain.RuleFiles;
import com.sonarsource.ruleapi.github.GitClone;
import com.sonarsource.ruleapi.github.GitHubRuleMaker;
import com.sonarsource.ruleapi.utilities.RuleApiCache;
import domain.Rule;
import java.io.IOException;
import java.util.List;
import org.apache.maven.plugin.logging.Log;

public class RuleRepository implements domain.RuleRepository {

  private final GitHubRuleMaker ruleMaker;

  public RuleRepository(String url, String branchName, Log logger) throws IOException {
    /**
     * Unfortunately, GitHubRuleMaker clones the repository during its creation.
     * Thus, we need to log as soon as we create it.
     */
    logger.info(String.format("Cloning repository %s, branch %s", url, branchName));

    var cacheKey = url.replace(":", "_").replace("/", "_");

    logger.debug(String.format("Git repository cache key is %s", cacheKey));

    var gitClone = new GitClone(url, RuleApiCache.getCachePath().resolve(cacheKey), branchName);

    this.ruleMaker = new GitHubRuleMaker(gitClone);
  }

  public List<RuleFiles> getRuleManifestsByRuleSubdirectory(String ruleSubdirectory) {
    return this.ruleMaker.getRulesByRuleSubdirectory(ruleSubdirectory);
  }

  public List<Rule> getRulesByLanguage(String languageKey) {
    var ruleManifests = this.getRuleManifestsByRuleSubdirectory(languageKey);

    return ruleManifests
      .stream()
      .map(ruleManifest -> RuleFactory.create(languageKey, ruleManifest))
      .toList();
  }
}
