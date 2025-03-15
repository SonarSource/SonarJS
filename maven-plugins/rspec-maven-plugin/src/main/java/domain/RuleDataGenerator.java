package domain;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

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

      this.fileSystem.write(manifestFile, serializer.toJson(ruleManifest.getMetadata()));
    }
  }
}
