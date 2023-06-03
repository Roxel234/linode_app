const express = require("express");
const app = express();
const port = 80;
const { readFile } = require("fs");

app.get("/",function(req,res){
	readFile("./index.html","utf-8",(err,html)=>{
		if (err) {
			res.send("Service unavailable");
		} else {
			res.send(html);
		}
	});
});

app.listen(port,()=>console.log("Server started on port",port));