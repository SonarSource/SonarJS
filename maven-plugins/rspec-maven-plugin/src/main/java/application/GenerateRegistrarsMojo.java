package application;

import domain.*;
import domain.Exception;
import infrastructure.JVMHost;
import java.io.IOException;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

@Mojo(name = "generate-registrars")
public class GenerateRegistrarsMojo extends AbstractMojo {

  @Parameter(required = true)
  private String languageKey;

  @Parameter(required = true)
  private String targetDirectory;

  @Parameter(defaultValue = "https://github.com/SonarSource/rspec.git")
  private String vcsRepositoryUrl;

  @Parameter(defaultValue = "master")
  private String vcsBranchName;

  @Parameter(defaultValue = "Sonar way")
  private String profileName;

  @Parameter(required = true)
  private String packageName;

  // todo: should probably not be required and default to languageKey
  @Parameter(required = true)
  private String compatibleLanguageKey;

  // todo: should probably not be required and default to languageKey
  @Parameter(required = true)
  private String repositoryKey;

  @Override
  public void execute() throws MojoExecutionException {
    var host = new JVMHost();
    var logger = this.getLog();

    try {
      var generator = new RegistrarsGenerator(
        logger::info,
        new RuleRepository(this.vcsRepositoryUrl, this.vcsBranchName, logger),
        new FileSystem(host)
      );

      generator.execute(
        this.packageName,
        this.languageKey,
        this.compatibleLanguageKey,
        this.repositoryKey,
        this.targetDirectory,
        this.profileName
      );
    } catch (Exception | IOException e) {
      throw new MojoExecutionException(e);
    }
  }
}
