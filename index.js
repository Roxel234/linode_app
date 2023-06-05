const express = require("express");
const app = express();
const path = require("path");
const port = process.env.PORT || 8080;
const { readFile } = require("fs");

app.use(express.static(path.join(__dirname,"public")));

app.get("/",(req,res)=>{
	res.sendFile(path.join(__dirname,"public","home.html"));
});

app.get("/play",(req,res)=>{
	res.sendFile(path.join(__dirname,"public","game.html"));
});

const server = app.listen(port,()=>console.log("Server started on port",port));

const socketIO = require("socket.io");

const io = socketIO(server);

const rooms = {};

const sockets = {};

function generateCards(){
	let types = ["-9","-8","-7","-6","-5","-4","-3","-2","0","2","3","4","5","6","7","8","9","d2","d2","ds","plus","minus"];
	let cards = [];

	for (var i = 0; i < types.length; i++) {
		cards.push(types[i]);
		cards.push(types[i]);
		cards.push(types[i]);
		cards.push(types[i]);
	}

	cards.push("1");
	cards.push("1");

	cards.push("-1");
	cards.push("-1");

	cards.sort(()=>Math.random()-0.5);

	return cards;
}

function createRoom(private){
	let genId = ()=> 1000 + Math.round(Math.random()*8999);
	let id = genId();

	while (rooms["room-"+id]) {
		id = genId();
	}

	rooms["room-"+id] = {
		players:[],
		private,
		playerCount:0,
		admin:undefined,
		started: false,
		playerCards: {},
		prepared: false,
		mazo: generateCards(),
		getCard(){
			let card = this.mazo.slice(0,1)[0];
			this.mazo.splice(0,1);
			return card;
		}
	};

	console.log("Created room",id,rooms["room-"+id]);

	return id;
}

function joinRoom(socket,room) {
	if (rooms["room-"+room]) {
		if (rooms["room-"+room].playerCount < 4) {
			if (rooms["room-"+room].playerCount == 0) {
				rooms["room-"+room].admin = socket.id;
			}
			rooms["room-"+room].players.push(socket.id);
			rooms["room-"+room].playerCount++;

			console.log("Socket",socket.id,"joined room",room);
			socket.emit("console-log","You joined room "+room);
			socket.gameRoom = room;
		} else {
			socket.emit("return-error","Room '"+room+"' is full");
		}
	} else {
		socket.emit("return-error","Sala inexistente '"+room+"'");
	}
}

function searchRoom(socket) {
	let roomKeys = Object.keys(rooms);

	let room2join = undefined;

	for (var i = 0; i < roomKeys.length; i++) {
		if (rooms[roomKeys[i]].players.length < 4 && !rooms[roomKeys[i]].private) {
			room2join = parseInt(roomKeys[i].substring(5),10);
			break;
		}
	}

	if (room2join == undefined) {
		room2join = createRoom(false);
	}

	joinRoom(socket,room2join);
	socket.emit("joined-game",{
		id:room2join
	});
}

io.on("connection",function(socket){
	console.log("New connection. ID:",socket.id);
	sockets[socket.id] = socket;

	socket.emit("console-log","Your id is '"+socket.id+"'");

	socket.on("search-game",()=>searchRoom(socket));

	socket.on("join-game",(id)=>{
		joinRoom(socket,id);
	});

	socket.on("create-room",()=>socket.emit("ready-join",createRoom(true)));

	socket.on("begin-game",()=>{
		if (socket.gameRoom) {
			if (rooms["room-"+socket.gameRoom].admin == socket.id && !rooms["room-"+socket.gameRoom].started && rooms["room-"+socket.gameRoom].players.length >= 2) {
				console.log("Begin game!");
				rooms["room-"+socket.gameRoom].started = true;
			}
		}
	});

	socket.on("disconnect",()=>{
		delete sockets[socket.id];
	});
});

function tickRoom(key){
	let giveCards = (rooms[key].started && !rooms[key].prepared);
	if (giveCards) {rooms[key].prepared = true;}

	let players = rooms[key].players;

	var socket;

	for (var i = 0; i < players.length; i++) {
		socket = sockets[players[i]];

		if (!socket) {
			console.log("Exited",players[i],"from the room",key);
			rooms[key].players.splice(i,1);
			rooms[key].playerCount--;
			i--;
			if (rooms[key].players.indexOf(rooms[key].admin) <= -1) {
				rooms[key].admin = rooms[key].players[0];
			}
			if (rooms[key].playerCount <= 0) {
				delete rooms[key];
				break;
			}
			continue;
		}
		let isAdmin = socket.id == rooms[key].admin ;

		if (giveCards) {
			let cards = [];
			for (let i = 0; i < 5; i++) {
				cards.push(rooms[key].getCard());
			}
			cards.push("x");
			cards.push("=");
			rooms[key].playerCards[socket.id] = cards;
		}

		let cards = rooms[key].playerCards[socket.id] || []; 

		socket.emit("room-update",{
			players:rooms[key].playerCount,
			admin:isAdmin,
			started: rooms[key].started,
			cards
		});
	}
}

setInterval(()=>{
	let roomKeys = Object.keys(rooms);

	for (var i = 0; i < roomKeys.length; i++) {
		tickRoom(roomKeys[i]);
	}
},50/3);