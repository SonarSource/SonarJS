import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.URL;
import java.nio.channels.Channels;
import java.nio.channels.ReadableByteChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.apache.commons.codec.digest.DigestUtils;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugin.MojoFailureException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;
import org.codehaus.plexus.archiver.tar.TarGZipUnArchiver;
import org.codehaus.plexus.archiver.zip.ZipUnArchiver;
import org.codehaus.plexus.components.io.filemappers.FileMapper;
import org.codehaus.plexus.components.io.fileselectors.FileInfo;
import org.codehaus.plexus.components.io.fileselectors.FileSelector;

@Mojo(name = "download-runtimes")
public class DownloadRuntimesMojo extends AbstractMojo {

  @Parameter(required = true)
  private String targetDirectory;

  @Parameter(required = true)
  private List<RuntimeFlavor> flavors;

  @Parameter(required = true)
  private String version;

  @Override
  public void execute() throws MojoExecutionException, MojoFailureException {
    for (var flavor : this.flavors) {
      try {
        var url = new URL(flavor.getUrl());
        var filename = url.getFile();
        var destinationFile = Path.of(this.targetDirectory, filename);

        destinationFile.toFile().getParentFile().mkdirs();

        this.download(flavor, destinationFile);
        this.extract(flavor, destinationFile.toFile());
      } catch (Exception e) {
        throw new MojoExecutionException("Error while downloading " + flavor.getUrl(), e);
      }
    }
  }

  private void download(RuntimeFlavor flavor, Path destinationFile) throws Exception {
    if (Files.exists(destinationFile)) {
      getLog().info(String.format("Skipping download, file %s already exists.", destinationFile));

      return;
    }

    var url = new URL(flavor.getUrl());

    getLog().info("Downloading " + url + " to " + destinationFile);

    var inputStream = url.openStream();

    ReadableByteChannel readableByteChannel = Channels.newChannel(inputStream);

    var fileOutputStream = new FileOutputStream(destinationFile.toString());
    var fileChannel = fileOutputStream.getChannel();

    fileChannel.transferFrom(readableByteChannel, 0, Long.MAX_VALUE);

    var md5 = DigestUtils.sha256Hex(new FileInputStream(destinationFile.toFile()));

    if (!md5.equals(flavor.getChecksum())) {
      throw new Exception(String.format("Invalid checksum for %s", flavor.getUrl()));
    }
  }

  private void extract(RuntimeFlavor flavor, File sourceFile) throws IOException {
    var unArchiver = sourceFile.getName().endsWith("zip")
      ? new ZipUnArchiver(sourceFile)
      : new TarGZipUnArchiver(sourceFile);

    var fileSelector = new FileSelector() {
      public boolean isSelected(FileInfo fileInfo) throws IOException {
        return fileInfo.getName().endsWith(flavor.getBinaryName());
      }
    };

    var fileMapper = new FileMapper() {
      public String getMappedFileName(String filename) {
        var filenamePath = Path.of(filename);
        var subpath = filenamePath.subpath(1, filenamePath.getNameCount());

        return Path.of(flavor.getName(), subpath.toString()).toString();
      }
    };

    unArchiver.setDestDirectory(new File(this.targetDirectory));
    unArchiver.setFileSelectors(new FileSelector[] { fileSelector });
    unArchiver.setFileMappers(new FileMapper[] { fileMapper });
    unArchiver.extract();

    this.writeManifest(flavor);
  }

  private void writeManifest(RuntimeFlavor flavor) throws IOException {
    var versionOutputFilePath = Path.of(this.targetDirectory, flavor.getName(), "version.txt");

    this.getLog()
      .info(
        // todo: this should be the flavor checksum that we output
        String.format("Deploying version \"%s\" to %s", this.version, versionOutputFilePath)
      );

    Files.write(versionOutputFilePath, this.version.getBytes());
  }
}
