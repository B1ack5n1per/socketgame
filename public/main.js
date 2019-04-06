const roomNum = Number(localStorage.getItem('roomnum'));
const username = localStorage.getItem('username');
let rooms;
let roomDetails;
let socket = io();

function makePlayer(name) {
  return '<li class="player">' + name + '</li>';
}
function removeElement(arr, query) {
  let temp = []
  for (i = 0; i < arr.length; i++) {
    if (!(arr[i].sideA == query.sideA && arr[i].sideB == query.sideB)) {
      temp.push(arr[i]);
    };
  };
  return temp;
};
function MakeCard (word, meaning) {
  this.word = word;
  this.meaning = meaning;
}
function addPlayers(array) {
  $('.player').remove();
  for (i = 0; i < array.length; i++) {
    $('#players').append(makePlayer(array[i].name));
  }
}
function addMessages() {
  $('.message').remove();
  for (i = 0; i < roomDetails.messages.length; i++) {
    let message = roomDetails.messages[i];
    $('#messages').append(`<li class="message"><span class="bold">${message.user}: </span>${message.msg}`);
  }
}

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
  })
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
      //start game
      console.log('start');
    };
  });
});
