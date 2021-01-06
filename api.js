const axios = require("axios").default;
const tough = require("tough-cookie");
const axiosCookieJarSupport = require("axios-cookiejar-support").default;

axiosCookieJarSupport(axios);

const getToken = async (username, password) => {
  const cookieJar = new tough.CookieJar();
  axios.defaults.jar = cookieJar;
  axios.defaults.withCredentials = true;

  const BASE_URL = "https://auth.riotgames.com/api/v1/authorization";

  const axiosInstance = axios.create({ BASE_URL });
  await axiosInstance
    .post(BASE_URL, {
      client_id: "play-valorant-web-prod",
      nonce: "1",
      redirect_uri: "https://playvalorant.com/opt_in",
      response_type: "token id_token"
    })
    .catch(err => {
      return err;
    });

  const response = await axiosInstance
    .put(BASE_URL, {
      type: "auth",
      username: username,
      password: password
    })
    .then(res => {
      if (res.data.error) return null;
      const url = res.data.response.parameters.uri;
      const token = url.match(
        /access_token=((?:[a-zA-Z]|\d|\.|-|_)*).*id_token=((?:[a-zA-Z]|\d|\.|-|_)*).*expires_in=(\d*)/
      );
      return token[1];
    })
    .catch(err => {
      console.log(err.response.data);
      return null;
    });

  return response;
};

const getEntitlementToken = async access_token => {
  let instance = axios.create({
    headers: {
      post: {
        Authorization: "Bearer " + access_token
      }
    }
  });
  const response = await instance
    .post("https://entitlements.auth.riotgames.com/api/token/v1", {})
    .then(res => {
      return res.data.entitlements_token;
    })
    .catch(err => {
      console.log(err.response.data);
      return null;
    });
  return response;
};

const registerUser = async (
  discord_id,
  access_token,
  entitlements_token,
  valorant_id,
  valorant_name,
  valorant_rank,
  valorant_points,
  valorant_elo
) => {
  const response = await axios
    .post(process.env.HOSTNAME_URL + "/users/register", {
      discord_id: discord_id,
      access_token: access_token,
      entitlements_token: entitlements_token,
      valorant_id: valorant_id,
      valorant_name: valorant_name,
      valorant_rank: valorant_rank,
      valorant_points: valorant_points,
      valorant_elo: valorant_elo
    })
    .then(res => {
      return true;
    })
    .catch(err => {
      return false;
    });
  return response;
};

const checkUserExist = async discord_id => {
  const response = await axios
    .get(process.env.HOSTNAME_URL + "/users/" + discord_id)
    .then(res => {
      //user exists
      return true;
    })
    .catch(err => {
      //user does not exists
      return false;
    });
  return response;
};

const updateUser = async (
  discord_id,
  access_token,
  entitlements_token,
  valorant_id,
  valorant_name,
  valorant_rank,
  valorant_points,
  valorant_elo
) => {
  const instance = await axios
    .patch(process.env.HOSTNAME_URL + "/users/" + discord_id, {
      access_token: access_token,
      entitlements_token: entitlements_token,
      valorant_id: valorant_id,
      valorant_name: valorant_name,
      valorant_rank: valorant_rank,
      valorant_points: valorant_points,
      valorant_elo: valorant_elo
    })
    .then(res => {
      return true;
    })
    .catch(err => {
      console.log(err);
      return false;
    });
  return instance;
};

const getValorantUserId = async (access_token, entitlements_token) => {
  let instance = axios.create({
    headers: {
      post: {
        Authorization: "Bearer " + access_token,
        "X-Riot-Entitlements-JWT": entitlements_token
      }
    }
  });
  const response = await instance
    .post("https://auth.riotgames.com/userinfo")
    .then(res => {
      return res.data.sub;
    })
    .catch(err => {
      console.log(err.response.data);
      return null;
    });
  return response;
};

const getValorantGameName = async (
  access_token,
  entitlements_token,
  valorant_id
) => {
  let instance = axios.create({
    headers: {
      post: {
        Authorization: "Bearer " + access_token,
        "X-Riot-Entitlements-JWT": entitlements_token
      }
    }
  });

  const response = await instance
    .put("https://pd.NA.a.pvp.net/name-service/v2/players", [valorant_id])
    .then(res => {
      return res.data[0].GameName + "#" + res.data[0].TagLine;
    })
    .catch(err => {
      console.log(err);
      return null;
    });
  return response;
};

const getCompetitiveHistory = async (
  access_token,
  entitlements_token,
  valorant_id
) => {
  const instance = axios.create({
    headers: {
      get: {
        Authorization: "Bearer " + access_token,
        "X-Riot-Entitlements-JWT": entitlements_token
      }
    }
  });

  const response = await instance
    .get(
      `https://pd.NA.a.pvp.net/mmr/v1/players/${valorant_id}/competitiveupdates?startIndex=0&endIndex=20`
    )
    .then(res => {
      return res.data.Matches;
    })
    .catch(err => {
      console.log(err.response);
      return null;
    });
  return response;
};

const getRankStats = async (access_token, entitlements_token, valorant_id) => {
  const matches = await getCompetitiveHistory(
    access_token,
    entitlements_token,
    valorant_id
  );
  let rank = 0;
  let points = 0;
  let elo = 0;

  for (i = 0; i < matches.length; i++) {
    if (matches[i].CompetitiveMovement != "MOVEMENT_UNKNOWN") {
      rank = matches[i].TierAfterUpdate;
      points = matches[i].TierProgressAfterUpdate;
      elo = rank * 100 - 300 + points;
      break;
    }
  }
  return {
    valorant_rank: rank,
    valorant_points: points,
    valorant_elo: elo
  };
};

const getUser = async discord_id => {
  const response = await axios
    .get(process.env.HOSTNAME_URL + "/users/" + discord_id)
    .then(res => {
      //user exists
      return res.data;
    })
    .catch(err => {
      //user does not exists
      return null;
    });
  return response;
};

module.exports = {
  getToken,
  registerUser,
  checkUserExist,
  getUser,
  getEntitlementToken,
  updateUser,
  getValorantUserId,
  getCompetitiveHistory,
  getRankStats,
  getValorantGameName
};
