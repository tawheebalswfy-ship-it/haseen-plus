export function isScreenshotMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("screenshot") === "1" || window.localStorage.getItem("AICG_SCREENSHOT_AUTH") === "1";
  } catch {
    return false;
  }
}
