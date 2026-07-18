/* ==========================================================================
   KONTINENT ART BUSINESS — shared app logic
   Simple localStorage-backed data layer used by both system pages.
   ========================================================================== */

const STORE_PREFIX = "kab_";

const Store = {
  get(key, fallback){
    try{
      const raw = localStorage.getItem(STORE_PREFIX + key);
      return raw ? JSON.parse(raw) : (fallback || []);
    }catch(e){ return fallback || []; }
  },
  set(key, value){
    localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value));
    flashSaved();
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

function nameById(list, id){
  const found = list.find(i=>i.id===id);
  return found ? (found.name || found.fullName) : "—";
}
