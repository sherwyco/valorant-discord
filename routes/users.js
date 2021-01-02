const express = require("express");
const router = express.Router();
const UserModel = require("../models/users");

//middleware
async function getUser(req, res, next) {
  try {
    user = await UserModel.findOne({ discord_id: req.params.discord_id });
    if (user == null) {
      return res.status(404).json({ message: "Cant find user" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
  res.user = user;
  next();
}

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await UserModel.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get one user
router.get("/:discord_id", getUser, (req, res) => {
  res.json(res.user);
});

// Create one user
router.post("/register", async (req, res) => {
  const user = new UserModel({
    discord_id: req.body.discord_id,
    access_token: req.body.access_token,
    entitlements_token: req.body.entitlements_token,
    valorant_id: req.body.valorant_id,
    valorant_rank: req.body.valorant_rank,
    valorant_points: req.body.valorant_points,
    valorant_elo: req.body.valorant_elo
  });

  try {
    const newUser = await user.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// Update one user
router.patch("/:discord_id", getUser, async (req, res) => {
  if (req.body.access_token != null) {
    res.user.access_token = req.body.access_token;
  }
  if (req.body.entitlements_token != null) {
    res.user.entitlements_token = req.body.entitlements_token;
  }
  if (req.body.valorant_id != null) {
    res.user.valorant_id = req.body.valorant_id;
  }
  if (req.body.valorant_rank != null) {
    res.user.valorant_rank = req.body.valorant_rank;
  }
  if (req.body.valorant_points != null) {
    res.user.valorant_points = req.body.valorant_points;
  }
  if (req.body.valorant_elo != null) {
    res.user.valorant_elo = req.body.valorant_elo;
  }
  try {
    const user = await res.user.save();
    res.json(user);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// Delete one user
// router.delete("/:id", (req, res) => {});

// //login
// router.post("/:discord_id/login", getUser, async (req, res) => {
//   try {
//     var user = res.user;
//
//     user.compareUsername(req.body.valorant_username, (err, match) => {
//       if (!match) {
//         return res.status(400).send({ message: "err" });
//       }
//     });
//
//     user.comparePassword(req.body.valorant_password, (err, match) => {
//       if (!match) {
//         return res.status(400).send({ message: err });
//       }
//     });
//
//     res.send({
//       message: "The username and password combination is correct!"
//     });
//   } catch (error) {
//     res.status(500).send(error);
//   }
// });

module.exports = router;
