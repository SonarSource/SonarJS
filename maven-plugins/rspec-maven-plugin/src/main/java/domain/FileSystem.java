package domain;

public interface FileSystem {
  String resolve(String first, String... more);

  /**
   * Write the passed `content` into the file located at the passed `filePath`, creating intermediate directories in the process.
   *
   * @param filePath The absolute path of the file to write into
   * @param content The content to write into the file
   * @throws Exception
   */
  void write(String filePath, String content) throws Exception;
}
