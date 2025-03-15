package application;

import domain.Exception;

public class FileSystem implements domain.FileSystem {

  private final Host host;

  public FileSystem(Host host) {
    this.host = host;
  }

  public String resolve(String first, String... more) {
    return this.host.resolve(first, more);
  }

  public void write(String filePath, String content) throws Exception {
    try {
      this.host.write(filePath, content);
    } catch (IOException e) {
      throw new Exception();
    }
  }
}
