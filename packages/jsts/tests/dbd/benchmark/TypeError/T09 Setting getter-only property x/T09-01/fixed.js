const document = {
  getElementById() {
    return {}
  }
}
const mRequestStart = {
  format() {}
}

var in_startDate = document.getElementById("in_startDate")
if (in_startDate) in_startDate.value = mRequestStart.format('YYYY-MM-DD')
