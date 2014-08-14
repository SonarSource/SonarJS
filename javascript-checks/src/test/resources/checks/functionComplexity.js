function ko() // +1
{
  switch (foo) // +0
  {
    case 1: // +1
    case 2: // +1
    case 3: // +1
    case 4: // +1
    default: // +0
    ;
  }
}

function * ko() {
    switch (foo) // +0
    {
        case 1: // +1
        case 2: // +1
        case 3: // +1
        case 4: // +1
        default: // +0
            ;
    }
}

function ok() {
}
