// Where the backend to frontend code goes
console.log(socket_config);
const ws = new WebSocket(`ws://${socket_config.hostname}:${socket_config.port}`);

ws.addEventListener("open", function () {
    console.log("Connected!");
});

function wsend(data) {
    ws.send(JSON.stringify(data));
}

let named = false;
let first_game = true;

ws.addEventListener("message", function (e) {
    const instruction = JSON.parse(e.data);

    switch (instruction.type) {
    case Messages.NAME_ACCEPT:
	// Send the user to a loading screen waiting for players....
	named = true;
	break;
    case Messages.NAME_REJECT:
	// Tell the user to select a better name
	break;
    case Messages.TURN_ACCEPT:
	console.log("Your turn has been accepted by the server!");
	break;
    case Messages.TURN_REJECT:
	console.log("Your turn has been REJECTED by the server!");
	break;
    case Messages.PING:
	wsend({"type" : Messages.PING_RESPOND});
	break;
    case Messages.GAME:
	// Now we can start the game
	// Initialization of player and opponent score
	player_score = 0;
	opponent_score = 0;

	// Initialization of player and opponent names
	opponent_name = instruction.opponent;
	player_name = name_entry_input.value;

	// Replace the name with the game screen
	space.innerHTML = "";
	space.appendChild(gamebox);

	if (first_game) {
	    // Set up the scorebox
	    // score_box = document.getElementById("scorebox");
	    score_box.appendChild(player_div);
	    score_box.appendChild(opponent_div);
	    first_game = false;
	}
	
	update_score();
	break;
    case Message.VICTORY:
	break;
    case Message.DEFEAT:
	break;
    case SEND_BOARD:
	break;
    case Messages.MESSAGE:
	console.log("Server says: " + instruction.message);
	break;
    default:
	console.log("Not implemented yet");
	break;
    }
});

name_entry_button.addEventListener("click", function () {
    // Submit a message to the server
    wsend({
	"type" : Messages.NAME,
	"name" : name_entry_button.value, 
    });
    // Go to loading screen

    space.innerHTML = "";
    space.appendChild(name_loading_screen);
});
