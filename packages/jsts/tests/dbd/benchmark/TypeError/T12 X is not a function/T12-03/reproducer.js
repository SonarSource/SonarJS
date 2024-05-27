function getTextContent() {
  return 'foo';
}
function getMessageId() {}

const notify = function(message,type,title,settings){
  // ...

  const messageText = getTextContent(message);
  /***used to avoid duplication on messages */
  const mId = getMessageId(type+getTextContent(title)+messageText.subString(0,Math.min(messageText.length,15))); // Noncompliant: substring is not a function

  // ..
}

notify();
