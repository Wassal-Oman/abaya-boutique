// import needed libraries
const path = require("path");
const express = require("express");
const firebase = require("firebase");
const admin = require("firebase-admin");
const router = express.Router();

// firebase configuration
const config = {
  apiKey: "AIzaSyAIq1xT-f_f9cyTFxHr42wc9WdSvxbUO5U",
  authDomain: "abayaboutique-55a40.firebaseapp.com",
  databaseURL: "https://abayaboutique-55a40.firebaseio.com",
  projectId: "abayaboutique-55a40",
  storageBucket: "abayaboutique-55a40.appspot.com",
  messagingSenderId: "243499862776"
};

// initialize firebase
firebase.initializeApp(config);

// firebase admin configuration
const adminConfig = require(path.join(__dirname, "ServiceAccountKey"));

// initialize firebase admin
admin.initializeApp({
  credential: admin.credential.cert(adminConfig),
  databaseURL: "https://abayaboutique-55a40.firebaseio.com"
});

// firebase database
const db = admin.firestore();

// middleware function to check for logged-in users
const sessionChecker = (req, res, next) => {
  if (!firebase.auth().currentUser) {
    res.redirect("/login");
  } else {
    next();
  }
};

// default
router.get("/", sessionChecker, (req, res) => {
  res.redirect("/home");
});

// login - GET
router.get("/login", (req, res) => {
  if (firebase.auth().currentUser) {
    res.redirect("/home");
  }
  res.render("login");
});

// login - POST
router.post("/login", (req, res) => {
  // get user input
  const { email, password } = req.body;

  // authenticate user
  firebase.auth().signInWithEmailAndPassword(email, password).then(data => {
    // get user details
    db.collection("users").doc(data.user.uid).get().then(document => {
      if(document.exists) {
        console.log(document.data());
        if(document.data().type === 'Admin') {
          res.redirect("/home");
        } else {
          console.log("Customer is trying to login");
          res.redirect("/logout");
        }
      } else {
        console.log("No User Data");
        res.redirect("/logout");
      }
    }).catch(err => {
      console.log(err);
      res.redirect("/500");
    });
  }).catch(err => {
    console.log(err);
    res.redirect("/login");
  });
});

// home
router.get("/home", sessionChecker, (req, res) => {
  res.render("home");
});

// users
router.get("/users", sessionChecker, (req, res) => {
  // empty array
  let users = [];

  // get data
  db.collection("users").where("type", "==", "Customer").get().then(snapshot => {
    // load users' data
    snapshot.forEach(doc => {
      users.push(doc.data());
    });

    // render users page
    res.render("users", {
      users
    });
  }).catch(err => {
    console.log(err);
    res.redirect("/500");
  });
});

// abayas
router.get("/abayas", sessionChecker, (req, res) => {
  res.render("abayas");
});

// logout
router.get("/logout", sessionChecker, (req, res) => {
  firebase.auth().signOut();
  res.redirect("/login");
});

// 500
router.get("/500", (req, res) => {
  res.render("500");
});

// export router
module.exports = router;
