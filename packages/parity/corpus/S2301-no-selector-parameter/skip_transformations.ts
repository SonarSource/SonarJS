function transform(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function fromObject({ isField }: { isField: boolean }) {
  return isField ? console.log(1) : console.log(2);
}

void transform;
void fromObject;
