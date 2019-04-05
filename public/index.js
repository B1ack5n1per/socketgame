function validate(success) {
  if ($('#username').val().length > 0) {
    success();
  } else {
    let errors = document.getElementsByClassName('error');
    if (errors.length === 0) {
      $('#setup').prepend('<p class="error">Please enter a Username</p>');
    } else {
      $('.error').remove(() => {
        $('#setup').prepend('<p class="error">Please enter a Username</p>');
      });
    };
  };
}

$(document).ready(() => {
  $.ajax({
    url: "/getGameList",
    type: "get",
    success: (data) => {
      $('.spinner').fadeOut('fast');
      let rooms = data;
      for (let i = 0; i < rooms.length; i++) {
        let players = 'Players: ';
        for (ii = 0; ii < rooms[i].players.length; ii++) {
          players += rooms[i].players[ii].name + ', ';
        }
        let room = `
          <li class="room" id="${rooms[i].roomId}">
            <h2 class="name">${rooms[i].name}</h2>
            <div class="body">
              <p class="players">${players}</p>
              <p class="topic">
                <span class="bold">Topic:</span>
                ${rooms[i].topic}
              </p>
              <p class="owner">
                <span class="bold">Owner:</span>
                ${rooms[i].owner}
              </p>

            </div>
          </li>`;
        $('#games-list').append(room);
      };
      $('#games-list > li').on('click', (event) => {
        let room = event.currentTarget.id;
        localStorage.removeItem('roomnum');
        localStorage.setItem('roomnum', room);
        localStorage.setItem('username', $('#username').val());
        validate(() => {
        window.location.href += 'game';
        });
      });
    },
  });
  let prevName = localStorage.getItem('username');
  if (prevName) {
    $('#username').val(prevName);
  };
  $('#submit').on('click', () => {
    validate(() => {
      let topic = prompt('Please enter a topic');
      $.ajax({
        type: 'post',
        url: '/makeGame',
        headers: {
          contentType: 'application/json',
        },
        data: {
          owner: $('#username').val(),
          name: `${$('#username').val()}'s Game`,
          topic: topic,
        },
        success: (data) => {
          localStorage.setItem('roomnum', data.room);
          localStorage.setItem('username', $('#username').val());
          window.location.href += 'game';
        }
      });
    });
  });
  $('#setup').on('click', 'p', (event) => {
    $(`.${event.target.className}`).fadeOut('fast', () => {
      $(`.${event.target.className}`).remove();
    });
  });

});
