const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");
// This is a websocket server on the port 8082
const ws_port = 8082;
const wss = new WebSocket.Server({ port : ws_port});

// Shared constants
const board_height = 74;
const board_width = 74;
// Game constants
const frames_per_turn = 250;
const frame_interval = 80;
const turns = 4;

// The game engine
function next_iteration(matrix) {
    // Filling the next matrix with numbers
    let next_matrix = [];
    for (let i = 0; i < board_height; i++)
    {
	next_matrix.push(new Array(board_width).fill(0));
    }
    
    matrix.forEach(function (row, row_nr, mat) {
	let number_of_cols = row.length; 
	let number_of_rows = mat.length;
	let top_edge = row_nr === 0;
	let bottom_edge = row_nr === number_of_rows - 1;
	row.forEach(function (col, col_nr, columns) {
	    // Are we on the bottom edge
	    let left_edge = col_nr === 0;
	    let right_edge = col_nr === number_of_cols - 1;

	    let neighbors = 0;

	    // Definitely not repetitive at all, but it gets done eventually
	    if (!top_edge) {
		if (!left_edge) {
		    if (mat[row_nr - 1][col_nr - 1] === 1)
			++neighbors;
		}
		if (mat[row_nr - 1][col_nr] === 1)
		    ++neighbors;
		if (!right_edge) {
		    if (mat[row_nr - 1][col_nr + 1] === 1)
			++neighbors;
		}
	    }
	    if (!left_edge) {
		if (mat[row_nr][col_nr - 1] === 1)
		    ++neighbors;
	    }
	    if (!right_edge) {
		if (mat[row_nr][col_nr + 1] === 1)
		    ++neighbors;
	    }
	    if (!bottom_edge) {
		if (!left_edge) {
		    if (mat[row_nr + 1][col_nr - 1] === 1)
			++neighbors;
		}
		if (mat[row_nr + 1][col_nr] === 1)
		    ++neighbors;
		if (!right_edge) {
		    if (mat[row_nr + 1][col_nr + 1] === 1)
			++neighbors;
		}
	    }
	    
	    // if (neighbors != 0)
	    //   console.log(`row: ${row_nr}, col: ${col_nr}, neighbors ${neighbors}`);
	    
	    // Game rules go here
	    if (neighbors > 3 || neighbors < 2)
		next_matrix[row_nr][col_nr] = 0; // Overpopulated or underpopulated
	    else if (mat[row_nr][col_nr] === 0 && neighbors === 3) 
		next_matrix[row_nr][col_nr] = 1; // Newly populated cell
	    else if (mat[row_nr][col_nr] === 1)
		next_matrix[row_nr][col_nr] = 1; // Surviving cell
	    else
		next_matrix[row_nr][col_nr] = 0; // Does not meet the requirements
	    
			     
	});
    });

    return next_matrix;
}

function calculate_score_delta(board) {
    let player = 0;
    let opponent = 0;

    board.forEach(function (row) {
	if (row[0] === 1) {
	    ++opponent;
	    row[0] = 0;
	}
	if (row[row.length - 1] === 1) {
	    ++player;
	    row[row.length - 1] = 0;
	}
    });

    return {
	player,
	opponent
    };
}

const Messages = Object.freeze({
    // The client sends these messages
    "NAME" : 0, // "can this be my name?"
    "TURN" : 1, // "here is my turn"
    "CONTINUE" : 2, // "another game please" (after game has ended)
    "PING_RESPOND" : 3, // "here I am!"
    // The server sends these ones
    "NAME_ACCEPT" : 4, // "that name is free"
    "NAME_REJECT" : 5, // "that name is taken"
    "TURN_ACCEPT" : 6, // "taken turn is valid and accepted by the server"
    "TURN_REJECT" : 7, // "taken turn is invalid, please try again"
    "PING" : 8, // "are you there?"
    "GAME" : 9, // "You are now in a game with name:"
    "VICTORY" : 10, // You're winner! Reason:
    "DEFEAT" : 11, // You've lost!
    "MESSAGE" : 12, // Outputs a debug message to the terminal
    "SEND_BOARD" : 13, // Sending the entire board
});

// Serving the static webpages on https:
http.createServer(function (request, response) {
    // Simple utility function
    function serveContent(file, type) {
	fs.readFile(file, function (err, data) {
	    response.writeHead(200, {"Content-Type": type});
	    response.write(data);
	    response.end();
	});
    }
    if (request.url === "/" || request.url === "/index")
	serveContent("./index.html", "text/html");
    else if (request.url === "/gameoflife.js")
	serveContent("./gameoflife.js", "text/javascript");
    else if (request.url === "/message_protocol.js")
	serveContent("./message_protocol.js", "text/javascript");
    else if (request.url === "/client.js")
	serveContent("./client.js", "text/javascript");
    else if (request.url === "/socket_address.js") {
	// This file is not literal, it just is the way it connects to the server through the websocket
	response.writeHead(200, {"Content-Type": "text/javascript"});
	// So that there is the option for extensibility
	// Works for localhost, but probably not much else
	let hostname = request.headers.host.split(":")[0]; 
	response.write(`const socket_config = { hostname : \"${hostname}\",  port : ${ws_port}, \};`);
	// console.log(request.headers);
	response.end();
    }
    else
    {
	console.log(`Requested URL not found: ${request.url}`);
	response.end();
    }
}).listen(8080);


// I created this too late in the game to really use, but it is a valuable abstraction to make
function message(message_contents) {
    return JSON.stringify({
	type : Messages.MESSAGE,
	message : message_contents,
    });
}

