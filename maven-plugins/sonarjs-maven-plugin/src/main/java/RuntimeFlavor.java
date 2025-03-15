public class RuntimeFlavor {

  private String name;
  private String url;
  private String checksum;
  private String binaryName;

  public void setName(String name) {
    this.name = name;
  }

  public String getName() {
    return name;
  }

  public void setUrl(String url) {
    this.url = url;
  }

  public String getUrl() {
    return url;
  }

  public void setChecksum(String checksum) {
    this.checksum = checksum;
  }

  public String getChecksum() {
    return checksum;
  }

  public void setBinaryName(String binaryName) {
    this.binaryName = binaryName;
  }

  public String getBinaryName() {
    return binaryName;
  }
}
