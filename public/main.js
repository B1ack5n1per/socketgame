const roomNum = Number(localStorage.getItem('roomnum'));
const username = localStorage.getItem('username');
let rooms;
let roomDetails;
let socket = io();
let curCard = {
  sideA: undefined,
  sideB: undefined,
};
let order;
let curTime = 0;
let curIndex;
let curSide;
let timer;

function makePlayer(name) {
  return '<li class="player">' + name + '</li>';
};
function removeElement(arr, query) {
  let temp = []
  for (i = 0; i < arr.length; i++) {
    if (!(arr[i].sideA == query.sideA && arr[i].sideB == query.sideB)) {
      temp.push(arr[i]);
    };
  };
  return temp;
};
function MakeCard(word, meaning) {
  this.word = word;
  this.meaning = meaning;
};
function addPlayers(array) {
  $('.player').remove();
  for (i = 0; i < array.length; i++) {
    $('#players').append(makePlayer(array[i].name));
  }
};
function addMessages() {
  $('.message').remove();
  for (i = 0; i < roomDetails.messages.length; i++) {
    let message = roomDetails.messages[i];
    $('#messages').append(`<li class="message"><span class="bold">${message.user}: </span>${message.msg}`);
  }
};
function shake(id) {
  $(id).css('animation', 'shake 0.5s');
  window.setTimeout(() => {
    $(id).css('animation', '')
  }, 600);
};
function setCard(card) {
  curCard.sideA = card.sideA;
  curCard.sideB = card.sideB;
};
function countdown(call) {
  $('#timer').css('font-size', '10rem');
  $('#timer').toggleClass('center');
  for (let i = 1; i <= 5; i++) {
    window.setTimeout(() => {
      if (i === 5) {
        $('#timer').html('0');
        $('#timer').css('font-size', '2rem');
        $('#timer').toggleClass('center');
        call()
      } else if (i === 4) {
        $('#timer').html('GO!');
      } else {
        $('#timer').html(4 - i);
      }
    }, 750 * i);
  };
};
function endRound() {
  $('#cur-card').html('');
  curIndex++;
  clearInterval(timer);
  curTime = 0;
  curSide = Math.floor(Math.random() * 2);
  if (curIndex === Number($('#rounds').val())) {
    location.reload();
  } else {
    start();
  }
};

function start() {
  countdown(() => {
    let time = Number($('#time').val());
    $('#input').css('display', 'block');
    $('#input').focus();
    if (curSide === 0) {
      $('#cur-card').html(roomDetails.cards[curIndex].sideB);
    } else {
      $('#cur-card').html(roomDetails.cards[curIndex].sideA);
    }
    timer = setInterval(() => {
      curTime++;
      $('#timer').html(curTime);
      if (curTime === time) {
        clearInterval(timer);
        endRound();
      };
    }, 1250);
  });
};


