function compliant() {

  const Component1 = (count, collection) => {
    count = 1;
    return (
      <div>
        {count && <List elements={collection} />}
      </div>
    )
  }

  const Component2 = (count: boolean, collection) => {
    return (
      <div>
        {count && <List elements={collection} />}
      </div>
    )
  }

  const Component3 = (collection) => {
    let test = '';
    return (
      <div>
        {test && <List elements={collection} />}
      </div>
    )
  }
}

function non_compliant() {

  const Component1 = (count: number, collection) => {
    return (
      <div>
        {count && <List elements={collection} />} {/* Noncompliant {{Convert the conditional to a boolean to avoid leaked value}} */}
     {/* ^^^^^ */}
      </div>
    )
  }

  const Component2 = (collection) => {
    const count = 0;
    return (
      <div>
        {count && <List elements={collection} />} {/* Noncompliant */}
      </div>
    )
  }

  const Component3 = (collection: Array<number>) => {
    return (
      <div>
        {collection.length && <List elements={collection} />} {/* Noncompliant */}
      </div>
    )
  }

  const Component4 = (test: number, count: number, collection) => {
    return (
      <div>
        {(test || (count)) && <List elements={collection} />} {/* Noncompliant 2 */}
      </div>
    )
  }
  const Component5 = (test: number, count: number, collection) => {
    return (
      <div>
        {(test || (count)) && <List elements={collection} />} {/* Noncompliant 2 [[qf1,qf2]]*/}
        {/* fix@qf1 {{Convert the conditional to a boolean}} */}
        {/* edit@qf1 [[sc=10;ec=14]] {{!!(test)}} */}
        {/* edit@qf2 {{        {(test || !!(count)) && <List elements={collection} />}}} */}
      </div>
    )
  }
}
