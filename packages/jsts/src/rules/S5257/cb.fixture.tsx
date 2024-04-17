
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

      <table role="presentation"> { /* Noncompliant */}
        <tr>
          <td></td>
        </tr>
      </table>

      <table role="none"> { /* Noncompliant */}
        <tr>
          <td></td>
        </tr>
      </table>

      <table role="None"> { /* Noncompliant */}
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