export const KEY_ACCESS_TOKEN = "accessToken";
export const KEY_REFRESH_TOKEN = "refreshToken";

export const setToken = (accessToken, refreshToken) => {
  console.log("DEBUG [localStorageService]: Setting tokens...", { accessToken: !!accessToken, refreshToken: !!refreshToken });
  localStorage.setItem(KEY_ACCESS_TOKEN, accessToken);
  if (refreshToken) {
    localStorage.setItem(KEY_REFRESH_TOKEN, refreshToken);
  }
};

export const getAccessToken = () => {
  const token = localStorage.getItem(KEY_ACCESS_TOKEN);
  // console.log("DEBUG [localStorageService]: Getting Access Token...", !!token);
  return token;
};

export const getRefreshToken = () => {
  const token = localStorage.getItem(KEY_REFRESH_TOKEN);
  console.log("DEBUG [localStorageService]: Getting Refresh Token...", !!token);
  return token;
};

export const removeToken = () => {
  console.log("DEBUG [localStorageService]: Removing tokens...");
  localStorage.removeItem(KEY_ACCESS_TOKEN);
  localStorage.removeItem(KEY_REFRESH_TOKEN);
};
