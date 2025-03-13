package domain;

import java.util.ArrayList;
import java.util.stream.Collectors;
import org.apache.commons.text.StringEscapeUtils;

public class RegistrarsGenerator {

  private final Logger logger;
  private final RuleRepository ruleRepository;
  private final FileSystem fileSystem;

  public RegistrarsGenerator(Logger logger, RuleRepository ruleRepository, FileSystem fileSystem) {
    this.logger = logger;
    this.ruleRepository = ruleRepository;
    this.fileSystem = fileSystem;
  }

  public void execute(
    String packageName,
    String languageKey,
    String compatibleLanguageKey,
    String repositoryKey,
    String targetDirectory,
    String profileName
  ) throws Exception {
    logger.log(String.format("Fetching rules for language %s", languageKey));

    var rules = ruleRepository
      .getRulesByLanguage(languageKey)
      .stream()
      .filter(rule -> rule.compatibleLanguages().contains(compatibleLanguageKey))
      .toList();

    // generate the repository factory
    logger.log(
      String.format(
        "Generating the \"%s\" repository factory for language \"%s\" to %s",
        repositoryKey,
        compatibleLanguageKey,
        targetDirectory
      )
    );

    var entryPointBuilder = new StringBuilder();

    var className = String.format("%sRepositoryRegistrar", repositoryKey);

    entryPointBuilder.append(
      String.format(
        """
        package %s;
        import org.sonar.api.server.rule.RulesDefinition;
        import org.sonar.api.SonarRuntime;
        import org.sonarsource.analyzer.commons.RuleMetadataLoader;
        import org.sonarsource.analyzer.commons.domain.*;
        import java.util.Map;
        import java.util.List;
        """,
        packageName
      )
    );
    entryPointBuilder.append(
      String.format(
        """
        public class %s implements RulesDefinition {
          protected RuleMetadataLoader ruleMetadataLoader;

          public %s(SonarRuntime sonarRuntime) {
            this.ruleMetadataLoader = new RuleMetadataLoader(sonarRuntime);
          }
        """,
        className,
        className
      )
    );

    for (var rule : rules) {
      entryPointBuilder.append(
        String.format(
          """
            private void register%s(NewRepository repository) {
          """,
          rule.name()
        )
      );

      var tags = rule.tags().stream().map(tag -> String.format("\"%s\"", tag));
      var remediationCode = "null";
      var remediation = rule.remediation();

      if (remediation != null) {
        var linearFactorCode = "null";
        var linearFactor = remediation.linearFactor();

        if (linearFactor != null) {
          linearFactorCode = String.format("\"%s\"", linearFactor);
        }

        var linearOffsetCode = "null";
        var linearOffset = remediation.linearOffset();

        if (linearOffset != null) {
          linearOffsetCode = String.format("\"%s\"", linearOffset);
        }

        var linearDescriptionCode = "null";
        var linearDescription = remediation.linearDescription();

        if (linearDescription != null) {
          linearDescriptionCode = String.format(
            "\"%s\"",
            StringEscapeUtils.escapeJava(linearDescription)
          );
        }

        remediationCode = String.format(
          """
          new RuleManifestRemediation() {
            public String func() {
              return "%s";
            }
            public String constantCost() {
              return "%s";
            }
            public String linearFactor() {
              return %s;
            }
            public String linearOffset() {
              return %s;
            }
            public String linearDescription() {
              return %s;
            }
          }""",
          remediation.function(),
          remediation.cost(),
          linearFactorCode,
          linearOffsetCode,
          linearDescriptionCode
        );
      }

      var parametersCodes = new ArrayList<String>();

      for (var parameter : rule.parameters()) {
        parametersCodes.add(
          String.format(
            """
            new RuleManifestParameter() {
              public String defaultValue() {
                return "%s";
              }
              public String description() {
                return "%s";
              }
              public String names() {
                return "%s";
              }
              public String type() {
                return "%s";
              }
            }""",
            StringEscapeUtils.escapeJava(parameter.defaultValue()),
            StringEscapeUtils.escapeJava(parameter.description()),
            parameter.name(),
            parameter.type()
          )
        );
      }

      // code
      var codeCode = "null";
      var code = rule.code();

      if (code != null) {
        String impactsCode = code
          .impacts()
          .entrySet()
          .stream()
          .map(impact -> {
            return String.format("\"%s\", \"%s\"", impact.getKey(), impact.getValue());
          })
          .collect(Collectors.joining(", "));

        codeCode = String.format(
          """
          new RuleManifestCode() {
            public Map<String, String> impacts() {
              return Map.of(%s);
            }
            public String attribute() {
              return "%s";
            }
          }""",
          impactsCode,
          rule.code().attribute()
        );
      }

      entryPointBuilder.append(
        String.format(
          """
            this.ruleMetadataLoader.createRuleFromRuleManifest(repository, new RuleManifest() {
              public RuleManifestCode code() {
                return %s;
              }
              public String defaultSeverity() {
                return "%s";
              }
              public String htmlDocumentation() {
                return "%s";
              }
              public String name() {
                return "%s";
              }
              public List<RuleManifestParameter> parameters() {
                return List.of(%s);
              }
              public RuleManifestRemediation remediation() {
                return %s;
              }
              public String scope() {
                return "%s";
              }
              public String status() {
                return "%s";
              }
              public List<String> tags() {
                return List.of(%s);
              }
              public String title() {
                return "%s";
              }
              public String type() {
                return "%s";
              }
            });
          """,
          codeCode,
          rule.defaultSeverity(),
          StringEscapeUtils.escapeJava(rule.htmlDocumentation()),
          rule.name(),
          String.join(",", parametersCodes),
          remediationCode,
          rule.scope(),
          rule.status(),
          tags.collect(Collectors.joining(",")),
          StringEscapeUtils.escapeJava(rule.title()),
          rule.type()
        )
      );

      entryPointBuilder.append("}\n");
    }

    entryPointBuilder.append(
      String.format(
        """
        public void define(Context context) {
          NewRepository repository = context.createRepository("%s", "%s").setName("SonarAnalyzer");
        """,
        repositoryKey,
        compatibleLanguageKey
      )
    );

    for (var rule : rules) {
      entryPointBuilder.append(
        String.format(
          """
          this.register%s(repository);
          """,
          rule.name()
        )
      );
    }

    entryPointBuilder.append(
      """
          repository.done();
        }
      }
      """
    );

    var entryPointFileName = this.fileSystem.resolve(targetDirectory, className + ".java");

    this.fileSystem.write(entryPointFileName, entryPointBuilder.toString());

    // generate the profile definition class
    logger.log(
      String.format(
        "Generating the \"%s\" profile definition for language \"%s\" to %s",
        profileName,
        compatibleLanguageKey,
        targetDirectory
      )
    );

    var profileDefinitionClassName = String.format("%sProfileRegistrar", repositoryKey);
    var profileDefinitionBuilder = new StringBuilder();

    profileDefinitionBuilder.append(
      String.format(
        """
        package %s;
        import org.sonar.api.server.profile.BuiltInQualityProfilesDefinition;
        """,
        packageName
      )
    );

    profileDefinitionBuilder.append(
      String.format(
        "public class %s implements BuiltInQualityProfilesDefinition {\n",
        profileDefinitionClassName
      )
    );
    profileDefinitionBuilder.append("public void define(Context context) {\n");

    profileDefinitionBuilder.append(
      String.format(
        """
        var newProfile = context.createBuiltInQualityProfile(
              "%s",
              "%s"
            );
        """,
        profileName,
        compatibleLanguageKey
      )
    );

    for (var rule : rules) {
      if (rule.qualityProfiles().contains(profileName)) {
        profileDefinitionBuilder.append(
          String.format("newProfile.activateRule(\"%s\", \"%s\");", repositoryKey, rule.name())
        );
      }
    }

    profileDefinitionBuilder.append("newProfile.done();}}");

    var profileDefinitionFileName =
      this.fileSystem.resolve(targetDirectory, profileDefinitionClassName + ".java");

    this.fileSystem.write(profileDefinitionFileName, profileDefinitionBuilder.toString());
  }
}
