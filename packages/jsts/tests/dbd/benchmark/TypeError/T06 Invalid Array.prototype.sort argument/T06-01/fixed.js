function sortFunctionBuilder(type) {
  if (type === 'increment') {
    return (a, b) => a < b ? -1: 1;
  }
  else if (type === 'decrement') {
    return (a, b) => a < b ? 1: -1;
  }
  return 0;
}

function sort(arr, sortFunction){
  return arr.sort(sortFunction);
}


console.log(sort([5,4,2], sortFunctionBuilder('increment')));