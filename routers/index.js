const path = require('path');
function Room (owner, name, topic) {
  this.owner = owner;
  this.name = name;
  this.players = [];
  this.topic = topic;
  this.roomId = undefined;
  this.messages = [];
  this.cards = [];
  this.settings = {
    time: 30,
    rounds: 1,
  };
  this.rankings = [];
}
let socket;

module.exports = (app, db, io) => {
  function clear(data) {
    db.collection('rooms').updateOne({ roomId: data.room }, { $set: { ranking: [] } }, (err, result) => {
      if (err) {
        throw err;
      } else {
        db.collection('rooms').findOne({ roomId: data.room }, (error, res) => {
          io.emit('guess', {
            player: undefined,
            room: data.room,
            details: res,
          });
        });
      };
    });
  }

  io.on('connection', (ioSocket) => {
    socket = ioSocket;
    socket.on('message', (data) => {
      db.collection('rooms').updateOne({ roomId: data.room }, { $push: { messages: { user: data.user, msg: data.msg }} }, (err, result) => {
        if (err) {
          throw err;
        } else {
          io.emit('message', data);
        };
      });
    });
    socket.on('card', (data) => {
      db.collection('rooms').findOne({ roomId: data.room }, (err, results) => {
        let cards = results.cards;
        let card = {
          sideA: data.sideA,
          sideB: data.sideB,
        };
        let newCard = true;
        for (i = 0; i < cards.length; i++) {
          if (card.sideA == cards[i].sideA && card.sideB == cards[i].sideB) {
            newCard = false;
          };
        }
          if (newCard) {
            db.collection('rooms').updateOne({ roomId: data.room }, { $push: { cards: card } }, (err, result) => {
              if (err) {
                throw err;
              } else {
                io.emit('card', data);
              };
            });
          } else {
            io.emit('error', { room: data.room, error: 'Card Already exists' })
          };
        });
      });
    socket.on('removeCard', (data) => {
      db.collection('rooms').updateOne({ roomId: data.room }, { $pull: { cards: data.card } }, (err, result) => {
        if (err) {
          throw err;
        } else {
          io.emit('removeCard', data);
        };
      });
    });
    socket.on('change settings', (data) => {
      db.collection('rooms').updateOne({ roomId: data.room }, { $set: { settings: data.settings } }, (err, result) => {
        io.emit('change settings', data);
      })
    });
    socket.on('start', (data) => {
      db.collection('rooms').findOne({ roomId: data.room }, (err, results) => {
        let cards = results.cards;
        let indexes = [];
        for (i = 0; i < cards.length; i++) {
            let ranNum = Math.floor(Math.random() * cards.length);
            let newNum = false;
            while (!newNum) {
              let broken = false;
              for (ii = 0; ii < indexes.length; ii++) {
                if (ranNum === indexes[ii]) {
                  ranNum = Math.floor(Math.random() * cards.length);
                  broken = true;
                  break;
                }
              }
              newNum = true;
              if (broken) {
                newNum = false;
              } else {
                indexes.push(ranNum);
              }
            }
          }
        let cardsReordered = [];
        for (i = 0; i < indexes.length; i++) {
          cardsReordered.push(cards[indexes[i]]);
        }
        db.collection('rooms').updateOne({ roomId: data.room }, { $set: { cards: cardsReordered }}, (err, result) => {
          data.cards = cardsReordered;
          io.emit('start', data);
        });
      });
    });
    socket.on('guess', (data) => {
      db.collection('rooms').updateOne({ roomId: data.room }, { $push: { ranking: data.user } }, (err, result) => {
        db.collection('rooms').findOne({ roomId: data.room }, (err, res) => {
          if (res.ranking.length >= res.players.length) {
            clear(data);
            io.emit('next round', data);
          }
          io.emit('guess', {
            player: data.user,
            room: data.room,
            details: res,
          });
        });
      });
    });
    socket.on('clear ranks', (data) => {
      clear(data);
    });
  });
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/home.html'));
  });
  app.get('/getGameList', (req, res) => {
    db.collection('rooms').find().toArray((err, rooms) => {
      if (err) {
        throw err;
      }
      res.send(rooms);
    });
  });
  app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/main.html'));
  });
  app.post('/join', (req, res) => {
    let data = req.body;
    db.collection('rooms').updateOne({ roomId: Number(data.room) }, { $push: { players: { name: data.username } } }, (err, result) => {
      db.collection('rooms').findOne({ roomId: Number(data.room) }, (err, result) => {
        if (err) {
          throw err;
        } else {
          io.emit('player joined', { room: data.room, players: result.players });
          res.send('');
        };
      });
    });
  });
  app.post('/makeGame', (req, res) => {
    let newGame = new Room(req.body.owner, `${req.body.owner}'s Game`, req.body.topic);
    db.collection('rooms').find().toArray((err, data) => {
      let rooms = data;
      let ordered = true;
      for (i = 1; i < rooms.length + 1; i++) {
        if (rooms[i - 1].roomId != i && ordered) {
          ordered = false;
          newGame.roomId = i;
        }
      }
      if (ordered) {
        newGame.roomId = rooms.length + 1;
      }
      db.collection('rooms').insertOne(newGame, (err, result) => {
        res.send({room: newGame.roomId});
      });
    });
  });
  app.post('/setName', (req, res) => {
    let data = req.body;

    db.collection('rooms').update({ roomId: Number(data.roomId) }, { $set: { name: data.newName}}, (err, result) => {
      if (err) {
        throw err;
      } else {
        io.emit('change name', data);
        res.send('Success');
      };
    });
  });
  app.post('/leave', (req, res) => {
    db.collection('rooms').updateMany({ roomId: Number(req.body.room) }, { $pull: { players: { name: req.body.name } } }, () => {
      db.collection('rooms').findOne({ roomId: Number(req.body.room) }, (err, result) => {
        if (err) {
          throw err;
        } else {
          io.emit('player joined', { room: req.body.room, players: result.players });
          res.send('');
        };
      });
    });
  });
  app.post('/topicChange', (req, res) => {
    let data = req.body;
    db.collection('rooms').updateOne({ roomId: Number(data.room) }, { $set: { topic: data.newTopic } }, (err, result) => {
      io.emit('change topic', data);
    })
  });
};
