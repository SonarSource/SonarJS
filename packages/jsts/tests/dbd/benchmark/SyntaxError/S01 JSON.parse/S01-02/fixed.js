const consts = {},
  token = 'foo',
  day = 42;

const invalidJSON = '{';

const response = {
  json: () => {
    JSON.parse(invalidJSON);
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
  )
    .then(response => response.json())
    .catch(e => {
      console.log('ERR : PronoteHomeworks', e);
      return [];
    });
})();
