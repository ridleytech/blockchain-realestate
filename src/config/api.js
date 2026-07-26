export const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;

  const backend = (process.env.REACT_APP_BACKEND || "node").toLowerCase();
  if (backend === "go" || backend === "golang") return "http://localhost:4001";
  return "http://localhost:4000";
};

export const API_BASE_URL = getApiBaseUrl();