$(document).ready(() => {
  $.ajax({
    type: 'post',
    url: '/join',
    headers: {
      contentType: 'application/json',
    },
    data: {
      room: roomNum,
      username: username,
    },
    success: () => {
      $.ajax({
        type: "get",
        url: "/getGameList",
        success: (data) => {
          rooms = data;
          for (i = 0; i < rooms.length; i++) {
            if (rooms[i].roomId === roomNum) {
              roomDetails = rooms[i];
            };
          };
          $('header > span').html(roomDetails.name);
          $('#owner').append(roomDetails.owner);
          $('#topic > input').val(roomDetails.topic);
          $('#time').val(roomDetails.settings.time);
          $('#rounds').val(roomDetails.settings.rounds);
          addMessages();
          for (ii = 0; ii < roomDetails.cards.length; ii++) {
            $('.cards').append(`
            <div class="card">
              <textarea readonly class="side-a">${roomDetails.cards[ii].sideA}</textarea>
              <textarea readonly class="side-b">${roomDetails.cards[ii].sideB}</textarea>
              <i class="remove far fa-times-circle"></i>
            </div>`);
          }
        }
      });
    }
  });
  $('header > i').on('click', () => {
    let newTitle = prompt('Please enter the new Game Name');
    if (newTitle.length > 0) {
      $.ajax({
        type: 'post',
        url:'/setName',
        headers: {
          contentType: 'application/json'
        },
        data: {
          roomId: roomNum,
          newName: newTitle,
        },
        success: () => {
          $('header > span').html(newTitle);
        },
      })
    };
  });
  $('#topic > input').on('change', () => {
    console.log('fired')
    $.ajax({
      type: 'post',
      url: '/topicChange',
      headers: {
        contentType: 'application/json',
      },
      data: {
        room: roomNum,
        newTopic: $('#topic > input').val(),
      },
      success: (data) => {

      },
    });
  });
  $('#make-card').on('click', () => {
    $('.popup').fadeIn('fast');
  });
  $('.popup').on('click', (event) => {
    if (event.target === event.currentTarget) {
      $('.popup').fadeOut('fast');
      $('.card-content > textarea').val('');
    }
  });
  $('.card-content > textarea').on('focus', (event) => {
    $(event.currentTarget).attr('placeholder', '');
  });
  $('.card-content > textarea').on('blur', (event) => {
    if (event.currentTarget.id == 'side-a') {
      $(event.currentTarget).attr('placeholder', 'Side A');
    } else {
      $(event.currentTarget).attr('placeholder', 'Side B');
    }
  });
  $('#create-card').on('click', () => {
    socket.emit('card', {
      sideA: $('#side-a').val(),
      sideB: $('#side-b').val(),
      room: roomNum,
    });
    $('.popup').trigger('click');
  });
  $('#message').on('keypress', (event) => {
    if (event.keyCode === 13) {
      $('#send').trigger('click');
    };
  });
  $('#send').on('click', () => {
    let message = $('#message').val();
    if (message.length > 0) {
      socket.emit('message',  {
        user: username,
        room: roomNum,
        msg: message,
      });
      $('#message').val('');
    }
  });
  $('.cards').on('click', 'div > i.remove', (event) => {
    let query = {
      sideA: event.currentTarget.parentElement.children[0].innerHTML,
      sideB: event.currentTarget.parentElement.children[1].innerHTML,
    }
    socket.emit('removeCard', { room: roomNum, card: query });
  });
  $('#game-details > p > input').on('change', () => {
    socket.emit('change settings', {
      room: roomNum,
      settings: {
        time: $('#time').val(),
        rounds: $('#rounds').val(),
      },
    })
  });
  $('#start').on('click', () => {
    socket.emit('start', { room: roomNum });
  });
  $('#input').on('change', () => {
    let guess = $('#input').val();
    if (curSide === 0) {
      if (guess === roomDetails.cards[curIndex].sideA) {
      socket.emit('guess', {
        room: roomNum,
        user: username,
      });
        alert('correct');
      } else {
        shake('#input');
      }
      $('#input').val('');
    } else {
      if (guess === roomDetails.cards[curIndex].sideB) {
      socket.emit('guess', {
        room: roomNum,
        user: username,
      });
        alert('correct');
      } else {
        shake('#input');
      }
      $('#input').val('');
    }

  });
  $('#input').on('keydown', (event) => {
    if (event.keyCode === 13) {
      $('#input').trigger('change');
    }
  });

  window.onbeforeunload = function () {
    $.ajax({
      type: 'post',
      url: '/leave',
      headers: {
        contentType: 'application/json',
      },
      data: {
        room: roomNum,
        name: username,
      },
      success: () => {
        console.log('quit');
      }
    })
  };

  socket.on('change topic', (data) => {
    console.log(data)
    if (Number(data.room) == roomNum) {
      $('#topic > input').val(data.newTopic);
    };
  });
  socket.on('player joined', (data) => {
    if (data.room == roomNum) {
      addPlayers(data.players)
    };
  });
  socket.on('change name', (data) => {
    if (Number(data.roomId) == roomNum) {
      $('header > span').html(data.newName);
    };
  });
  socket.on('message', (data) => {
    console.log(data);
    if (Number(data.room) === roomNum) {
      roomDetails.messages.push({ user: data.user, msg: data.msg });
      addMessages();
    }
  });
  socket.on('card', (data) => {
    if (data.room == roomNum) {
      roomDetails.cards.push({
        sideA: data.sideA,
        sideB: data.sideB,
      });
      $('.cards').append(
        `<div class="card">
          <textarea readonly class="side-a">${data.sideA}</textarea>
          <textarea readonly class="side-b">${data.sideB}</textarea>
          <i class="remove far fa-times-circle"></i>
        </div>`
      );
    }
  });
  socket.on('removeCard', (data) => {
    if (roomNum == data.room) {
      roomDetails.cards = removeElement(roomDetails.cards, data.card);
      $('.card').remove();
      for (i = 0; i < roomDetails.cards.length; i++) {
        $('.cards').append(`
        <div class="card">
          <textarea readonly class="side-a">${roomDetails.cards[i].sideA}</textarea>
          <textarea readonly class="side-b">${roomDetails.cards[i].sideB}</textarea>
          <i class="remove far fa-times-circle"></i>
        </div>`);
      }
    }
  });
  socket.on('error', (data) => {
    if (data.room == roomNum) {
      alert(data.error);
    }
  });
  socket.on('change settings', (data) => {
    if (data.room == roomNum) {
      $('#time').val(data.settings.time);
      $('#rounds').val(data.settings.rounds);
    }
  });
  socket.on('start', (data) => {
    if (data.room == roomNum) {
      if (Number($('#rounds').val()) > roomDetails.cards.length) {
        $('#rounds').val(roomDetails.cards.length);
      };
      $('#game-stuff').slideUp('fast', () => {
        window.setTimeout(() => {
          let chat = $('#chat').detach();
          chat.appendTo('#game-container');
          $('#game-container').slideDown('fast');
          $('#game-container').css('display', 'grid');
        }, 500);
      });
      roomDetails.cards = data.cards;
      curIndex = 0;
      curSide = Math.floor(Math.random() * 2);
      start();
    };
  });
  socket.on('guess', (data) => {
    if (roomNum === data.room) {
      roomDetails = data.details;
      if (username === data.player) {
        let place = roomDetails.ranking.length;
        alert('you placed: ' + place);
      }
    }
  });
  socket.on('next round', (data) => {
    endRound();
  });
});
