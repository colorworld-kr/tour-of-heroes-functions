/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { helloWorld, addmessage, makeuppercase } = require('./sample-api/sample-simple');
const { mysqlConnectTest } = require('./sample-api/sample-mysql-connection');
const { api: apiTest } = require('./sample-api/sample-firebase-auth');

exports.helloWorld = helloWorld;
exports.addmessage = addmessage;
exports.makeuppercase = makeuppercase;

exports.mysqlConnectTest = mysqlConnectTest;
exports.apiTest = apiTest;

