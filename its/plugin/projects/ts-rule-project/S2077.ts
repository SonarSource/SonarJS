import * as mysql from 'mysql';

const mycon = mysql.createConnection({ host, user, password, database });
mycon.connect(function(error) {
  mycon.query('SELECT * FROM users WHERE id = ' + userinput, (err, res) => {}); // Noncompliant
});
