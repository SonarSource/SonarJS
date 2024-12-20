
function Foo() {
  return (
    <>
      <table> { /* Compliant */}
        <tr>
          <td></td>
        </tr>
      </table>

      <table role="">
        <tr>
          <td></td>
        </tr>
      </table>

      <table role="dummy">
        <tr>
          <td></td>
        </tr>
      </table>

      <table role="presentation"> { /* Noncompliant {{Replace this layout table with a CSS layout.}} */}
        <tr>
          <td></td>
        </tr>
      </table>

      <table role="none"> { /* Noncompliant {{Replace this layout table with a CSS layout.}} */}
        <tr>
          <td></td>
        </tr>
      </table>

      <table role="None"> { /* Noncompliant {{Replace this layout table with a CSS layout.}} */}
        <tr>
          <td></td>
        </tr>
      </table>

      <table custom:role="none">
        <tr>
          <td></td>
        </tr>
      </table>

    </>
  );
}
