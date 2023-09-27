const { Signale } = require('signale');
const options = {
secrets: []
};
const logger = new Signale(options); // Sensitive
const logger2 = new Signale(); // Sensitive
