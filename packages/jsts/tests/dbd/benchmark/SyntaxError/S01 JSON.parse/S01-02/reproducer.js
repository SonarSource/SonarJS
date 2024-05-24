const consts = {},
  token = 'foo',
  day = 42;

const invalidJSON = '{';

const response = {
  json: () => {
    JSON.parse(invalidJSON); // Noncompliant
  },
};
function fetch() {
  return new Promise(resolve => resolve(response));
}

///// fixtures above

(async () => {
  await fetch(
    consts.API + '/homework' + '?token=' + token + '&dateFrom=' + day + '&dateTo=' + day,
    {
      method: 'GET',
    },
  ).then(response => response.json());
})();
