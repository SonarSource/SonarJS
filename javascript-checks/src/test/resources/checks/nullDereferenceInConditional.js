
function x(str){
  if(str == null && str.length == 0){} //Noncompliant
  if(str != null || str.length > 0){} //Noncompliant
  if(str == null || str.length == 0){}
  if(str != null && str.length > 0){}
  if(str == null && other.length == 0){}
  if(a == null && (b != null || b.length>0)){} //Noncompliant
  if((str) == null && str.length == 0){} //Noncompliant
  if((str == null) && str.length == 0){} //Noncompliant
  if(str == null && (str.length == 0)){} //Noncompliant
  if(str == null && y(str.length)){} //Noncompliant
  if(str == null && (str = a) == null){}
  if(str == null && str == a){}
  if(str == undefined && str.length == 0){} //Noncompliant
  if(str === null && str.length == 0){} //Noncompliant
  if(str !== null && str.length == 0){}
  if(str !== null || str.length > 0){} //Noncompliant
  if(str === null || str.length > 0){}
  if(null == str && str.length == 0){} //Noncompliant
}

