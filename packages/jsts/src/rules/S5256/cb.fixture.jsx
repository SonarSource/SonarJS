<>

<table>
  <caption>
    Holidays taken in the last six months
  </caption >
  <thead>
    <tr>
      <th scope="col"><abbr title="Identification Number">ID</abbr></th>
      <th scope="col">Name</th>
      <th scope="col">Jul</th>
      <th scope="col">Aug</th>
      <th scope="col">Sept</th>
      <th scope="col">Oct</th>
      <th scope="col">Nov</th>
      <th scope="col">Dec</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>215</td>
      <td rowspan="2">Abel</td>
      <td>5</td>
      <td>2</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>3</td>
    </tr>

    <tr>
      <td>231</td>
      <td>0</td>
      <td>5</td>
      <td>3</td>
      <td>0</td>
      <td>0</td>
    </tr>

    <tr>
      <td>173</td>
      <th rowspan="3">Bernard</th>
      <td>2</td>
      <td>0</td>
      <td>0</td>
      <td>5</td>
      <td>0</td>
      <td>0</td>
    </tr>

    <tr>
      <td>141</td>
      <td>0</td>
      <td>10</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>8</td>
    </tr>

    <tr>
      <td>99</td>
      <td>8</td>
      <td>8</td>
      <td>8</td>
      <td>8</td>
      <td>0</td>
      <td>4</td>
    </tr>
  </tbody>
</table>

<table> {/* Noncompliant */}

</table>

<table> {/* Noncompliant */}
  <th></th>
</table>

<table> 
  <tr>
    <th></th>
  </tr>
</table>

<table>
  <thead>
    <tr>
      <th></th>
    </tr>
  </thead>
</table>

<table> 
  <tr>
    <th></th>
  </tr>
  <table></table> {/* Noncompliant */}
</table>

<table> {/* Noncompliant */}
  <table>
    <tr>
      <th></th>
    </tr>
  </table>
</table>

<table> 
  <tr>
    <th></th>
  </tr>
  <table>
    <tr>
      <th></th>
    </tr>
  </table>
</table>

<th>
  
</th>

<table role="presentation">

</table>

<table role="None">

</table>

<table role="dummy"> {/* Noncompliant */}

</table>

<table role="presentation">
  <table></table> {/* Noncompliant */}
</table>

<table aria-hidden="true">

</table>

<table aria-hidden="false"> {/* Noncompliant */}
  
</table>

<table aria-hidden="true">
  <table></table> {/* Noncompliant */}
</table>

<table> {/* Noncompliant */}
  <tbody>
    <tr><td></td><td></td></tr>
    <tr>
      <td></td>
      <th></th>
    </tr>
  </tbody>  
</table>

<table>
  <tbody>
    <tr>
      <td></td>
      <td colspan="2" rowspan="2"></td>
      <th colspan="3" rowspan="3"></th>
    </tr>
    <tr>
      <td></td>
    </tr>
    <tr>
      <th colspan="3"></th>
    </tr>
  </tbody>
</table>

<table> {/* Noncompliant */}
  <tr>
    <th colspan={2} rowspan="2"></th>
    <td rowspan="2"></td>
  </tr>
  <tr>
    <td colspan="3"></td>
  </tr>
</table>

<table>
  	<tbody>
      <tr>
        <th rowspan="5">head</th>
      </tr>
    <tr>
      <th rowspan="0"><abbr title="Identification Number">ID</abbr></th>
      <th scope="col">Name</th>
      <th scope="col">Jul</th>
      <th scope="col">Aug</th>
      <th scope="col">Sept</th>
      <th scope="col">Oct</th>
      <th scope="col">Nov</th>
      <th scope="col">Dec</th>
    </tr>

    <tr>
      <td rowspan="0">215</td>
      <td rowspan="0">Abel</td>
      <td>5</td>
      <td>2</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>3</td>
    </tr>

    <tr>
      <td>231</td>
      <td>0</td>
      <td>5</td>
      <td>3</td>
      <td>0</td>
      <td>0</td>
    </tr>

    <tr>
      <td>173</td>
      <th rowspan="3">Bernard</th>
      <td>2</td>
      <td>0</td>
      <td>0</td>
      <td>5</td>
      <td>0</td>
      <td>0</td>
    </tr>

    <tr>
      <td>141</td>
      <td>0</td>
      <td>10</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>8</td>
    </tr>

    <tr>
      <td>99</td>
      <td>8</td>
      <td>8</td>
      <td>8</td>
      <td>8</td>
      <td>0</td>
      <td>4</td>
    </tr>
        </tbody>
</table>


</>
