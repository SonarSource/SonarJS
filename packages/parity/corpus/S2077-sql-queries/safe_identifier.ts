import * as mysql from 'mysql';

declare const host: string;
declare const user: string;
declare const password: string;
declare const database: string;
declare const userInput: string;

const conn = mysql.createConnection({ host, user, password, database });
const query = 'SELECT * FROM users WHERE id = ' + userInput;
conn.query(query);
