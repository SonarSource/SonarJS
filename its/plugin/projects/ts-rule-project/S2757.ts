
function compliant() {
  let x = +1;
  x = -1;
  let y = !1;
  y =
     ! 1;
  y=!1;
}

function nonCompliant() {
  let x = 0;
  x =+ 1; // Noncompliant
  x =- 1; // Noncompliant
  let y =! true; // Noncompliant
}
