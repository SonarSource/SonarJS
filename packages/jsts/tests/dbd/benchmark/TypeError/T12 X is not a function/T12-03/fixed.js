function getTextContent() {
  return 'foo';
}
function getMessageId() {}

const notify = function(message,type,title,settings){
  // ...

  const messageText = getTextContent(message);
  /***used to avoid duplication on messages */
  const mId = getMessageId(type+getTextContent(title)+messageText.substring(0,Math.min(messageText.length,15))); // fix

  // ..
}

notify();
