/* ==========================================================================
   KONTINENT ART BUSINESS — shared app logic
   Simple localStorage-backed data layer used by both system pages.
   ========================================================================== */

/* Ma'lumotlar endi Supabase'da (bulutda) saqlanadi — barcha qurilmalarda bir xil
   ko'rinadi va real vaqtda sinxronlanadi. Internet yo'q bo'lsa oxirgi ko'chirilgan
   nusxa brauzer keshidan (localStorage) ko'rsatiladi. */
const SUPABASE_URL = "https://nuykhzrzcaanrygnjede.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51eWtoenJ6Y2FhbnJ5Z25qZWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMDcwNDAsImV4cCI6MjA5OTU4MzA0MH0.0Vv3-QJKhCPBHcCM3dlQ-Dkrt3q-2blxOIglyBixxjY";
const STORE_PREFIX = "kab_";

const Store = {
  _cache: {},
  _client: null,
  _ready: false,

  client(){
    if(!this._client && window.supabase){
      this._client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return this._client;
  },

  /* Load everything from Supabase, fall back to last-known localStorage cache
     if offline, and subscribe to live changes from other devices. */
  async init(onRemoteChange){
    // Seed from local cache first so the UI isn't empty while we fetch.
    try{
      const raw = localStorage.getItem(STORE_PREFIX + "cache");
      if(raw) this._cache = JSON.parse(raw) || {};
    }catch(e){ /* ignore */ }

    const client = this.client();
    if(client){
      try{
        const { data, error } = await client.from("kab_data").select("key,value");
        if(!error && data){
          data.forEach(row => { this._cache[row.key] = row.value; });
          this._persistLocalCache();
        }
      }catch(e){ /* offline: keep local cache */ }

      try{
        client
          .channel("kab_data_changes")
          .on("postgres_changes", { event: "*", schema: "public", table: "kab_data" }, payload => {
            const row = payload.new || payload.old;
            if(!row) return;
            if(payload.eventType === "DELETE") delete this._cache[row.key];
            else this._cache[row.key] = row.value;
            this._persistLocalCache();
            if(typeof onRemoteChange === "function") onRemoteChange();
          })
          .subscribe();
      }catch(e){ /* realtime not critical */ }
    }
    this._ready = true;
  },

  _persistLocalCache(){
    try{ localStorage.setItem(STORE_PREFIX + "cache", JSON.stringify(this._cache)); }catch(e){}
  },

  get(key, fallback){
    if(Object.prototype.hasOwnProperty.call(this._cache, key)) return this._cache[key];
    return fallback !== undefined ? fallback : [];
  },

  set(key, value){
    this._cache[key] = value;
    this._persistLocalCache();
    flashSaved();
    const client = this.client();
    if(client){
      client.from("kab_data")
        .upsert({ key, value, updated_at: new Date().toISOString() })
        .then(({error}) => { if(error) console.error("Supabase saqlashda xato:", error); });
    }
  },
  add(key, item){
    const list = this.get(key, []);
    list.unshift(item);
    this.set(key, list);
    return list;
  },
  remove(key, id){
    const list = this.get(key, []).filter(i => i.id !== id);
    this.set(key, list);
    return list;
  }
};

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function flashSaved(){
  const pill = document.getElementById("savedPill");
  if(!pill) return;
  pill.classList.add("flash");
  clearTimeout(flashSaved._t);
  flashSaved._t = setTimeout(()=>pill.classList.remove("flash"), 600);
}

function fmtSum(n){
  n = Number(n)||0;
  return n.toLocaleString("ru-RU").replace(/,/g,' ');
}
function fmtDate(d){
  if(!d) return "—";
  const dt = new Date(d);
  if(isNaN(dt)) return d;
  return dt.toLocaleDateString("uz-UZ", {day:"2-digit",month:"2-digit",year:"numeric"});
}
function monthLabel(ym){
  if(!ym) return "—";
  const [y,m] = ym.split("-");
  const names = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
  return `${names[parseInt(m,10)-1]} ${y}`;
}
function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function todayISO(){ return new Date().toISOString().slice(0,10); }
function currentMonthKey(){ return new Date().toISOString().slice(0,7); }

/* ==========================================================================
   Navigation (rail tabs)
   ========================================================================== */
function initNav(){
  const buttons = document.querySelectorAll(".railnav button[data-target]");
  buttons.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      buttons.forEach(b=>b.classList.remove("active"));
      document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.target).classList.add("active");
      window.scrollTo({top:0, behavior:"smooth"});
    });
  });
}

