const { EventEmitter } = require("events");

const realtimeBus = new EventEmitter();

module.exports = realtimeBus;
