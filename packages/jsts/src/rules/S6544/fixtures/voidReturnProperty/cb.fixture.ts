type CallBack = {
  cb: () => void
}

function setCallback(cb: CallBack) {

}

setCallback({cb: async () => {}}); // Noncompliant {{Promise-returning function provided to property where a void return was expected.}}
