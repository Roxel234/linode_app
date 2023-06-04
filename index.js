const express = require("express");
const app = express();
const path = require("path");
const port = process.env.PORT || 8080;
const { readFile } = require("fs");

app.use(express.static(path.join(__dirname,"public")));

const server = app.listen(port,()=>console.log("Server started on port",port));

const socketIO = require("socket.io");

const io = socketIO(server);

const rooms = {};

function createRoom(private){
	let id = 1000 + Math.round(Math.random()*8999);

	rooms["room-"+id] = {
		canJoin:true,
		players:[],
		private
	};

	console.log("Created room",id,rooms["room-"+id]);

	return id;
}

function joinRoom(socket,room) {
	rooms["room-"+room].players.push(socket.id);

	console.log("Socket",socket.id,"joined room",room);
	socket.emit("console-log","You joined room "+room);
}

function searchRoom(socket) {
	let roomKeys = Object.keys(rooms);

	let room2join = undefined;

	for (var i = 0; i < roomKeys.length; i++) {
		if (rooms[roomKeys[i]].players.length < 4) {
			room2join = parseInt(roomKeys[i].substring(5),10);
			break;
		}
	}

	if (room2join == undefined) {
		room2join = createRoom(false);
	}

	joinRoom(socket,room2join);
}

io.on("connection",function(socket){
	console.log("New connection. ID:",socket.id);

	searchRoom(socket);

	socket.emit("console-log","Your id is '"+socket.id+"'");
});