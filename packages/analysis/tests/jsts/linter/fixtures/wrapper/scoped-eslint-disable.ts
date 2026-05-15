// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EmptyProps {}

interface OtherProps {}

/* eslint-disable sonarjs/no-identical-functions */
const first = () => {
  doSomething()
  doSomethingElse()
  doAnotherThing()
}

const second = () => {
  doSomething()
  doSomethingElse()
  doAnotherThing()
}