/* ==========================================================================
   Generic select-populator
   ========================================================================== */
function fillSelect(selectEl, items, {value="id", label="name", placeholder="Tanlang", includeAll=false} = {}){
  if(!selectEl) return;
  const current = selectEl.value;
  selectEl.innerHTML = "";
  if(includeAll){
    const optAll = document.createElement("option");
    optAll.value = ""; optAll.textContent = "Barchasi";
    selectEl.appendChild(optAll);
  } else {
    const opt0 = document.createElement("option");
    opt0.value=""; opt0.textContent = placeholder; opt0.disabled = true; opt0.selected = true;
    selectEl.appendChild(opt0);
  }
  items.forEach(it=>{
    const opt = document.createElement("option");
    opt.value = it[value];
    opt.textContent = it[label];
    selectEl.appendChild(opt);
  });
  if([...selectEl.options].some(o=>o.value===current)) selectEl.value = current;
}

/* ==========================================================================
   Basic form hints: hire/start dates can't be in the future, phone numbers
   get a light format check. Doesn't block typing — just flags on blur/submit
   via the browser's native validity UI (title + pattern).
   ========================================================================== */
function applyFormHints(){
  const today = todayISO();
  document.querySelectorAll('input[type="date"][name="hireDate"], input[type="date"][name="startDate"]').forEach(el=>{
    el.max = today;
    el.title = "Sana bugungi kundan keyin bo'lishi mumkin emas";
  });
  document.querySelectorAll('input[name="phone"]').forEach(el=>{
    el.pattern = "^\\+?[0-9\\s-]{9,15}$";
    el.title = "Telefon raqamini to'g'ri formatda kiriting, masalan: +998 90 123 45 67";
  });
}

/* ==========================================================================
   Dark / light theme toggle. Preference is saved per-browser (not synced
   across devices — it's a display preference, not business data).
   ========================================================================== */
const THEME_KEY = "kab_theme";

(function applySavedTheme(){
  try{
    const saved = localStorage.getItem(THEME_KEY);
    if(saved === "dark") document.documentElement.setAttribute("data-theme", "dark");
  }catch(e){ /* ignore */ }
})();

function toggleTheme(){
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if(isDark){
    document.documentElement.removeAttribute("data-theme");
    try{ localStorage.setItem(THEME_KEY, "light"); }catch(e){}
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    try{ localStorage.setItem(THEME_KEY, "dark"); }catch(e){}
  }
  updateThemeButtonLabel();
}

function updateThemeButtonLabel(){
  const btn = document.getElementById("btnTheme");
  if(!btn) return;
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  btn.textContent = isDark ? "☀️ Yorug'" : "🌙 Tungi";
}

function nameById(list, id){
  const found = list.find(i=>i.id===id);
  return found ? (found.name || found.fullName) : "—";
}

/* ==========================================================================
   Full backup — downloads every stored key as one JSON file
   ========================================================================== */
function downloadFullBackup(){
  const payload = {
    exportedAt: new Date().toISOString(),
    data: Store._cache
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kab-zaxira-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ==========================================================================
   Generic sortable table headers.
   Pass the <table> element, a map of column-index -> field name (or a
   function that reads the sort value from a row object), and a render
   callback to call after changing sort state. Sort state is stored on the
   table element itself so multiple tables can reuse this independently.
   ========================================================================== */
function makeSortable(table, fieldMap, onSortChange){
  const headers = table.querySelectorAll("thead th");
  headers.forEach((th, idx)=>{
    if(!fieldMap[idx]) return;
    th.style.cursor = "pointer";
    th.dataset.sortIdx = idx;
    th.addEventListener("click", ()=>{
      const current = table.dataset.sortField;
      const field = fieldMap[idx];
      let dir = "asc";
      if(current === String(idx)){
        dir = table.dataset.sortDir === "asc" ? "desc" : "asc";
      }
      table.dataset.sortField = String(idx);
      table.dataset.sortDir = dir;
      onSortChange(field, dir);
    });
  });
}

function sortRows(rows, field, dir){
  const sorted = [...rows].sort((a,b)=>{
    let va = typeof field === "function" ? field(a) : a[field];
    let vb = typeof field === "function" ? field(b) : b[field];
    if(typeof va === "string") va = va.toLowerCase();
    if(typeof vb === "string") vb = vb.toLowerCase();
    if(va == null) va = "";
    if(vb == null) vb = "";
    if(va < vb) return dir === "asc" ? -1 : 1;
    if(va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
  return sorted;
}
