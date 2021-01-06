const api = require("./api.js");

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

const rankStatImage = (msg, discord, user, userData, matchPointsSummary) => {
  //post rank from database

  let embed = new discord.MessageEmbed()
    .setColor("#ff4656")
    .setTitle(userData.valorant_name)
    .setAuthor(user.username, user.displayAvatarURL())
    .setURL(
      "https://blitz.gg/valorant/profile/" +
        userData.valorant_name.replace("#", "-").replace(" ", "%20")
    )
    .setThumbnail(
      `https://valorant-sw.s3.amazonaws.com/ranks/${userData.valorant_rank}.png`
    )
    .addFields(
      {
        name: " Rank ",
        value: rankNames[`${userData.valorant_rank}`],
        inline: true
      },
      { name: " Points ", value: userData.valorant_points, inline: true },
      { name: " ELO ", value: userData.valorant_elo, inline: true }
    )
    .setTimestamp();
  if (matchPointsSummary != null) {
    embed.addFields({
      name: " Previous Match Results ",
      value: matchPointsSummary.join(", "),
      inline: false
    });
  }
  return msg.channel.send(embed);
};

const compMatches = (matches, limit) => {
  if (limit < 1) return "Cant show 0 matches";
  let str = "```";
  let i = 0;
  for (const match of matches) {
    if (match.CompetitiveMovement != "MOVEMENT_UNKNOWN") {
      var date = new Date(match.MatchStartTime).toLocaleString("en-US");
      str +=
        "\n\nGame " +
        (i + 1) +
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
    if (i == limit) break;
  }
  return str + "```";
};

const matchPointsSummary = matches => {
  let matchPoints = [];
  let i = 0;
  for (const match of matches) {
    if (match.CompetitiveMovement != "MOVEMENT_UNKNOWN") {
      matchPoints.push(
        match.TierProgressAfterUpdate - match.TierProgressBeforeUpdate
      );
      i++;
    }
    if (i == 3) break;
  }
  return matchPoints;
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
        "\n\n`-login yourusername yourpassword` to log in. Simply login again to view a different account. \n\n`-rank` will show your ranking stats. \n\n`-update` will update your rank stats \n\n`-last` will show your last competitive match \n\n`-matches` will show your competitive match history up to 5"
    );
  },
  rank: async function(msg, discord) {
    const user = await api.getUser(msg.author.id);
    if (user != null) {
      const matches = await api.getCompetitiveHistory(
        user.access_token,
        user.entitlements_token,
        user.valorant_id
      );
      if (matches != null) {
        rankStatImage(
          msg,
          discord,
          msg.author,
          user,
          matchPointsSummary(matches)
        );
      } else {
        msg.channel.send("Session id expired. Please login again.");
      }
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
        const matches = await api.getCompetitiveHistory(
          user.access_token,
          user.entitlements_token,
          user.valorant_id
        );
        if (matches != null) {
        } else {
          return msg.channel.send(
            "Something went wrong. Please try again later."
          );
        }
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
      if (matches == null) {
        return msg.channel.send("Session expired! Please login again.");
      } else {
        return msg.channel.send(compMatches(matches, 5));
      }
    } else {
      //must be logged in
      return msg.channel.send("Please log in to view your match history");
    }
  },
  last: async function(msg) {
    const user = await api.getUser(msg.author.id);
    if (user != null) {
      const matches = await api.getCompetitiveHistory(
        user.access_token,
        user.entitlements_token,
        user.valorant_id
      );
      if (matches == null) {
        return msg.channel.send("Session expired! Please login again.");
      } else {
        return msg.channel.send(compMatches(matches, 1));
      }
    } else {
      //must be logged in
      return msg.channel.send("Please log in to view your match history");
    }
  },
  show: async function(msg, discord) {
    const mentionedUser = msg.mentions.users;
    if (mentionedUser.size === 0) {
      return msg.channel.send("No mentioned user");
    }
    for (const user of mentionedUser) {
      //check if mentioned user exists in db
      const userData = await api.getUser(user[1].id);
      if (userData != null) {
        rankStatImage(msg, discord, user[1], userData);
      } else {
        msg.channel.send("No data found on user " + user[1].username);
      }
    }
  }
};
