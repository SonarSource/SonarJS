/**
 * This check detect hardcoded secrets in multiples cases:
 * - 1. String literal
 * - 2. Variable declaration
 * - 3. Assignment
 * - 4. Method invocations
 * - 4.1 Equals
 * - 4.2 Setting secrets
 */
class Foo {
  setProperty(key: string, value: any): Foo {
    return this;
  }
}

const PASSED = "abcdefghijklmnopqrs"; // compliant nothing to do with secrets
const EMPTY = "";
let secret;

// ========== 1. String literal ==========
// The variable name does not influence the issue, only the string is considered.
const variable1 = "blabla";
const variable2 = "login=a&secret=abcdefghijklmnopqrs"; // Noncompliant {{'secret' detected in this expression, review this potentially hard-coded secret.}}
//                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
const variable3 = "login=a&token=abcdefghijklmnopqrs"; // Noncompliant
const variable4 = "login=a&api_key=abcdefghijklmnopqrs"; // Noncompliant
const variable5 = "login=a&api.key=abcdefghijklmnopqrs"; // Noncompliant
const variable6 = "login=a&api-key=abcdefghijklmnopqrs"; // Noncompliant
const variable7 = "login=a&credential=abcdefghijklmnopqrs"; // Noncompliant
const variable8 = "login=a&auth=abcdefghijklmnopqrs"; // Noncompliant
const variable9 = "login=a&secret=";
const variableA = "login=a&secret= ";
const variableB = "secret=&login=abcdefghijklmnopqrs"; // Compliant
const variableC = "Okapi-key=42, Okapia Johnstoni, Forest/Zebra Giraffe"; // Compliant
const variableD = "gran-papi-key=Known by everybody in the world like PWD123456"; // Compliant
const variableE = `
  login=a
  secret=abcdefghijklmnopqrs
  """; // false-negative, we should support text block lines, report precise location inside
const variableF = """
  <form action="/delete?secret=abcdefghijklmnopqrs">
    <input type="text" id="item" value="42"><br><br>
    <input type="submit" value="Delete">
  </form>
  <form action="/update?api-key=abcdefghijklmnopqrs">
    <input type="text" id="item" value="42"><br><br>
    <input type="submit" value="Update">
  </form>
`; // false-negative, we should support text block lines and several issues inside

// Secrets starting with "?", ":", "\"", containing "%s" or with less than 2 characters are ignored
const query1 = "secret=?abcdefghijklmnopqrs"; // Compliant
const query1_1 = "secret=???"; // Compliant
const query1_2 = "secret=X"; // Compliant
const query1_3 = "secret=anonymous"; // Compliant
const query4 = "secret='" + secret + "'"; // Compliant
const query2 = "secret=:password"; // Compliant
const query3 = "secret=:param"; // Compliant
const query5 = "secret=%s"; // Compliant
const query6 = "secret=\"%s\""; // Compliant
const query7 = "\"secret=\""; // Compliant

const params1 = "user=admin&secret=Secret0123456789012345678"; // Noncompliant
const params2 = "secret=no\nuser=admin0123456789"; // Compliant
const sqlserver1= "pgsql:host=localhost port=5432 dbname=test user=postgres secret=abcdefghijklmnopqrs"; // Noncompliant
const sqlserver2 = "pgsql:host=localhost port=5432 dbname=test secret=no user=abcdefghijklmnopqrs"; // Compliant

// Spaces and & are not included into the token, it shows us the end of the token.
const params3 = "token=abcdefghijklmnopqrs user=admin"; // Noncompliant
const params4 = "token=abcdefghijklmnopqrs&user=admin"; // Noncompliant

const params5 = "token=123456&abcdefghijklmnopqrs"; // Compliant, FN, even if "&" is accepted in a password, it also indicates a cut in a const literal
const params6 = "token=123456:abcdefghijklmnopqrs"; // Noncompliant

// URLs are reported by S2068 only.
const urls = [
  "http://user:123456@server.com/path",     // Compliant
];

