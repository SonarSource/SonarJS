function getTrigger(index1: number, index2: number) {
  return { from: index1, to: index2 };
}

function getSortedTrigger(index1: number, index2: number) {
  return index1 < index2 ? getTrigger(index1, index2) : getTrigger(index2, index1);
}

void getSortedTrigger;
