function getText() {
  return Math.random() > 0.5 ? 'abc' : 'def';
}

const text = getText();
const values = [...(true ? [] : text)];