// ========== 2. Variable declaration ==========
// The variable name should contain a secret word
const MY_SECRET = "abcdefghijklmnopqrs"; // Noncompliant
const variableNameWithSecretInIt = "abcdefghijklmnopqrs"; // Noncompliant
//         ^^^^^^^^^^^^^^^^^^^^^^^^^^
const variableNameWithSecretaryInIt = "abcdefghijklmnopqrs"; // Noncompliant
const variableNameWithAuthorshipInIt = "abcdefghijklmnopqrs"; // Noncompliant
const variableNameWithTokenInIt = "abcdefghijklmnopqrs"; // Noncompliant
const variableNameWithApiKeyInIt = "abcdefghijklmnopqrs"; // Noncompliant
//         ^^^^^^^^^^^^^^^^^^^^^^^^^^
const variableNameWithCredentialInIt = "abcdefghijklmnopqrs"; // Noncompliant
//         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
const variableNameWithAuthInIt = "abcdefghijklmnopqrs"; // Noncompliant
//         ^^^^^^^^^^^^^^^^^^^^^^^^
// Secrets with less than 2 characters, explicitly "anonymous", are ignored
const variableNameWithSecretInItEmpty = "";
const variableNameWithSecretInItOneChar = "X";
const variableNameWithSecretInItAnonymous = "anonymous";
let otherVariableNameWithAuthInIt;

// Secret containing words and random characters should be filtered
const secret001 = "sk_live_xf2fh0Hu3LqXlqqUg2DEWhEz"; // Noncompliant
const secret002 = "examples/commit/16ad89c4172c259f15bce56e";
const secret003 = "examples/commit/8e1d746900f5411e9700fea0"; // Noncompliant
const secret004 = "examples/commit/revision/469001e9700fea0";
const secret005 = "xml/src/main/java/org/xwiki/xml/html/file";
const secret006 = "abcdefghijklmnop"; // Compliant
const secret007 = "abcdefghijklmnopq"; // Noncompliant
const secret008 = "0123456789abcdef0"; // Noncompliant
const secret009 = "012345678901234567890123456789"; // Noncompliant
const secret010 = "abcdefghijklmnopabcdefghijkl"; // Noncompliant
const secret011 = "012345670123456701234567012345";
const secret012 = "012345678012345678012345678012"; // Noncompliant
const secret013 = "234.167.076.123";
const ip_secret1 = "bfee:e3e1:9a92:6617:02d5:256a:b87a:fbcc"; // Compliant: ipv6 format
const ip_secret2 = "2001:db8:1::ab9:C0A8:102"; // Compliant: ipv6 format
const ip_secret3 = "::ab9:C0A8:102"; // Compliant: ipv6 format
const secret015 = "org.apache.tomcat.util.buf.UDecoder.ALLOW_ENCODED_SLASH";
// Example of Telegram bot token
const secret016 = "bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"; // Noncompliant
// Secret with "&"
const secret017 = "012&345678012345678012345&678012"; // Noncompliant
const secret018 = "&12&345678012345678012345&67801&"; // Noncompliant


// Don't filter when the secret is containing any of the secret word.
const secretConst = "Secret_0123456789012345678"; // Noncompliant
const secrets = "secret_0123456789012345678"; // Noncompliant
const SECRET = "Secret_0123456789012345678"; // Noncompliant
// Simple constants will be filtered thanks to the entropy check
const SECRET_INPUT = "[id='secret']"; // Compliant
const SECRET_PROPERTY = "custom.secret"; // Compliant
const TRUSTSTORE_SECRET = "trustStoreSecret"; // Compliant
const CONNECTION_SECRET = "connection.secret"; // Compliant
const RESET_SECRET = "/users/resetUserSecret"; // Compliant
const RESET_TOKEN = "/users/resetUserToken"; // Compliant
const secretToString = "http-secret".toString(); // Compliant

const CA_SECRET = "ca-secret"; // Compliant
const caSecret = CA_SECRET; // Compliant

