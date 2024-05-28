import { runTest } from '../test';

runTest(
  'globals',
  `
undefined;
NaN;
let undefined = 1;
undefined;
NaN
let foo;
{
   undefined;
   let undefined = 2;
   undefined; 
   {
   }
   
   {
   }
   
   {
      let foo = 5;
   }
}
foo.bar;
`,
);
