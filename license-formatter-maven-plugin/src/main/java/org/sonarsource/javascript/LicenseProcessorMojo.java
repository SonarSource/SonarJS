package org.sonarsource.javascript;

import jakarta.xml.bind.JAXBContext;
import jakarta.xml.bind.Unmarshaller;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;
import org.sonarsource.javascript.model.Dependency;
import org.sonarsource.javascript.model.LicenseSummary;

@Mojo(name = "process-licenses", defaultPhase = LifecyclePhase.PREPARE_PACKAGE)
public class LicenseProcessorMojo extends AbstractMojo {

  @Parameter(
    defaultValue = "${project.build.directory}/licenses.xml",
    property = "license.xml.path",
    required = true
  )
  private File licensesXmlFile;

  @Parameter(
    defaultValue = "${project.build.directory}/temp-licenses",
    property = "license.source.dir",
    required = true
  )
  private File licensesSourceDir;

  @Parameter(
    defaultValue = "${project.build.directory}/licenses",
    property = "license.output.dir",
    required = true
  )
  private File outputDir;

  @Parameter(defaultValue = "${project.basedir}/../../LICENSE.txt", property = "license.main.file")
  private File rootLicenseFile;

  public void execute() throws MojoExecutionException {
    getLog().info("Starting license processing...");

    if (!licensesXmlFile.exists()) {
      throw new MojoExecutionException(
        "licenses.xml file not found at " + licensesXmlFile.getAbsolutePath()
      );
    }

    try {
      Files.createDirectories(outputDir.toPath());
      Path destinationLicenseFile = outputDir.toPath().resolve("LICENSE.txt");
      Files.copy(
        rootLicenseFile.toPath(),
        destinationLicenseFile,
        StandardCopyOption.REPLACE_EXISTING
      );
      getLog().info("Copied main LICENSE.txt");

      Path thirdPartyDir = outputDir.toPath().resolve("THIRD_PARTY_LICENSES");
      Files.createDirectories(thirdPartyDir);

      // 2. Parse XML
      JAXBContext jaxbContext = JAXBContext.newInstance(LicenseSummary.class);
      Unmarshaller jaxbUnmarshaller = jaxbContext.createUnmarshaller();
      LicenseSummary summary = (LicenseSummary) jaxbUnmarshaller.unmarshal(licensesXmlFile);

      // 3. Process each dependency
      for (Dependency dep : summary.getDependencies()) {
        if (
          dep.getLicenses() == null ||
          dep.getLicenses().isEmpty() ||
          dep.getLicenses().get(0).getFile() == null
        ) {
          getLog().warn("No license file found in XML for " + dep.getArtifactId() + ". Skipping.");
          continue;
        }

        Path destLicensePath = thirdPartyDir.resolve(
          String.format("%s-LICENSE.txt", dep.getArtifactId())
        );

        String sourceLicenseFileName = dep.getLicenses().get(0).getFile();
        Path sourceLicensePath = licensesSourceDir.toPath().resolve(sourceLicenseFileName);

        if (Files.exists(sourceLicensePath)) {
          Files.copy(sourceLicensePath, destLicensePath, StandardCopyOption.REPLACE_EXISTING);
          getLog().info("Processed license for " + destLicensePath);
        } else {
          getLog().warn(
            "Source license file not found for " + destLicensePath + " at " + sourceLicensePath
          );
        }
      }

      getLog().info("Generated main LICENSE.txt");
    } catch (Exception e) {
      throw new MojoExecutionException("Error processing license files", e);
    }
    getLog().info("License processing finished successfully.");
  }
}
