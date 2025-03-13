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