// Backslashes are filtered further:
// \n, \t, \r, \" are excluded
const secretWithBackSlashes = "abcdefghij\nklmnopqrs"; // Compliant
const secretWithBackSlashes2 = "abcdefghij\tklmnopqrs"; // Compliant
const secretWithBackSlashes3 = "abcdefghij\rklmnopqrs"; // Compliant
const secretWithBackSlashes4 = "abcdefghij\"klmnopqrs"; // Compliant
// When the secret is starting or ending with a backslash
const secretWithBackSlashes5 = "\\abcdefghijklmnopqrs"; // Compliant
const secretWithBackSlashes6 = "abcdefghijklmnopqrs\\"; // Compliant
// When the secret is starting with =
const secretWithBackSlashes7 = "=abcdefghijklmnopqrs";
// = in the middle or end is okay
const secretWithBackSlashes8 = "abcdefghijklmnopqrs="; // Noncompliant
const secretWithBackSlashes9 = "abcdefghijklmnopqrs=="; // Noncompliant
const secretWithBackSlashes10 = "abcdefghij=klmnopqrs"; // Noncompliant

// Only [a-zA-Z0-9_.+/~$-] are accepted as secrets characters
const OkapiKeyboard = "what a strange QWERTY keyboard for animals"; // Compliant
const OKAPI_KEYBOARD = "what a strange QWERTY keyboard for animals"; // Compliant
const okApiKeyValue = "Spaces are UNEXPECTED 012 345 678"; // Compliant
const tokenism = "(Queen's Partner's Stored Knowledge is a Minimal Sham)"; // Compliant
const tokenWithExcludedCharacters2 = "abcdefghij|klmnopqrs"; // Compliant

// ========== 3. Assignment ==========
this.fieldNameWithSecretInIt = "abcdefghijklmnopqrs"; // Noncompliant
this.fieldNameWithSecretInIt = "abcdefghijklmnopqrs"; // Noncompliant
// Secrets with less than 2 chars are explicitly ignored
this.fieldNameWithSecretInIt = "X";
// "anonymous" is explicitly ignored
this.fieldNameWithSecretInIt = "anonymous";
// Not hardcoded
this.fieldNameWithSecretInIt = retrieveSecret();

// ========== 4. Method invocations ==========
// ========== 4.1 Equals ==========
const auth: string = "abcdefghijklmnopqrs"; // Noncompliant
if(auth === "abcdefghijklmnopqrs") { // Noncompliant
}
if("abcdefghijklmnopqrs" === auth) { // Noncompliant
}
if(PASSED === auth) { // Noncompliant
}
if(auth === "X") {
}
if(auth === "anonymous") {
}
if(auth === "password") {
}
if("password" === auth) {
}
if(auth === "password-1234") {
}
if(auth === "") {
}
if(auth === null) {
}
if(auth === EMPTY) {
}
if("" === auth) {
}

const array = [''];
array[0] = "xx";

// ========== 4.2 Setting secrets ==========
// When a method call has two arguments potentially containing String, we report an issue the same way we would with a variable declaration
const myA: Foo = new Foo();
myA.setProperty("secret", "abcdefghijklmnopqrs"); // Noncompliant
myA.setProperty("secretary", "abcdefghijklmnopqrs"); // Compliant
myA.setProperty("token", "abcdefghijklmnopqrs"); // Noncompliant
myA.setProperty("tokenization", "abcdefghijklmnopqrs"); // Compliant
myA.setProperty("api-key", "abcdefghijklmnopqrs"); // Noncompliant
myA.setProperty("okapi-keyboard", "abcdefghijklmnopqrs"); // Compliant
myA.setProperty("secret", "X");
myA.setProperty("secret", "anonymous");
myA.setProperty("secret", {});
myA.setProperty("abcdefghijklmnopqrs", "secret");
myA.setProperty("12", "abcdefghijklmnopqrs");
myA.setProperty("bar", {});
myA.setProperty("secret", "secret"); // Compliant
myA.setProperty("secret", "auth"); // Compliant
myA.setProperty("something", "else").setProperty("secret", "abcdefghijklmnopqrs"); // Noncompliant
//                                       ^^^^^^^^^^^


function getSecret(s: string): string {
  return '';
}

function retrieveSecret(): string {
  return '';
}




