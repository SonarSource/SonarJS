const Component1 = collection => {
  const count = 0;
  return (
    <div>
      {count && <List elements={collection} />/*Noncompliant - count will be leaked*/}
    </div>
  );
};

const Component2 = collection => {
  const test = '';
  return (
    <div>
      {test && <List elements={collection} />/*Compliant - test is a string but we don't use react-native*/}
    </div>
  );
};

import react from 'react-native';
const Component3 = collection => {
  const test = '';
  return (
    <div>
      {test && <List elements={collection} />/*Noncompliant - test is a string and we use react-native*/}
    </div>
  );
};
