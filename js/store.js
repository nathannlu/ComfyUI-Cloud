
const LOCAL_STORAGE_KEY = "comfy_cloud_store"

export function getData() {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);

  if (!data) {
    return {
      apiKey: "",
    };
  }

  return {
    ...JSON.parse(data),
  };
}

export function setData(data) {
  localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify(data),
  );
}
