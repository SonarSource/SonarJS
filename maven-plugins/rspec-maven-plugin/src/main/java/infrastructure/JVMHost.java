package infrastructure;

import application.Host;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Paths;

public class JVMHost implements Host {

  public String resolve(String first, String... more) {
    return Paths.get(first, more).toString();
  }

  public void write(String filePath, String content) throws application.IOException {
    try {
      var file = new File(filePath);

      file.getParentFile().mkdirs();

      var writer = new FileWriter(file);

      writer.write(content);
      writer.close();
    } catch (IOException e) {
      throw new application.IOException();
    }
  }
}
