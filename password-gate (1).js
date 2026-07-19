(function () {
  const PASSWORD = "Kontinent1981";
  const SESSION_KEY = "kab_access_ok";

  if (sessionStorage.getItem(SESSION_KEY) === "yes") return;

  document.documentElement.style.visibility = "hidden";

  window.addEventListener("DOMContentLoaded", () => {
    const overlay = document.createElement("div");
    overlay.style = "position:fixed;inset:0;background:#0f172a;display:flex;align-items:center;justify-content:center;z-index:99999;visibility:visible;";
    overlay.innerHTML = `
      <div style="background:#fff;padding:32px;border-radius:12px;text-align:center;font-family:sans-serif;min-width:280px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">
        <div style="font-weight:600;margin-bottom:16px;font-size:16px;">Kontinent Art Business</div>
        <input id="kab-pass" type="password" placeholder="Пароль" style="padding:10px;width:100%;box-sizing:border-box;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;font-size:14px;">
        <button id="kab-btn" style="width:100%;padding:10px;background:#0f172a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;">Войти</button>
        <div id="kab-err" style="color:#dc2626;font-size:13px;margin-top:8px;min-height:16px;"></div>
      </div>`;
    document.body.appendChild(overlay);
    document.documentElement.style.visibility = "visible";

    function tryLogin() {
      const val = document.getElementById("kab-pass").value;
      if (val === PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, "yes");
        overlay.remove();
      } else {
        document.getElementById("kab-err").textContent = "Неверный пароль";
      }
    }
    document.getElementById("kab-btn").addEventListener("click", tryLogin);
    document.getElementById("kab-pass").addEventListener("keydown", e => {
      if (e.key === "Enter") tryLogin();
    });
  });
})();
