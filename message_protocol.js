// Description of the message subsystem that has been developed
// For the purposes of this 
// Every message that I send will be through JSON. 
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
});

    
