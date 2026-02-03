React.createClass({
  render() {
    let rows = Object.keys(this.props.value).map(key => {
      return <tr key={key}>
        <td className="thin nowrap">{key}</td>
        <td><ItemValue value={this.props.value[key]}/></td>
      </tr>;
    });
    return <table className="data"><tbody>{rows}</tbody></table>; // Compliant
  }
});

React.createClass({
  render() {
    return <table className="data"><Header /><tr><th></th></tr></table>; // Compliant
  }
});

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

<table> {/* Noncompliant {{Add a valid header row or column to this "<table>".}} */}

</table>

<table> {/* Noncompliant {{Add a valid header row or column to this "<table>".}} */}
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
  <table></table> {/* Noncompliant {{Add a valid header row or column to this "<table>".}} */}
</table>

<table> {/* Noncompliant {{Add a valid header row or column to this "<table>".}} */}
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

<table role="dummy"> {/* Noncompliant {{Add a valid header row or column to this "<table>".}} */}

</table>

<table role="presentation">
  <table></table> {/* Noncompliant {{Add a valid header row or column to this "<table>".}} */}
</table>

<table aria-hidden="true">

</table>

<table aria-hidden="false"> {/* Noncompliant {{Add a valid header row or column to this "<table>".}} */}
  
</table>

<table aria-hidden="true">
  <table></table> {/* Noncompliant {{Add a valid header row or column to this "<table>".}} */}
</table>

<table> {/* Noncompliant {{Add a valid header row or column to this "<table>".}} */}
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

<table> {/* Noncompliant {{Add a valid header row or column to this "<table>".}} */}
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


{/* ============================================
    False Positive Tests: Reusable Table Wrapper Components
    These components receive children (including headers) via props.children at usage sites.
    The table is intentionally incomplete at definition time.
    See JS-1176 for details.
   ============================================ */}

{/* Pattern 1: Self-closing table with spread props - should NOT raise issue */}
{/* This is a reusable wrapper component where children are provided via {...props} */}
<table {...props} />

{/* Pattern 2: Empty body table with spread props - should NOT raise issue */}
{/* Another form of wrapper component where table structure is completed at usage sites */}
<table className="my-table" {...props}></table>

{/* Pattern 3: React.forwardRef pattern - common in component libraries like shadcn/ui */}
{/* This wrapper component should NOT raise issue */}
<div className="w-full overflow-auto">
  <table
    ref={ref}
    className="w-full caption-bottom text-sm"
    {...props}
  />
</div>

{/* Pattern 4: Function component pattern with spread */}
{/* This wrapper component should NOT raise issue */}
<div className="relative w-full overflow-auto">
  <table className={className} {...props} />
</div>

{/* Pattern 5: Spread with other attributes but no children - should NOT raise issue */}
<table role="grid" data-slot="table" {...rest} />

{/* ============================================
    True Positive Tests: Tables that SHOULD still raise issues
   ============================================ */}

{/* Table with spread AND static children but no headers - SHOULD raise issue */}
<table {...props}> {/* Noncompliant {{Add a valid header row or column to this "<table>".}} */}
  <tbody>
    <tr><td>Data without headers</td></tr>
  </tbody>
</table>

{/* Table without spread and no headers - SHOULD raise issue (existing behavior) */}
<table> {/* Noncompliant {{Add a valid header row or column to this "<table>".}} */}
  <tr><td>No headers here</td></tr>
</table>

</>
