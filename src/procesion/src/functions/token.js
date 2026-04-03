const TOKEN_KEY = "muni_token";
const TOKEN_TIME_KEY = "muni_token_time";

const CLIENT_ID = "9K1a16g5ScdOrpk1";
const CLIENT_SECRET = "ae058a408cd6490d8842745ef7aa1b89";

const TOKEN_URL = "https://sg.muniguate.com/portal/sharing/rest/oauth2/token/";

const obtenerTokenNuevo = async () => {
  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("client_secret", CLIENT_SECRET);
  params.append("grant_type", "client_credentials");
  params.append("f", "json");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    body: params
  });

  const data = await res.json();

  sessionStorage.setItem(TOKEN_KEY, data.access_token);
  sessionStorage.setItem(TOKEN_TIME_KEY, Date.now());

  return data.access_token;
};

// 🔥 FUNCIÓN PRINCIPAL
export const obtenerToken = async () => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const time = sessionStorage.getItem(TOKEN_TIME_KEY);

  if (token && time) {
    const diff = (Date.now() - parseInt(time)) / 1000;

    if (diff < 7000) {
      return token;
    }
  }

  return await obtenerTokenNuevo();
};