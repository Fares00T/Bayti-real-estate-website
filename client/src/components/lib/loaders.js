import { defer } from "react-router-dom";
import apiRequest from "./apiRequest";

export const singlePageLoader = async ({ request, params }) => {
  // ?preview=<token> lets the admin dashboard show an unpublished listing
  const preview = new URL(request.url).searchParams.get("preview");
  const res = await apiRequest("/posts/" + params.id, { params: preview ? { preview } : undefined });
  return res.data;
};
export const listPageLoader = async ({ request }) => {
  try {
    const query = request.url.split("?")[1] || "";

    const postPromise = apiRequest("/posts?" + query);

    return defer({
      postResponse: postPromise,
    });
  } catch (error) {
    console.error("Loader Error:", error);
    throw new Response("Failed to load data", { status: 500 });
  }
};
export const profilePageLoader = async () => {
  const postPromise = apiRequest("/users/profilePosts");
  const chatPromise = apiRequest("/chats");
  return defer({
    postResponse: postPromise,
    chatResponse: chatPromise,
  });
};
