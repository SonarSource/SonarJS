import { message, oldMessage } from './model.js';

export async function example() {
  await 42;
  const redundant = 42 as number;
  let nullable: string | null = null;
  nullable.trim();
  return message + redundant + oldMessage();
}
