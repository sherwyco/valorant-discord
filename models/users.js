const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  discord_id: {
    type: String,
    required: true,
    unique: true
  },
  access_token: {
    type: String,
    required: true
  },
  entitlements_token: {
    type: String,
    required: true
  },
  valorant_id: {
    type: String,
    required: true
  },
  valorant_rank: {
    type: Number,
    required: false
  },
  valorant_points: {
    type: Number,
    required: false
  },
  valorant_elo: {
    type: Number,
    require: false
  }
});

module.exports = mongoose.model("UserModel", userSchema);
