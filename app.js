// Config
const express = require('express');
const path = require('path');
const app = express();
const server = require('http').createServer(app);
const io = require('./socket.io-master/socket.io-master')(server);
const port = process.env.PORT || 3000;
const url = require('./config/mongodb.js').url;
const mongodb = require('mongodb').MongoClient;
const bodyparser = require('body-parser');

// Run

mongodb.connect(url, (err, db) => {
  server.listen(port, () => {
    console.log(`server started on port:${port}`);
  });
  require('./routers/index.js')(app, db, io);
});


app.use(express.static('./public'));
app.use(bodyparser.urlencoded({ extended: true }));
