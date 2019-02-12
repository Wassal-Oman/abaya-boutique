// import needed libraries
const path = require("path");
const express = require("express");
const firebase = require("firebase");
const admin = require("firebase-admin");
const { Storage } = require('@google-cloud/storage');
const Multer = require('multer');
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

// firebase storage
const storage = new Storage({
  projectId: 'abayaboutique-55a40',
  keyFilename: path.join(__dirname, "ServiceAccountKey.json")
});

// storage bucket
const bucket = storage.bucket("gs://abayaboutique-55a40.appspot.com/");

// multer storage
const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
      fileSize: 5 * 1024 * 1024
  }
});

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
  // empty array
  let abayas = [];
  
  // get data
  db.collection("abayas").get().then(snapshot => {
      // load users' data
      snapshot.forEach(doc => {
        abayas.push({
          id: doc.id,
          name: doc.data().name,
          price: doc.data().price,
          width: doc.data().width,
          height: doc.data().height,
          size: doc.data().size,
          color: doc.data().color,
          image: doc.data().image
        });
      });

      // render users page
      res.render("abayas", {
        abayas
      });
  }).catch(err => {
    console.log(err);
    res.redirect("/500");
  });
});

// add abaya
router.get("/abayas/add", sessionChecker, (req, res) => {
  res.render("addAbaya");
});

// store abaya
router.post("/abayas/store", sessionChecker, multer.single('file'), (req, res) => {
  // get inputs
  const { name, type, price, width, height, color } = req.body;
  const file = req.file;

  if(file) {
      // try uploading the file
      uploadImageToStorage(file).then((link) => {
          // add sweet data to firestore
          db.collection("abayas").doc().set({
              name,
              price,
              width,
              height,
              type,
              color,
              image: link
          }).then(val => {
              console.log(val);
              res.redirect("/abayas");
          }).catch(err => {
              console.log(err);
              res.redirect("/abayas/add");
          });
      }).catch((err) => {
          console.log(err);
          res.redirect("/abayas/add");
      });
  } else {
      console.log('No file has been chosen');
      res.redirect("/abayas/add");
  }
});

// delete abaya
router.get("/abayas/:id/delete", sessionChecker, (req, res) => {
  // get id
  const id = req.params.id;

  if(id) {
      db.collection("abayas").doc(id).delete().then(val => {
          console.log(val);
          res.redirect("/abayas");
      }).catch(err => {
          console.log(err);
          res.redirect("/abayas");
      });
  } else {
      console.log("Cannot get document id");
      res.redirect("/abayas");
  }
});

// edit abaya
router.get("/abayas/:name/edit", sessionChecker, (req, res) => {
  // get sweet name
  const name = req.params.name;
  let data = [];

  if(name) {
      // get sweet details
      db.collection("abayas").where("name", "==", name).get().then(snapshot => {
          if(!snapshot.empty) {

              // fetch all results
              snapshot.forEach(doc => {
                  data.push({
                      id: doc.id,
                      name: doc.data().name,
                      type: doc.data().type,
                      price: doc.data().price,
                      color: doc.data().color,
                      width: doc.data().width,
                      height: doc.data().height
                  });
              });

              // render edit sweet page
              res.render("editAbaya", {
                  abaya: data[0]
              });
          } else {
              console.log("No data available for this abaya");
              res.redirect("/abayas");
          }
      }).catch(err => {
          console.log(err);
          res.redirect("/abayas");
      });
  } else {
      console.log("Cannot get abaya name");
      res.redirect("/abayas");
  }
});

// update abaya
router.post("/abayas/update", sessionChecker, multer.single('file'), (req, res) => {

  // get sweet details
  const { id, name, type, price, color, width, height } = req.body;
  const file = req.file;

  if(file) {
      // try uploading the file
      uploadImageToStorage(file).then((link) => {
          // edit sweet data in firestore
          db.collection("abayas").doc(id).update({
              name,
              price,
              color,
              width,
              height,
              type,
              image: link
          }).then(val => {
              console.log(val);
              res.redirect("/abayas");
          }).catch(err => {
              console.log(err);
              res.redirect(`/abayas/${name}/edit`);
          });
      }).catch((err) => {
          console.log(err);
          res.redirect(`/abayas/${name}/edit`);
      });
  } else {
      // edit sweet data in firestore
      db.collection("abayas").doc(id).update({
          name,
          price,
          color,
          width,
          height,
          type
      }).then(val => {
          console.log(val);
          res.redirect("/abayas");
      }).catch(err => {
          console.log(err);
          res.redirect(`/abayas/${name}/edit`);
      });
  }
});

// orders
router.get("/orders", sessionChecker, (req, res) => {
  // empty array
  let orders = [];

  // get data
  db.collection("orders").get().then(snapshot => {
      // load users' data
      snapshot.forEach(doc => {
          orders.push(doc.data());
      });

      // render users page
      res.render("orders", {
          orders
      });
  }).catch(err => {
      console.log(err);
      res.redirect("/500");
  });
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

/**
 * Function to handle files
 */
const uploadImageToStorage = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject('No image file');
    }

    let newFileName = `${file.originalname}_${Date.now()}`;

    let fileUpload = bucket.file(newFileName);

    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype
      }
    });

    blobStream.on('error', (err) => {
      reject(err);
    });

    blobStream.on('finish', () => {
      // The public URL can be used to directly access the file via HTTP.
      const url = `https://firebasestorage.googleapis.com/v0/b/abayaboutique-55a40.appspot.com/o/${fileUpload.name}?alt=media`;
      resolve(url);
    });

    blobStream.end(file.buffer);
  });
}

// export router
module.exports = router;