// This object serves several purposes
// 1. It is a list of all names currently being used
// 2. It is a bidirectional pipe-translator for games, telling whose turn it is, as well as the opponent of each
let client_names = {};
// Client games contains all of the data for the games that the players play by gameid
// Mapped with game-id (mostly internal usage)
let client_games = new Map();
// We are generating new game ids by counting up from zero, like a serial number
let new_game_id = 0;
function getNewGameId() {
    return new_game_id++; // This is pretty dumb, but it works
}
// Does the queue
let client_queue = [];

function new_matrix(p1, p2) {
    // Initialize the beginning matrix for each player
    // This should do for now
    let lhs = [];
    let rhs = [];
    let turn = 1;
    // Has each player gone yet?
    let p1_gone = false;
    let p2_gone = false;

    return {
	p1,
	p2,
	lhs,
	rhs,
	turn,
    };
}

wss.on("connection", function (ws) { // ws is the web client instance for the connection, when it closes, it sends
    // a message. When it sends a message, it also sends a message
    console.log(`Client connected at ${ws.address}`);

    ws.send(JSON.stringify({
	type : Messages.MESSAGE,
	message : `Your address is ${ws.address}`
    }));

    ws.send(JSON.stringify({
	type : Messages.MESSAGE,
	message : "What is your username?"
    }));

    var client_name = undefined; 
    
    ws.on("message", function (data) {
	const message = JSON.parse(data);

	// We are changing the name
	switch (message.type) {
	case Messages.NAME:
	    // clients can send their own information using the browser. Therefore, some sanitization is necessary
	    // If name is not undefined, we already have a name
	    if (client_name !== undefined) {
		ws.send(JSON.stringify({
		    type : Messages.MESSAGE,
		    message : "You already have a name!"
		}));
		ws.send(JSON.stringify({
		    type: Message.NAME_REJECT,
		}));
		return;
	    }

	    // Other types of data can be encoded in the object, even though it has been designated to be a string
	    if ((typeof message.name) !== "string") {
		ws.send(message("Your name is not a string!"));
		ws.send(JSON.stringify({
		    type : Messages.NAME_REJECT,
		}));
		return;
	    }
	    
	    // Making sure that we got input
	    if (message.name === "") {
		ws.send(JSON.stringify({
		    type : Messages.MESSAGE,
		    message : "Empty name detected, not recorded."
		}));
		ws.send(JSON.stringify({
		    type : Messages.NAME_REJECT,
		}));
		return;
	    }
	    
	    // See if the name is taken
	    if (client_names[message.name] === undefined) {

		// It is paramount that the clients take the names
		client_names[message.name] = {
		    "socket" : ws,
		    "game" : false
		}
		// Making sure that the client name is set 
		client_name = message.name;
		// Enroll the client in the game queue, wait for player two
		client_queue.push(message.name);
		console.log(`Client ${message.name} has joined the queue!`);
		ws.send(JSON.stringify({
		    type : Messages.NAME_ACCEPT,
		}));
		
	    } else {
		// Will replace with something other in the future
		ws.send(JSON.stringify({
		    type : Messages.NAME_REJECT,
		}));
		return;
	    }
	    break;
	case Messages.TURN:
	    // We are taking a turn
	    // A turn is a collection of deltas
	    // We check to see if the players are all still there
	    
	    // We make sure that the deltas are sane, there isn't any hacking going around

	    // First, check to see if the turn came from the right player

	    // Second, check to see if the moves are sane

	    // Thirdly, send the opponent those moves

	    // Thirdly-point-fifthly, complete the moves to calculate the score for each player

	    // Fourthly, check to see if the game is in an end state
	    break;
	case Messages.CONTINUE:
	    // On continue, the server should requeue the player inside the name list
	    // It should break the player away from the current game
	    break;
	default:
	    ws.send(JSON.stringify({
		type : Messages.MESSAGE,
		message : "Unrecognized interaction!"
	    }));
	    break;
	}
	    
    });
    
    
    ws.on("close", function () {
	console.log(`Client ${client_name} at ${ws.address} closed connection`);
	client_names[client_name] = undefined;
    });
});

// Figure out some way to match players to eachother without causing race conditions. Done
// We set a timer for each second, and on that second, a process comes around and puts them inside a
// match, if it can 
// Figure out some way to notify clients that they are in a game now, show them that it works.
// ♯ Where there's a whip, there's a way ♯
setInterval(function () {
    while (client_queue.length >= 2) {
	// Dequeueing them
	let p1 = client_queue.shift();
	let p2 = client_queue.shift();
	
	// Putting them inside a match
	client_names[p1].opponent = p2;
	client_names[p2].opponent = p1;
	client_names[p1].game = true;
	client_names[p2].game = true;

	// Telling them that a match is going on, and if that thing is possible,
	// then many other things are
	client_names[p1].socket.send(JSON.stringify({
	    type : Messages.MESSAGE,
	    message : `You are now in a game with ${p2}`
	}));
	client_names[p2].socket.send(JSON.stringify({
	    type : Messages.MESSAGE,
	    message : `You are now in a game with ${p1}`
	}));
	client_names[p1].socket.send(JSON.stringify({
	    type : Messages.GAME,
	    opponent : p2,
	}));
	client_names[p2].socket.send(JSON.stringify({
	    type : Messages.GAME,
	    opponent : p1,
	}));
	

	// Assign them a game
	const cgid = getNewGameId();
	client_names[p1].gameid = cgid;
	client_names[p2].gameid = cgid;
	client_games.set(cgid, new_matrix(p1, p2));

	// Tell them the game ID of their game, for no reason at all
	client_names[p1].socket.send(message(`You are in the game with ID #${cgid} as P1`));
	client_names[p2].socket.send(message(`You are in the game with ID #${cgid} as P2`));
    }
}, 1000);
