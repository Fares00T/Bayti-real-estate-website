import axios, { AxiosError } from "axios";
import { createAxiosAdapter } from "../../../../server/runtime/client.js";

const apiRequest = axios.create({
  //baseURL: "http://localhost:8800/api",
  //baseURL: "https://pfe-1back.onrender.com/api",
  baseURL: `${import.meta.env.VITE_BACK_END_URL}`,
  withCredentials: true,
  // Demo build: answered by the API running in the browser
  adapter: createAxiosAdapter(AxiosError),
});

export default apiRequest;
