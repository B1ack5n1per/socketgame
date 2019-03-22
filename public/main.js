const roomNum = Number(localStorage.getItem('roomnum'));
const username = localStorage.getItem('username');
let rooms;
let roomDetails;
let socket = io();

function makePlayer(name) {
  return '<li class="player">' + name + '</li>';
}

function addPlayers(array) {
  $('.player').remove();
  for (i = 0; i < array.length; i++) {
    console.log(array[i].name);
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
          addMessages();
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
    })
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
});
