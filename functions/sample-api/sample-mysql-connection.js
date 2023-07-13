const { onRequest } = require("firebase-functions/v2/https");
const mysql = require("mysql");
require('dotenv').config();

// The Firebase Admin SDK to access Firestore.

// var functions = require('firebase-functions');
// const admin = require('firebase-admin');
// admin.initializeApp(functions.config().firebase);

// 초기화 실행시 중복 확인
const { initializeApp, getApps, getApp } = require("firebase-admin/app");
getApps().length === 0 ? initializeApp() : getApp(); // 중복 초기화 방지

const mysqlConnectTest = onRequest((request, response) => {

  // var mysql = require('mysql');
  console.log(JSON.parse(process.env.TOH_MYSQL_CONFIG)); 
  // var connection = mysql.createConnection({
  //   host: process.env.DB_HOST,
  //   user: process.env.DB_USER,
  //   password: process.env.DB_PASSWORD,
  //   database: process.env.DB_NAME,
  //   port: process.env.DB_PORT
  // });

  const connection = mysql.createConnection(JSON.parse(process.env.TOH_MYSQL_CONFIG));
/* .env sample
TOH_MYSQL_CONFIG='{
  "host": "localhost/ip_address",
  "user": "auth_user",
  "password": "password",
  "database": "db_name",
  "port": 3306
}'
 */

  connection.connect(function (err) {
    if (err) {
      console.log("not connected");
      console.log(err);
      response.status(401).send({error:err});
      connection.end();
    }

    else {
      connection.query('SELECT * from test', function (err, rows, fields) {
        console.log(rows);
        response.send(rows);
      });
      connection.end();
    }
  });

});


module.exports = {
  mysqlConnectTest
};
