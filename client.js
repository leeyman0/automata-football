// Where the backend to frontend code goes
console.log(socket_config);
var HOST = location.origin.replace(/^http/, 'ws');
const ws = new WebSocket(HOST);

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
	space.innerHTML = "";
	space.appendChild(loading_screen);
	break;
    case Messages.NAME_REJECT:
	// Tell the user to select a better name
	space.innerHTML = "";
	space.appendChild(name_entry);
	let name_entry_label = document.getElementById("enter_message");
	name_entry_label.innerHTML = "That name has been taken. Enter an untaken name: ";
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
	turn = 1;
	
	// Initialization of player and opponent names
	opponent_name = instruction.opponent;
	player_name = name_entry_input.value;

	// Replace the name with the game screen
	space.innerHTML = "";
	space.appendChild(gamebox);

	turn_div.innerHTML = `Turn ${turn}`;
	
	if (first_game) {
	    // Set up the scorebox
	    // score_box = document.getElementById("scorebox");
	    score_box.appendChild(player_div);
	   
	    score_box.appendChild(turn_div);
	    score_box.appendChild(opponent_div);
	    first_game = false;
	} else {
	    image = [];
	    for (let i = 0; i < board_height; i++)
	    {
		image.push(new Array(board_width).fill(0));
	    }
	    image_map(screen_matrix, image);
	}
	
	update_score();
	break;
    case Messages.VICTORY:
	// Display some sort of victory message
	console.log("Victory has been achieved!");
	space.innerHTML = "";
	space.appendChild(victory_screen);
	victory_end_reason.innerHTML = instruction.reason;
	break;
    case Messages.DEFEAT:
	// Display a message of defeat
	console.log("Defeat has been achieved!");
	space.innerHTML = "";
	space.appendChild(defeat_screen);
	end_reason.innerHTML = instruction.reason;
	break;
    case Messages.SEND_BOARD:
	// The next turn can now be emulated
	let rhs = instruction.board;
	let lhs = image.map(function (row) {
	    return row.slice(0, board_width / 2);
	});
	image = board_fit_together(rhs, lhs);
	image_map(screen_matrix, image);
	simulate_turn();
	// At the end, update the turn
	setTimeout(function () {
	    ++turn;
	    turn_div.innerHTML = `Turn ${turn}`;
	}, frames_per_turn * frame_interval);
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
	"name" : name_entry_input.value, 
    });
    // Go to loading screen

    space.innerHTML = "";
    space.appendChild(name_loading_screen);
});

continue_button.addEventListener("click", function () {
    space.innerHTML = "";
    space.appendChild(loading_screen);

    // This requeues the user in a game
    wsend({
	"type" : Messages.CONTINUE,
    });
});

victory_continue_button.addEventListener("click", function () {
    space.innerHTML = "";
    space.appendChild(loading_screen);

    // This requeues the user in a game
    wsend({
	"type" : Messages.CONTINUE,
    });
});


nextbutton.addEventListener("click", function () {
    let board = image.map(function (row) {
	return row.slice(0, board_width / 2);
    });

    // Saying to the server, this is our turn!
    wsend({
	"type" : Messages.TURN,
	"turn" : board,
    });
});
