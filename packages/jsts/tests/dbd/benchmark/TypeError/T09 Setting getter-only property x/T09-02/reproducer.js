const paginationContainer = document.querySelector(".pagination"); // Noncompliant: TypeError: Cannot set property value of #<HTMLInputElement> which has only a getter
paginationContainer.innerHTML = "";
