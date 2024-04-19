<>

<table>

</table>

<table>
  <tr></tr>
</table>

<table>
  <tr>
    <td></td>
  </tr>
</table>

<table>
  <tr>
    <th id="foo"></th>
  </tr>
</table>

<table>
  <tr>
    <th id="foo"></th>
  </tr>
  <tr>
    <td headers="foo"></td> {/* Compliant */}
  </tr>
</table>

<table>
  <tr>
    <th id="foo"></th>
  </tr>
  <tr>
    <td headers="bar"></td> {/* Noncompliant {{id "bar" in "headers" does not reference any <th> header.}} */}
  </tr>
</table>

<table>
  <tr>
    <th id="foo"></th>
    <td headers="foo"></td> {/* Compliant */}
  </tr>
</table>

<table>
  <tr>
    <td headers="foo"></td> {/* Compliant */}
    <th id="foo"></th>
  </tr>
</table>

<table>
  <tr>
    <th id="foo"></th>
    <td headers="bar"></td> {/* Noncompliant {{id "bar" in "headers" does not reference any <th> header.}} */}
  </tr>
</table>

<table>
  <tr>
    <th id="foo"></th>
    <th id="bar"></th>
  </tr>
  <tr>
    <td headers="foo"></td> {/* Compliant */}
    <td headers="bar"></td>
  </tr>
</table>


<table>
  <tr>
    <th id="foo"></th>
    <th id="bar"></th>
  </tr>
  <tr>
    <td headers="oof"></td> {/* Noncompliant {{id "oof" in "headers" does not reference any <th> header.}} */}
    <td headers="bar"></td> {/* Compliant */}
  </tr>
</table>

<table>
  <tr>
    <th id="foo"></th>
    <th id="bar"></th>
  </tr>
  <tr>
    <td headers="bar"></td> {/* Noncompliant {{id "bar" in "headers" references the header of another column/row.}} */}
    <td headers="foo"></td> {/* Noncompliant {{id "foo" in "headers" references the header of another column/row.}} */}
  </tr>
</table>

<table>
  <tr>
    <th id="foo"></th>
    <td headers="foo"></td> {/* Compliant */}
  </tr>
  <tr>
    <th id="bar"></th>
    <td headers="bar"></td> {/* Compliant */}
  </tr>
</table>

<table>
  <tr>
    <th id="foo"></th>
    <td headers="oof"></td> {/* Noncompliant {{id "oof" in "headers" does not reference any <th> header.}} */}
  </tr>
  <tr>
    <th id="bar"></th>
    <td headers="bar"></td> {/* Compliant */}
  </tr>
</table>

<table>
  <tr>
    <th id="foo"></th>
    <td headers="bar"></td> {/* Noncompliant {{id "bar" in "headers" references the header of another column/row.}} */}
  </tr>
  <tr>
    <th id="bar"></th>
    <td headers="foo"></td> {/* Noncompliant {{id "foo" in "headers" references the header of another column/row.}} */}
  </tr>
</table>

<table>
  <tr>
    <th colspan="2" id="foo"></th>
  </tr>
  <tr>
    <td headers="foo"></td> {/* Compliant */}
    <td></td>
  </tr>
</table>

<table>
  <tr>
    <th colspan="2" id="foo"></th>
  </tr>
  <tr>
    <td></td>
    <td headers="foo"></td> {/* Compliant */}
  </tr>
</table>

<table>
  <tr>
    <th colspan="2" id="foo"></th>
  </tr>
  <tr>
    <td headers="bar"></td> {/* Noncompliant {{id "bar" in "headers" does not reference any <th> header.}} */}
    <td></td>
  </tr>
</table>

<table>
  <tr>
    <th colspan="2" id="foo"></th>
  </tr>
  <tr>
    <td headers="foo" colspan="2"></td> {/* Compliant */}
  </tr>
</table>

<table>
  <tr>
    <th rowspan="2" id="foo"></th>
    <td headers="foo"></td> {/* Compliant */}
  </tr>
</table>

