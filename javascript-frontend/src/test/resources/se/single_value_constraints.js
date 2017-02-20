function main(x) {
  if(x === 0) {
    x;  // PS x=ZERO

    let t = x == 0;
    t;  // PS t=TRUE

    let f = x != 0;
    f;  // PS f=FALSE

    t = x == false;
    t;  // PS t=BOOLEAN

    f = x === false;
    f;  // PS f=FALSE
  } else {
    x;  // PS x=NOT_ZERO
  }

  if(x === 0) {
    let y = 0;
    if((x != 0) && (y++)) {
    }
    y;  // PS y=ZERO
  }

  if(x !== 0) {
    x;  // PS x=NOT_ZERO
  }

  x;    // PS x=NOT_ZERO || x=ZERO
  if(x === 0 || typeof x === 'number') {
    x;    // PS x=NOT_ZERO_NUMBER || x=ZERO
    makeLive(x);
  }

}
