package checks;

import java.net.PasswordAuthentication;
import java.sql.DriverManager;
import java.sql.SQLException;
import javax.naming.Context;

/**
 * This check detect hardcoded password in multiples cases:
 * - 1. String literal
 * - 1.1 Urls
 * - 2. Variable declaration
 * - 3. Assignment
 * - 4. Method invocations
 * - 4.1 Equals
 * - 4.2 API setting password
 * - 4.3 Setting password
 * - 5. Constructors
 */
class HardCodedPasswordCheckSample {

  String fieldNameWithPasswordInIt = retrievePassword();

  private static final String PASSED = "passed"; // compliant nothing to do with passwords
  private static final String EMPTY = "";

  private void a(char[] pwd, String var) throws SQLException {
    // ========== 1. String literal ==========
    // The variable name does not influence the issue, only the string is considered.
    String variable1 = "blabla";
    String variable2 = "login=a&password=xxx"; // Noncompliant {{'password' detected in this expression, review this potentially hard-coded password.}}
//                     ^^^^^^^^^^^^^^^^^^^^^^
    String variable3 = "login=a&passwd=xxx"; // Noncompliant
    String variable4 = "login=a&pwd=xxx"; // Noncompliant
    String variable5 = "login=a&password=";
    String variable6 = "login=a&password= ";
    String params = "user=admin&password=Password123"; // Noncompliant
    String sqlserver = "pgsql:host=localhost port=5432 dbname=test user=postgres password=postgres"; // Noncompliant

    // Password starting with "?" are ignored
    String query1 = "password=?hard-to-find"; // Compliant
    String query1_1 = "password=???"; // Compliant
    // Password starting with "\"" are ignored
    String query7 = "\"password=\""; // Compliant
    // Password starting with ":" are ignored
    String query2 = "password=:password"; // Compliant
    String query3 = "password=:param"; // Compliant
    // Password containing "%s" are ignored
    String query5 = "password=%s"; // Compliant
    String query6 = "password=\"%s\""; // Compliant
    // Password shorter than 2 characters are ignored
    String query1_2 = "password=X"; // Compliant
    // "anonymous" is explicitly ignored
    String query1_3 = "password=anonymous"; // Compliant
    // Not hardcoded
    String query4 = "password='" + pwd + "'"; // Compliant

    // When the string is in a variable with a name containing password, we let the logic about variable declaration (2.) determine if we should raise an issue.
    String inPasswordConstant = "user=admin&password=Password123"; // Compliant

    // Password are correctly extracted
    String query10 = "password=something&user=user"; // Noncompliant
    String query11 = "password=anonymous&user=user"; // Compliant, the password is the excluded "anonymous" and not "anonymous&user=user"
    String query17 = "password=anonymous,user=user"; // Compliant
    String query18 = "password=anonymous|user=user"; // Compliant
    String query12 = "password=anonymous user=user"; // Compliant
    String query121 = "password=anonymous;user=user"; // Compliant
    String query122 = "password=anonymous#user=user"; // Compliant
    String query13 = "password=anonymous\tuser=user"; // Compliant
    String query14 = "password=anonymous\nuser=user"; // Compliant
    String query15 = "password=something&user=user%s"; // Noncompliant
    String query16 = "passwordProtected password=:notAPassword"; // Compliant, the password is starting with ":" and therefore excluded

    // ========== 1.2 Urls ==========
    // No exclusion is made when the password if found in an url
    String[] urls = {
      "http://user:123456@server.com/path", // Noncompliant {{Review this hard-coded URL, which may contain a password.}}
//    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      "ftp://anonymous:anonymous@wustl.edu",    // OK, user == password
      "ftp://:anonymous@wustl.edu", // Noncompliant
      "http://admin:admin@server.com/path",     // OK, user == password
      "http://user:@server.com/path",           // OK, password is empty
      "http://user@server.com/path",            // OK, no password
      "https://server:80/path",                 // OK, no user and password
      "http://server.com/path",                 // OK, no user and password
      "http://:123456@server.com/path", // Noncompliant
      "HTTPS://:token0932448209@server.com", // Noncompliant
      "https://invalid::url::format",
      "too-long-url-scheme://user:123456@server.com",
    };

    // ========== 2. Variable declaration ==========
    // The variable name should contain a password word
    final String MY_PASSWORD = "1234"; // Noncompliant
    String variableNameWithPasswordInIt = "xxx"; // Noncompliant {{'Password' detected in this expression, review this potentially hard-coded password.}}
//         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    String variableNameWithPassphraseInIt = "xxx"; // Noncompliant {{'Passphrase' detected in this expression, review this potentially hard-coded password.}}
//         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    String variableNameWithPasswdInIt = "xxx"; // Noncompliant {{'Passwd' detected in this expression, review this potentially hard-coded password.}}
//         ^^^^^^^^^^^^^^^^^^^^^^^^^^
    String variableNameWithPwdInIt = "xxx"; // Noncompliant {{'Pwd' detected in this expression, review this potentially hard-coded password.}}
//         ^^^^^^^^^^^^^^^^^^^^^^^
    String passwordToString = "SuperSecure".toString(); // Compliant, FN, but will be reported when we remove "toString()"
    // Same constraints when "toCharArray" is called on the password
    char[] passwordToChar = "SuperSecure".toCharArray(); // Noncompliant
//         ^^^^^^^^^^^^^^
    // Password with less than 2 characters are ignored
    String variableNameWithPasswordInItEmpty = "";
    String variableNameWithPasswordInItOneChar = "X";
    char[] smallPasswordToChar = "x".toCharArray(); // Compliant
    // "anonymous" is explicitly ignored
    String variableNameWithPasswordInItAnonymous = "anonymous";
    // When the password contains a password word, we consider it as constant used to avoid duplicated string
    String passwordConst = "Password"; // Compliant
    String pwds = "pwd"; // Compliant
    final String PASSWORD = "Password"; // Compliant
    final String PASSWORD_INPUT = "[id='password']"; // Compliant
    final String PASSWORD_PROPERTY = "custom.password"; // Compliant
    final String TRUSTSTORE_PASSWORD = "trustStorePassword"; // Compliant
    final String CONNECTION_PASSWORD = "connection.password"; // Compliant
    final String RESET_PASSWORD = "/users/resetUserPassword"; // Compliant
    final String RESET_PWD = "/users/resetUserPassword"; // Compliant
    char[] passwordToChar2 = "password".toCharArray(); // Compliant
    char[] passwordToChar3 = "http-password".toCharArray(); // Compliant
    String passwordToString2 = "http-password".toString(); // Compliant
    char[] passwordFromGetPwd = getPwd(""); // Compliant
    String CA_PASSWORD = "ca-password"; // Compliant
    String caPassword = CA_PASSWORD; // Compliant
    // When the declaration has no initializer, we don't report any issue
    String otherVariableNameWithPasswordInIt;

    // ========== 3. Assignment ==========
    // The variable name should contain a password word
    fieldNameWithPasswordInIt = "xx"; // Noncompliant {{'Password' detected in this expression, review this potentially hard-coded password.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^
    this.fieldNameWithPasswordInIt = "xx"; // Noncompliant
    // Password with less than 2 characters are ignored
    fieldNameWithPasswordInIt = "X";
    // "anonymous" is explicitly ignored
    fieldNameWithPasswordInIt = "anonymous";
    // Not a hardcoded password
    fieldNameWithPasswordInIt = retrievePassword();
    this.fieldNameWithPasswordInIt = retrievePassword();
    // Not a password name
    variable1 = "xx";
    // Same constraint when "toCharArray" is called on the password
    char[] passphrase = "whatever".toCharArray(); // Noncompliant
    passphrase = "whatever".toCharArray(); // Noncompliant
    passphrase = PASSED.toCharArray(); // Noncompliant
    passphrase = "".toCharArray();
    passphrase = "X".toCharArray();
    passphrase = "anonymous".toCharArray();
    // Unlike variable declaration, when the password contains a password word, it is not a constant, we still report an issue.
    fieldNameWithPasswordInIt = "password"; // Noncompliant

    // ========== 4. Method invocations ==========
    // ========== 4.1 Equals ==========
    // When one side of the equals contains a password word, report an issue
    String password = "123"; // Noncompliant
    if(password.equals("whatever")) { // Noncompliant
//     ^^^^^^^^
    }
    if("whatever".equals(password)) { // Noncompliant
//                       ^^^^^^^^
    }
    if(PASSED.equals(password)) { // Noncompliant
    }
    // Password with less than 2 characters are ignored
    if(password.equals("X")) {
    }
    if(password.equals("")) {
    }
    if("".equals(password)) {
    }
    // "anonymous" is explicitly ignored
    if(password.equals("anonymous")) {
    }
    // When the actual password contains a password word, we don't report an issue
    if(password.equals("password")) {
    }
    if("password".equals(password)) {
    }
    if(password.equals("password-1234")) {
    }
    // Corner cases
    if(password.equals(null)) {
    }
    if(password.equals(EMPTY)) {
    }
    if(equals(password)) {
    }

    // ========== 4.2 API setting password ==========
    // The second argument of "getConnection" contains a password: report an issue if it is hardcoded
    java.sql.Connection conn = DriverManager.getConnection("jdbc:mysql://xxx/", "root", var);
    conn = DriverManager.getConnection("jdbc:mysql://xxx/", "root", "whateverpassword"); // Compliant, handled by S6437
    conn = DriverManager.getConnection("jdbc:mysql://xxx/", "root", PASSED); // Compliant, handled by S6437
    conn = DriverManager.getConnection("jdbc:mysql://xxx/");
    // Password not set as argument, but it is still detected in the string itself is detected thanks to (1.)
    conn = DriverManager.getConnection("jdbc:db2://myhost:5021/mydb:user=dbadm;password=foo"); // Noncompliant
//                                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    // ========== 4.3 Setting password ==========
    // When a method call has two arguments potentially containing String, we report an issue the same way we would with a variable declaration
    A myA = new A();
    myA.setProperty("password", "xxxxx"); // Noncompliant
    myA.setProperty("passwd", "xxxxx"); // Noncompliant
    myA.setProperty("pwd", "xxxxx"); // Noncompliant
    // Password with less than 2 characters are ignored
    myA.setProperty("pwd", "X");
    // "anonymous" is explicitly ignored
    myA.setProperty("pwd", "anonymous");
    // Not hardcoded
    myA.setProperty("password", new Object());
    // We only consider the second argument as containing a password
    myA.setProperty("xxxxx", "password");
    // Exclude when the password word is contain into the expected password
    myA.setProperty("password", "password"); // Compliant
    myA.setProperty("password", "pwd"); // Compliant
    // Other test cases
    myA.setProperty(12, "xxxxx");
    myA.setProperty(new Object(), new Object());
    myA.setProperty("something", "else").setProperty("password", "xxxxx"); // Noncompliant
//                                       ^^^^^^^^^^^

    // Same for code not user defined
    java.util.Properties props = new java.util.Properties();
    props.put(Context.SECURITY_CREDENTIALS, "1234"); // Noncompliant
//        ^^^
    props.put("java.naming.security.credentials", "1234"); // Noncompliant
    props.put("password", "whateverpassword"); // Compliant

    java.util.Hashtable<String, String> env = new java.util.Hashtable<>();
    env.put(Context.SECURITY_CREDENTIALS, "1234"); // Noncompliant
    env.put("", "1234");
    env.put(Context.SECURITY_CREDENTIALS, "");
    env.put("password", "whateverpassword"); // Compliant

    // Others tests...
    env.put("password", OtherPasswordAuthentication.get());

    // ========== 5. Constructors ==========
    // Second argument of "PasswordAuthentication" is setting explicitly a password
    PasswordAuthentication pa;
    pa = new PasswordAuthentication("userName", "1234".toCharArray()); // Compliant, handled by S6437
    // Not hardcoded
    pa = new PasswordAuthentication("userName", var.toCharArray());
    pa = new PasswordAuthentication("userName", pwd); // Compliant
    pa = new PasswordAuthentication("userName", getPwd(var)); // Compliant
    pa = new PasswordAuthentication("userName", var.toCharArray()); // Compliant

    OtherPasswordAuthentication opa;
    opa = new OtherPasswordAuthentication("userName", "1234".toCharArray()); // Compliant
    String[] array = {};
    array[0] = "xx";
  }

  private char[] getPwd(String s) {
    return null;
  }

  private String retrievePassword() {
    return null;
  }

  static class A {
    private A setProperty(Object property, Object Value) {
      return this;
    }
  }


  private static class OtherPasswordAuthentication {
    OtherPasswordAuthentication(String username, char[] pwd) {}

    static String get() {
      return "";
    }
  }
}