<table>
  <tr>
    <td headers="foo"></td> {/* Compliant */}
    <th rowspan="2" id="foo"></th>
  </tr>
</table>

<table>
  <tr>
    <th rowspan="2" id="foo"></th>
  </tr>
  <tr>
    <td headers="foo"></td> {/* Compliant */}
  </tr>
</table>

<table>
  <tr>
    <td></td>
    <th rowspan="2" id="foo"></th>
  </tr>
  <tr>
    <td headers="foo"></td> {/* Compliant */}
  </tr>
</table>

<table>
  <tr>
    <th colspan="2" rowspan="2" id="foo"></th>
  </tr>
  <tr>
    <td headers="foo"></td> {/* Compliant */}
  </tr>
</table>

<table>
  <tr>
    <th colspan="2" rowspan="2" id="foo"></th>
    <td headers="foo"></td> {/* Compliant */}
  </tr>
</table>

<table>
  <tr>
    <th colspan="2" rowspan="2" id="foo"></th>
  </tr>
  <tr>
    <td headers="bar"></td> {/* Noncompliant {{id "bar" in "headers" does not reference any <th> header.}} */}
  </tr>
</table>

<table>
  <tr>
    <th colspan="2" rowspan="2" id="foo"></th>
    <td headers="bar"></td> {/* Noncompliant {{id "bar" in "headers" does not reference any <th> header.}} */}
  </tr>
</table>

<table>
  <tr>
    <th colspan="2" id="foo"></th>
    <th rowspan="2" id="bar"></th>
  </tr>
  <tr>
    <td colspan="2" headers="foo"></td> {/* Compliant */}
  </tr>
</table>

<table>
  <tr>
    <td></td>
    <th rowspan="2" headers="bar" id="foo"></th> {/* Compliant */}
  </tr>
  <tr>
    <th rowspan="2" headers="foo" id="bar"></th> {/* Compliant */}
  </tr>
</table>

<table>
  <tr>
    <th colspan="2" headers="bar" id="foo"></th> {/* Compliant */}
    <td></td>
  </tr>
  <tr>
    <td></td>
    <th colspan="2" headers="foo" id="bar"></th> {/* Compliant */}
  </tr>
</table>

<table>
  <tr>
    <td></td>
    <th colspan="2" rowspan="2" headers="bar" id="foo"></th> {/* Compliant */}
  </tr>
  <tr>
    <th colspan="2" rowspan="2" headers="foo" id="bar"></th> {/* Compliant */}
    <td></td>
  </tr>
</table>

<table>
  <tr>
    <td rowspan="4" headers="foo"></td> {/* Noncompliant {{id "foo" in "headers" does not reference any <th> header.}} */}
  </tr>
</table>

<table>
  <tr>
    <td colspan="4" headers="foo"></td> {/* Noncompliant {{id "foo" in "headers" does not reference any <th> header.}} */}
  </tr>
</table>

<table>
  <tr>
    <td colspan="foo"></td>
  </tr>
</table>

<table>
  <tr>
    <td rowspan="foo"></td>
  </tr>
</table>

<table>
  <td></td>
</table>

<table>
  <th></th>
</table>

<table>
  <tr>
    <th id=" "></th>
  </tr>
</table>

<table>
  <tr>
    <td headers="   "></td>
  </tr>
</table>

<table>
  <tr>
    <th id="foo"></th>
  </tr>
  <tr>
    <td headers="{foo()}"></td> {/* Noncompliant {{id "{foo()}" in "headers" does not reference any <th> header.}}*/}
  </tr>
</table>

<table>
  <tr>
    <th id="foo"></th>
  </tr>
  <tr>
    <td headers={foo}></td>
  </tr>
</table>

<table>
  <>
    <tr>
      <th id="bar"></th>
    </tr>
    <tr>
      <td headers="foo"></td> {/* Noncompliant {{id "foo" in "headers" does not reference any <th> header.}} */}
    </tr>
  </>
</table>

<tr></tr>

<td></td>

<th></th>

</>
