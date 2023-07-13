// const firebaseConfig = require("../firebaseconfig");
// import { firebaseConfig } from "../firebaseconfig";
// const firebaseConfig = require('../firebaseconfig.json');

require('dotenv').config();

// const functions = require("firebase-functions");

// const firebaseConfig = {
//   apiKey: process.env.FB_APIKEY,
//   authDomain: process.env.FB_AUTHDOMAIN,
//   projectId: process.env.FB_PROJECTID,
//   storageBucket: process.env.FB_STORAGEBUCKET,
//   messagingSenderId: process.env.FB_MESSAGINGSENDERID,
//   appId: process.env.FB_APPID,
//   measurementId: process.env.FB_MEASUREMENTID
// }

const { onRequest } = require("firebase-functions/v2/https");

const { initializeApp, getApp, getApps } = require('firebase/app');
// const app = initializeApp(firebaseConfig);
// getApps().length === 0 ? initializeApp(firebaseConfig) : getApp(); // 중복 초기화 방지
getApps().length === 0 ? initializeApp(JSON.parse(process.env.TOH_FIREBASE_CONFIG)) : getApp(); 
/* .env sample
TOH_FIREBASE_CONFIG='{
  "apiKey": "api-key",
  "authDomain": "project-id.firebaseapp.com",
  "databaseURL": "https://project-id.firebaseio.com",
  "projectId": "project-id",
  "storageBucket": "project-id.appspot.com",
  "messagingSenderId": "sender-id",
  "appID": "app-id",
  "measurementId": "measurement-i"
}'
 */

const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");


const admin = require("firebase-admin");
const { initializeApp: initAdminApp, getApps: getAdminApps, getApp: getAdminApp} = require("firebase-admin/app");
getAdminApps().length === 0 ? initAdminApp() : getAdminApp(); // admin



const login = onRequest((request, response) => {
  // console.log(JSON.parse(process.env.FB_CONFIG));

  const { email, password } = request.body;
  const auth = getAuth();
  signInWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      // Signed in
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      // const csrfToken = user.refreshToken; xxx

      // const token = jwt.sign({ userId }, SECRET_KEY, { expiresIn: TOKEN_EXPIRATION });
      // return response.status(200).json({ user: user });

      // return response.status(200).json({ idToken });
      // ...

      // Set session expiration to 5 days.
      const expiresIn = 60 * 60 * 24 * 5 * 1000;
      // Create the session cookie. This will also verify the ID token in the process.
      // The session cookie will have the same claims as the ID token.
      // To only allow session cookie setting on recent sign-in, auth_time in ID token
      // can be checked to ensure user was recently signed in before creating a session cookie.
      admin.auth()
        .createSessionCookie(idToken, { expiresIn })
        .then(
          (sessionCookie) => {
            function uuidv4() {
              return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
              });

            }
            const csrfToken = uuidv4(); // 추후 npm 라이브러리로 대체 - uuid
            console.log(sessionCookie);
            // sessionCookie.csrfToken = csrfToken;
            // Set cookie policy for session cookie.
            const options = { maxAge: expiresIn, httpOnly: true, secure: true };
            response.cookie('sessionCookie', sessionCookie, options);
            // response.cookie('a', 1);
            // response.cookie('b', 2);

            response.cookie('csrfToken', csrfToken, options);
            // response.header('Set-Cookie', [`sessionCookie=${sessionCookie}; ${options}`, `csrfToken=${csrfToken}; ${options}`]);

            response.end(JSON.stringify({ status: 'success', csrfToken }));
          },
          (error) => {
            response.status(401).send('UNAUTHORIZED REQUEST!');
          }
        );
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;

      return response.status(400).json({ errorCode, errorMessage });
    });
});

const logout = onRequest((request, response) => {
  // console.log(JSON.parse(process.env.FB_CONFIG));

  // 로그아웃 대상자 확인
  // 사용자 토큰 확인
  // 토큰으로 사용자의 로그인 상태 확인

  // const authHeader = req.headers.authorization;

  // const decodedIdToken = await admin.auth().verifyIdToken(firebaseIdToken);
  // console.log(decodedIdToken);
  // const userRecord = await admin.auth().getUser(request.userId);

  // console.log(request.headers.cookie);
  // console.log(request.cookies);
  const cookie = request.headers.cookie?.split(";"); // 쿠키 관련 코드 : 추후 npm 라이브러리로 대체 - cookie-parser + body-parser
  let cookies = {};
  for (let i = 0; i < cookie.length; i++) {
    const keyvalue = cookie[i].split("=");
    const key = keyvalue[0];
    const value = keyvalue[1];

    // if (value !== 'undefined') {
      console.log(key,value);
      cookies[key.trim()] = value;
    // }
  }

  const csrfToken = cookies['csrfToken'] || '';
  // const sessionCookie = request.headers.cookie?.split("=")[1]||'';
  const sessionCookie = cookies['sessionCookie'] || '';

  // response.send(`${cookies['a']}, ${cookies['b']}`);
  // const sessionCookie = request.cookies.session || '';
  // // Verify the session cookie. In this case an additional check is added to detect
  // // if the user's Firebase session was revoked, user deleted/disabled, etc.
  admin.auth()
  .verifySessionCookie(sessionCookie, true /** checkRevoked */)
  .then((decodedClaims) => {
      // console.log(sessionCookie);
      response.clearCookie('sessionCookie');
      return response.status(200).json({ decodedClaims });
      // serveContentForUser('/profile', req, res, decodedClaims);
    })
    .catch((error) => {
      // Session cookie is unavailable or invalid. Force user to login.
      // res.redirect('/login');

      const errorCode = error.code;
      const errorMessage = error.message;

      return response.status(400).json({ errorCode, errorMessage });
    });


  // 로그아웃 처리
  // const auth = getAuth();
  // signOut(auth).then(() => {
  //   // Sign-out successful.
  // res.send(`Bye, user ${req.userId}! See You later.`);
  // }).catch((error) => {
  //   // An error happened.
  //   return res.status(400).json({ error: error.message });
  // });

});



module.exports = {
  login,
  logout
};
