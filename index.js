const express = require("express");
const app = express();
const path = require("path");
const port = process.env.PORT || 8080;
const { readFile } = require("fs");

app.use(express.static(path.join(__dirname,"public")));

const server = app.listen(port,()=>console.log("Server started on port",port));

const socketIO = require("socket.io");

const io = socketIO(server);

io.on("connection",function(socket){
	console.log("New connection. ID:",socket.id);

	socket.emit("console-log","Your id is '"+socket.id+"'");
});