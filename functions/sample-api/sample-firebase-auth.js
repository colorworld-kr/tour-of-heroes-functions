// const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { onRequest } = require("firebase-functions/v2/https"); //v2

require('dotenv').config();

const { initializeApp: initAdminApp, getApps: getAdminApps, getApp: getAdminApp } = require("firebase-admin/app");
const { initializeApp: initClientApp, getApps: getClientApps, getApp: getClientApp } = require('firebase/app');

// getApps().length === 0 ? initializeApp() : getApp(); // 중복 초기화 방지
getAdminApps().length === 0 ? initAdminApp() : getAdminApp(); // admin
getClientApps().length === 0 ? initClientApp(JSON.parse(process.env.TOH_FIREBASE_CONFIG)) : getClientApp(); // client

const admin = require("firebase-admin");
const firestore = admin.firestore();

const { getAuth, signInWithEmailAndPassword, signOut } = require("firebase/auth");

const app = express();
app.use(cors({ origin: true }));

const SECRET_KEY = process.env.JWT_SECRET_KEY;
const TOKEN_EXPIRATION = "24h";










// 회원가입 API
app.post("/signup", async (request, response) => {
  const { email, password, firstName, lastName } = request.body;
  // app.get("/signup", async (req, res) => {
  //   const { email, password, firstName, lastName } = req.query;

  try {
    const userRecord = await admin.auth().createUser({ email, password });
    const userId = userRecord.uid;

    // 회원가입 사용자의 부가 정보 저장
    await firestore.collection("users").doc(userId).set({
      firstName,
      lastName,
      email,
    });

    // token은 로그인시 응답
    // const token = jwt.sign({ userId }, SECRET_KEY, { expiresIn: TOKEN_EXPIRATION });
    // return res.status(201).json({ accessToken: token });

    return res.status(201).json({ status: "success", message: "try to login"});
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }
});











// 로그인 API
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    const userId = userRecord.uid;

    // await admin.auth().updateUser(userId, {
    //   disabled: false // 사용 중지/해제 설정 >> disabled: true 설정시 firebase 자체에서 사용정지
    // });

    // console.log(`Successfully fetched user data: ${userRecord.toJSON()}`);
    console.log(`userRecord`);
    console.log(userRecord.toJSON());

    const userSnapshot = await firestore.collection("users").doc(userId).get();
    const userData = userSnapshot.data();

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    // 패스워드 검증은 Firebase의 사용자 관리 기능을 사용하는 것이 좋습니다.
    const auth = getAuth();
    signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        // Signed in
        const user = userCredential.user;
        console.log(`user.email`);
        console.log(user.metadata);

        await admin.auth().setCustomUserClaims(userId, {
          logout: false
        });

        // custom token ... (firebase에서 관리되는 idToken이 별도 존재함 샘플 코드 : /sample-api/sample-firebase-login.js #52~#94 )
        const token = jwt.sign({ userId }, SECRET_KEY, { expiresIn: TOKEN_EXPIRATION });
        return res.status(200).json({ accessToken: token });
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        // 실서비스 : 로그인 시도를 통해 사용자 존재여부 확인 차단
        // return res.status(404).json({ error: "User not found" });
        return res.status(400).json({ errorCode, errorMessage });
      });
  } catch (error) {
    // 실서비스 : 로그인 시도를 통해 사용자 존재여부 확인 차단
    // return res.status(404).json({ error: "User not found" });
    return res.status(400).json({ error: error.message });
  }
});










// JWT 토큰 검증 미들웨어 함수
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).send("Unauthorized: No token provided");
    return;
  }

  const token = authHeader.split(" ")[1];

  // const auth = getAuth(); // 작동안함.
  // console.log(`auth.currentUser`);
  // console.log(auth.currentUser);

  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    if (err) {
      // 에러 상황 세분화 
      /*
      export type VerifyErrors =
        | JsonWebTokenError
        | NotBeforeError
        | TokenExpiredError;
       */
      res.status(401).send("Unauthorized: Invalid token");
      return;
    }
    req.userId = decoded.userId;

    try {
      const userRecord = await admin.auth().getUser(req.userId);
      const userId = userRecord.uid;

      // console.log(`Successfully fetched user data: ${userRecord.toJSON()}`);
      console.log(`userRecord`);
      console.log(userRecord.toJSON());

      // const userSnapshot = await firestore.collection("users").doc(userId).get();
      // const userData = userSnapshot.data();

      if (!userId) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      if (userRecord.customClaims?.logout) {
        res.status(401).send("you are logout");
        return;
      }
      next();
    } catch (error) {
      // 실서비스 : 로그인 시도를 통해 사용자 존재여부 확인 차단
      // return res.status(404).json({ error: "User not found" });
      res.status(400).json({ error: error.message });
      return;
    }
  });

};











app.get("/logout", authenticate, (req, res) => {
  const uid = req.userId;
  // Disable the user in Firebase Authentication to prevent them from signing in or refreshing their token
  // admin.auth().updateUser(uid, {
  //   disabled: true // 로그아웃이 아니라 사용중지 설정
  // }).then(async () => {

  // https://firebase.google.com/docs/auth/admin/custom-claims?hl=ko
  admin.auth().setCustomUserClaims(uid, {
    logout: true
  }).then(async () => {
    // Flag the user as disabled in the database, so that we can prevent their reads/writes
    // firebase.database().ref("blacklist").child(uid).set(true);

    const userRecord = await admin.auth().getUser(req.userId);
    const userId = userRecord.uid;

    // console.log(`Successfully fetched user data: ${userRecord.toJSON()}`);
    console.log(`userRecord`);
    console.log(userRecord.toJSON());
    res.send(`Bye, user ${uid}! See You later.`);
  });


  // const userRecord = await admin.auth().getUser(req.userId);
  // const userId = userRecord.uid;

  // // console.log(`Successfully fetched user data: ${userRecord.toJSON()}`);
  // console.log(`userRecord`);
  // console.log(userRecord.toJSON());

  // const auth = getAuth();
  // signOut(auth).then(() => {
  //   // Sign-out successful.
  // res.send(`Bye, user ${req.userId}! See You later.`);
  // }).catch((error) => {
  //   // An error happened.
  //   return res.status(400).json({ error: error.message });
  // });
});














// 인증이 필요한 API 엔드포인트 예시입니다.
app.get("/protected", authenticate, (req, res) => {
  // 여기서 req.userId는 토큰에서 해독된 사용자 ID입니다.
  // 작업을 수행합니다.
  res.send(`Hello, user ${req.userId}! This is a protected endpoint.`);
});




const api = onRequest(app);

module.exports = {
  api
};
