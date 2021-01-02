const api = require("./api.js"); //load discord bot

const rankNames = {
  "0": "Unrated",
  "1": "Unknown 1",
  "2": "Unknown 2",
  "3": "Iron 1",
  "4": "Iron 2",
  "5": "Iron 3",
  "6": "Bronze 1",
  "7": "Bronze 2",
  "8": "Bronze 3",
  "9": "Silver 1",
  "10": "Silver 2",
  "11": "Silver 3",
  "12": "Gold 1",
  "13": "Gold 2",
  "14": "Gold 3",
  "15": "Platinum 1",
  "16": "Platinum 2",
  "17": "Platinum 3",
  "18": "Diamond 1",
  "19": "Diamond 2",
  "20": "Diamond 3",
  "21": "Immortal 1",
  "22": "Immortal 2",
  "23": "Immortal 3",
  "24": "Radiant"
};

const rankStatImage = (msg, discord, user) => {
  //post rank from database
  let embed = new discord.MessageEmbed()
    .setColor("#ff4656")
    .setTitle(user.valorant_name)
    .setAuthor(msg.author.username, msg.author.displayAvatarURL())
    .setThumbnail(
      `https://valorant-sw.s3.amazonaws.com/ranks/${user.valorant_rank}.png`
    )
    .addFields(
      {
        name: "Rank",
        value: rankNames[`${user.valorant_rank}`],
        inline: true
      },
      { name: "Points", value: user.valorant_points, inline: true },
      { name: "ELO", value: user.valorant_elo, inline: true }
    )
    .setTimestamp();
  return msg.channel.send(embed);
};

module.exports = {
  login: async function(msg) {
    if (msg.channel.type !== "dm") return;

    const credentials = msg.content.substring(7).split(" ");
    if (credentials.length < 2 || credentials.length > 2)
      return msg.author.send(
        "Invalid command! Please type `-login username password`"
      );

    const discord_user = msg.author.username + "#" + msg.author.discriminator;

    //get access and entitlement token
    const access_token = await api.getToken(credentials[0], credentials[1]);
    if (access_token == null)
      return msg.author.send("Invalid username or password!");
    const entitlements_token = await api.getEntitlementToken(access_token);
    if (entitlements_token == null)
      return msg.author.send("Encoutered error. Please try again");

    const valorant_id = await api.getValorantUserId(
      access_token,
      entitlements_token
    );
    if (valorant_id == null)
      return msg.author.send("id not found. Please try again");

    //get fresh stats
    const stats = await api.getRankStats(
      access_token,
      entitlements_token,
      valorant_id
    );

    const valorant_name = await api.getValorantGameName(
      access_token,
      entitlements_token,
      valorant_id
    );

    //check if user already exists
    const userExists = await api.checkUserExist(msg.author.id);
    if (userExists) {
      //update access_token and entitlements_token
      const update = await api.updateUser(
        msg.author.id,
        access_token,
        entitlements_token,
        valorant_id,
        valorant_name,
        stats.valorant_rank,
        stats.valorant_points,
        stats.valorant_elo
      );
      if (update) msg.author.send("Success!");
      console.log(discord_user + " successfully updated user info");
    } else {
      //register user along with access and entitlement token
      const register = await api.registerUser(
        msg.author.id,
        access_token,
        entitlements_token,
        valorant_id,
        valorant_name,
        stats.valorant_rank,
        stats.valorant_points,
        stats.valorant_elo
      );
      if (register) msg.author.send("Success!");
      console.log(discord_user + " successfully logged in");
    }
  },
  help: function(msg) {
    msg.author.send(
      "You need to login first to be able to use the commands below." +
        "\n\n`-login yourusername yourpassword` to log in. Simply login again to view a different account. \n\n`-rank` will show your ranking stats. \n\n`-update` will update your rank stats \n\n`-matches` will show your competitive match history"
    );
  },
  rank: async function(msg, discord) {
    const user = await api.getUser(msg.author.id);
    if (user != null) {
      rankStatImage(msg, discord, user);
    } else {
      return msg.channel.send("Please log in to get your rank");
    }
  },

  update: async function(msg, discord) {
    //update the user using tokens stored, if tokens are not valid anymore, tell user to log in again to get new tokens
    const user = await api.getUser(msg.author.id);
    if (user != null) {
      const newStats = await api.getRankStats(
        user.access_token,
        user.entitlements_token,
        user.valorant_id
      );
      const update = await api.updateUser(
        msg.author.id,
        user.access_token,
        user.entitlements_token,
        user.valorant_id,
        user.valorant_name,
        newStats.valorant_rank,
        newStats.valorant_points,
        newStats.valorant_elo
      );
      if (update) {
        //succeed, paste new rank stat embed
        msg.channel.send("Successfully updated!");
        rankStatImage(msg, discord, user);
      } else {
        //failed, tell user to relog
        msg.author.send("Session expired. Please log in again");
      }
    }
  },
  matches: async function(msg) {
    const user = await api.getUser(msg.author.id);
    if (user != null) {
      const matches = await api.getCompetitiveHistory(
        user.access_token,
        user.entitlements_token,
        user.valorant_id
      );

      let str = "```";
      let i = 1;
      for (const match of matches) {
        if (match.CompetitiveMovement != "MOVEMENT_UNKNOWN") {
          var date = new Date(match.MatchStartTime).toLocaleString("en-US");
          str +=
            "\n\nGame " +
            i +
            "\nMap: " +
            match.MapID.substring(match.MapID.lastIndexOf("/") + 1) +
            "\nDate: " +
            date +
            "\nPoints Before: " +
            match.TierProgressBeforeUpdate +
            "\nPoints After: " +
            match.TierProgressAfterUpdate +
            "\nDifference: " +
            (match.TierProgressAfterUpdate - match.TierProgressBeforeUpdate);
          i++;
        }
      }
      if (i == 1) {
        return msg.channel.send("No Competitive Match History.");
      }
      return msg.channel.send(str + "```");
    } else {
      return msg.channel.send("Please log in to view your match history");
    }
  }
};
