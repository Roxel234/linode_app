const express = require("express");
const app = express();
const path = require("path");
const port = process.env.PORT || 8080;
const { readFile } = require("fs");

app.use(express.static(path.join(__dirname,"public")));

app.listen(port,()=>console.log("Server started on port",port));