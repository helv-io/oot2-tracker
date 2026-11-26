// Applies the saved theme before first paint (no flash). Loaded as a
// tiny blocking script so the CSP can stay at script-src 'self'.
try {
  var t = JSON.parse(localStorage.getItem("oot-100-checklist:prefs:v1") || "{}").theme;
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
} catch (e) {}
