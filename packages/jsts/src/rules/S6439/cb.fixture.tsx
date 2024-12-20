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
        {count && <List elements={collection} />} {/* Noncompliant [[qf3]] {{Convert the conditional to a boolean to avoid leaked value}} */}
     {/* ^^^^^ */}
        {/* fix@qf3 {{Convert the conditional to a boolean}} */}
        {/* edit@qf3 [[sc=9;ec=14]] {{!!(count)}} */}
      </div>
    )
  }

  const Component2 = (collection) => {
    const count = 0;
    return (
      <div>
        {count && <List elements={collection} />} {/* Noncompliant [[qf5]] {{Convert the conditional to a boolean to avoid leaked value}} */}
        {/* fix@qf5 {{Convert the conditional to a boolean}} */}
        {/* edit@qf5 [[sc=9;ec=14]] {{!!(count)}} */}
      </div>
    )
  }

  const Component3 = (collection: Array<number>) => {
    return (
      <div>
        {collection.length && <List elements={collection} />} {/* Noncompliant [[qf7]] {{Convert the conditional to a boolean to avoid leaked value}} */}
        {/* fix@qf7 {{Convert the conditional to a boolean}} */}
        {/* edit@qf7 [[sc=9;ec=26]] {{!!(collection.length)}} */}
      </div>
    )
  }

  const Component4 = (test: number, count: number, collection) => {
    return (
      <div>
        {(test || (count)) && <List elements={collection} />} {/* Noncompliant [[qf9,qf10]] {{Convert the conditional to a boolean to avoid leaked value}} {{Convert the conditional to a boolean to avoid leaked value}} */}
        {/* fix@qf9 {{Convert the conditional to a boolean}} */}
        {/* edit@qf9 [[sc=10;ec=14]] {{!!(test)}} */}
        {/* fix@qf10 {{Convert the conditional to a boolean}} */}
        {/* edit@qf10 {{        {(test || !!(count)) && <List elements={collection} />}}} */}
      </div>
    )
  }
  const Component5 = (test: number, count: number, collection) => {
    return (
      <div>
        {(test || (count)) && <List elements={collection} />} {/* Noncompliant [[qf1,qf2]] {{Convert the conditional to a boolean to avoid leaked value}} {{Convert the conditional to a boolean to avoid leaked value}}*/}
        {/* fix@qf1 {{Convert the conditional to a boolean}} */}
        {/* edit@qf1 [[sc=10;ec=14]] {{!!(test)}} */}
        {/* fix@qf2 {{Convert the conditional to a boolean}} */}
        {/* edit@qf2 {{        {(test || !!(count)) && <List elements={collection} />}}} */}
      </div>
    )
  }
}
