declare const original: Date;

const direct = new Date(original);
const computed = new Date(original['getTime']());
const withArgument = new Date(original.getTime(1));
