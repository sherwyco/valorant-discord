const express = require("express");
const app = express();
const mongoose = require("mongoose");
const discord = require("./discord.js"); //load discord bot
let cors = require("cors");

mongoose.set("useCreateIndex", true); //remove warning

mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;

db.on("error", error => console.error(error));
db.once("open", () => {
  //db.dropDatabase();
  console.log("connected to database");
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

const userRoute = require("./routes/users");
app.use("/users", userRoute);

app.listen(process.env.PORT || 3000, () => console.log("server started"));
