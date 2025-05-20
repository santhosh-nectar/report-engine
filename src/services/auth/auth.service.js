import axios from "axios";
import { AMERICANA_ENPOINTS } from "../endpoints/americnana-endpoints.js";

const credentials = {
  userName: "support@americana",
  password: "Tech@Sup@2025",
};

let cachedToken = null;
let tokenExpiresAt = null;

async function loginAndGetToken() {
  if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const response = await axios.post(AMERICANA_ENPOINTS.LOGIN_API, credentials);

  if (response.status !== 200) {
    console.error("Failed to login:", response.status, response.data);
    throw new Error("Login failed");
  }

  // Adjust according to your response fields:
  cachedToken = response.data.accessToken;
  const expiresInSeconds = parseInt(response.data.expireIn, 10) || 3600;

  // Set expiration time, subtract 1 min (60000 ms) for safety before expiry
  tokenExpiresAt = Date.now() + expiresInSeconds * 1000 - 60000;

  return cachedToken;
}

export async function getAuthHeaders() {
  const token = await loginAndGetToken();
  if (!token) {
    throw new Error("Failed to retrieve token");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}
