export const getApiUrl = () => {
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const envUrl = import.meta.env.VITE_API_URL;

  if (envUrl) {
    if (!isLocal && envUrl.includes("localhost")) {
      return "https://sandbox-11.onrender.com";
    }
    return envUrl;
  }

  return isLocal ? "http://localhost:5000" : "https://sandbox-11.onrender.com";
};
