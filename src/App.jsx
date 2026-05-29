import { useState, useEffect } from "react";

// ── IndexedDB storage ─────────────────────────────────────────────────────────
const DB_NAME = "gutdiary", DB_STORE = "entries", DB_VERSION = 1;
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: "ts" });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}
async function loadDB() {
  try {
    const db = await openDB();
    return new Promise((res, rej) => {
      const req = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  } catch { return []; }
}
async function saveDB(entries) {
  try {
    const db = await openDB();
    const tx = db.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);
    store.clear();
    entries.forEach(e => store.put(e));
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  } catch (err) { console.error("DB save error", err); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const now = () => new Date().toISOString();
const fmtDate = iso => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtTime = iso => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
// datetime-local input requires "YYYY-MM-DDTHH:MM"
const toInputVal = () => { const d = new Date(); d.setSeconds(0,0); const offset = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - offset).toISOString().slice(0,16); };
const inputToISO = val => val ? new Date(val).toISOString() : now();

// ── Constants ─────────────────────────────────────────────────────────────────
const BRISTOL = [
  { n: 1, label: "Separate hard lumps", emoji: "🪨", color: "#8B6F47" },
  { n: 2, label: "Lumpy sausage",        emoji: "🌰", color: "#A0785A" },
  { n: 3, label: "Cracked sausage",      emoji: "🟤", color: "#C49A6C" },
  { n: 4, label: "Smooth sausage",       emoji: "✅", color: "#6BAF92" },
  { n: 5, label: "Soft blobs",           emoji: "🫧", color: "#F4A261" },
  { n: 6, label: "Fluffy pieces",        emoji: "💧", color: "#E76F51" },
  { n: 7, label: "Watery",              emoji: "🌊", color: "#E63946" },
];
const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"];
const DRINK_TYPES = [
  { id: "water",   label: "Water",      emoji: "💧", color: "#5B9BD5" },
  { id: "coffee",  label: "Coffee",     emoji: "☕", color: "#6F4E37" },
  { id: "tea",     label: "Tea",        emoji: "🍵", color: "#7BAF6B" },
  { id: "alcohol", label: "Alcohol",    emoji: "🍷", color: "#9B2335" },
  { id: "soda",    label: "Soda",       emoji: "🥤", color: "#F4A261" },
  { id: "juice",   label: "Juice",      emoji: "🍊", color: "#E76F30" },
  { id: "dairy",   label: "Milk/Dairy", emoji: "🥛", color: "#C8B8A2" },
  { id: "smoothie",label: "Smoothie",   emoji: "🫐", color: "#8B6BAF" },
  { id: "other",   label: "Other",      emoji: "🫗", color: "#9A9A9A" },
];
const DRINK_MODIFIERS = ["With milk","With cream","Decaf","Carbonated","With ice","With sugar","Plant-based milk","Caffeinated"];
const SIZES = ["Small","Medium","Large","Extra Large"];
const BODY_LOCATIONS = [
  { id: "upper", label: "Upper abdomen", emoji: "⬆️" },
  { id: "lower", label: "Lower abdomen", emoji: "⬇️" },
  { id: "full",  label: "Full abdomen",  emoji: "🔄" },
  { id: "left",  label: "Left side",     emoji: "◀️" },
  { id: "right", label: "Right side",    emoji: "▶️" },
  { id: "back",  label: "Back",          emoji: "🔙" },
  { id: "chest", label: "Chest",         emoji: "💛" },
];
const ONSET_TYPES = ["Sudden","Gradual","After eating","After drinking","Woke me up","Stress-related"];
const DISCOMFORT_SYMPTOMS = ["Bloating","Cramping","Nausea","Gas","Pressure","Stabbing pain","Dull ache","Fatigue","Heartburn","Urgency"];
const TABS = [
  { id: "log",     label: "Log",     icon: "✏️" },
  { id: "history", label: "History", icon: "📋" },
  { id: "insights",label: "Insights",icon: "📊" },
];

// ── Exports ───────────────────────────────────────────────────────────────────
function exportCSV(entries) {
  const rows = [["Date","Time","Type","Subtype","Detail","Quantity","Modifiers","Symptom Category","Bristol Scale","Body Location","Onset","Pain (1-10)","Symptoms","Notes"]];
  const sorted = [...entries].sort((a, b) => new Date(a.ts) - new Date(b.ts));
  sorted.forEach(e => rows.push([
    fmtDate(e.ts), fmtTime(e.ts), e.type,
    e.mealType || e.drinkType || "",
    (e.foods || e.drinkName || "").replace(/,/g,";"),
    e.size || "",
    (e.modifiers || []).join(";"),
    e.symptomCategory || "",
    e.bristol || "",
    (e.locations || []).join(";"),
    e.onset || "",
    e.pain || "",
    (e.symptoms || []).join(";"),
    (e.notes || "").replace(/,/g,";"),
  ]));
  const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `gut-diary-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}
function exportJSON(entries) {
  const sorted = [...entries].sort((a, b) => new Date(a.ts) - new Date(b.ts));
  const backup = { version: 1, exportedAt: new Date().toISOString(), entries: sorted };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  a.download = `gutdiary-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}
function importJSON(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      const entries = Array.isArray(parsed) ? parsed : parsed.entries;
      if (!Array.isArray(entries)) throw new Error("Invalid format");
      const valid = entries.filter(e => e.ts && e.type);
      if (!valid.length) throw new Error("No valid entries found");
      onSuccess(valid);
    } catch (err) { onError(err.message); }
  };
  reader.onerror = () => onError("Could not read file");
  reader.readAsText(file);
}

// ── Shared components ─────────────────────────────────────────────────────────
function PainSlider({ value, onChange }) {
  const color = value <= 3 ? "#6BAF92" : value <= 6 ? "#F4A261" : "#E63946";
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 14, color: "#3D2C2C", fontWeight: 600 }}>Pain / Discomfort</span>
        <span style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, color }}>{value || "—"}</span>
      </div>
      <input type="range" min={0} max={10} step={1} value={value || 0}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color, cursor: "pointer" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#B09090", marginTop: 2 }}>
        <span>No pain</span><span>Unbearable</span>
      </div>
    </div>
  );
}

// ── Date / Time picker ────────────────────────────────────────────────────────
function DateTimeField({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, background: "#FBF6F0", borderRadius: 10, padding: "8px 12px" }}>
      <span style={{ fontSize: 15 }}>🕐</span>
      <input
        type="datetime-local"
        value={value}
        max={toInputVal()}
        onChange={e => onChange(e.target.value)}
        style={{ border: "none", background: "transparent", fontSize: 13, color: "#3D2C2C", fontFamily: "inherit", outline: "none", flex: 1, cursor: "pointer" }}
      />
    </div>
  );
}

// ── Forms ─────────────────────────────────────────────────────────────────────
function FoodForm({ onSave }) {
  const [mealType, setMealType] = useState("Breakfast");
  const [foods, setFoods] = useState("");
  const [notes, setNotes] = useState("");
  const [entryDt, setEntryDt] = useState(toInputVal);
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    if (!foods.trim()) return;
    onSave({ type: "food", ts: inputToISO(entryDt), mealType, foods, notes });
    setFoods(""); setNotes(""); setEntryDt(toInputVal());
    setSaved(true); setTimeout(() => setSaved(false), 1800);
  };
  return (
    <div style={S.card}>
      <div style={S.cardHeader}><span style={{ fontSize: 24 }}>🍽️</span><span style={S.cardTitle}>Log a Meal</span></div>
      <DateTimeField value={entryDt} onChange={setEntryDt} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {MEALS.map(m => <button key={m} onClick={() => setMealType(m)} style={{ ...S.pill, ...(mealType === m ? S.pillActive : {}) }}>{m}</button>)}
      </div>
      <textarea placeholder="What did you eat? Be as detailed as you like…" value={foods} onChange={e => setFoods(e.target.value)} style={S.textarea} rows={3} />
      <textarea placeholder="Notes? (mood, stress, where you ate…)" value={notes} onChange={e => setNotes(e.target.value)} style={{ ...S.textarea, marginBottom: 16 }} rows={2} />
      <button onClick={handleSave} style={{ ...S.saveBtn, ...(saved ? S.savedBtn : {}) }}>{saved ? "✓ Saved!" : "Save Meal"}</button>
    </div>
  );
}

function BeverageForm({ onSave }) {
  const [drinkType, setDrinkType] = useState(null);
  const [drinkName, setDrinkName] = useState("");
  const [size, setSize] = useState("Medium");
  const [modifiers, setModifiers] = useState([]);
  const [notes, setNotes] = useState("");
  const [entryDt, setEntryDt] = useState(toInputVal);
  const [saved, setSaved] = useState(false);
  const toggleMod = m => setModifiers(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m]);
  const selected = DRINK_TYPES.find(d => d.id === drinkType);
  const handleSave = () => {
    if (!drinkType) return;
    onSave({ type: "beverage", ts: inputToISO(entryDt), drinkType, drinkName: drinkName || selected?.label, size, modifiers, notes });
    setDrinkType(null); setDrinkName(""); setSize("Medium"); setModifiers([]); setNotes(""); setEntryDt(toInputVal());
    setSaved(true); setTimeout(() => setSaved(false), 1800);
  };
  return (
    <div style={S.card}>
      <div style={S.cardHeader}><span style={{ fontSize: 24 }}>🥤</span><span style={S.cardTitle}>Log a Beverage</span></div>
      <DateTimeField value={entryDt} onChange={setEntryDt} />
      <div style={S.sectionLabel}>What are you drinking?</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {DRINK_TYPES.map(d => (
          <button key={d.id} onClick={() => setDrinkType(d.id)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            padding: "10px 6px", borderRadius: 12, cursor: "pointer",
            border: `2px solid ${drinkType === d.id ? d.color : "#EDE0D4"}`,
            background: drinkType === d.id ? d.color + "18" : "#FDFAF7",
          }}>
            <span style={{ fontSize: 22 }}>{d.emoji}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: drinkType === d.id ? d.color : "#7A6060", textAlign: "center", lineHeight: 1.2 }}>{d.label}</span>
          </button>
        ))}
      </div>
      {drinkType && (<>
        <textarea placeholder={`e.g. "oat milk latte", "red wine", "Diet Coke"…`} value={drinkName} onChange={e => setDrinkName(e.target.value)} style={S.textarea} rows={2} />
        <div style={{ marginBottom: 16 }}>
          <div style={S.sectionLabel}>Size</div>
          <div style={{ display: "flex", gap: 8 }}>
            {SIZES.map(s => <button key={s} onClick={() => setSize(s)} style={{ ...S.pill, flex: 1, textAlign: "center", fontSize: 11, padding: "6px 4px", ...(size === s ? S.pillActive : {}) }}>{s}</button>)}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={S.sectionLabel}>Modifiers</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {DRINK_MODIFIERS.map(m => <button key={m} onClick={() => toggleMod(m)} style={{ ...S.pill, fontSize: 11, ...(modifiers.includes(m) ? { background: "#5B9BD520", borderColor: "#5B9BD5", color: "#5B9BD5" } : {}) }}>{m}</button>)}
          </div>
        </div>
        <textarea placeholder="Notes…" value={notes} onChange={e => setNotes(e.target.value)} style={{ ...S.textarea, marginBottom: 16 }} rows={2} />
      </>)}
      <button onClick={handleSave} disabled={!drinkType} style={{ ...S.saveBtn, ...(saved ? S.savedBtn : {}), opacity: drinkType ? 1 : 0.4 }}>
        {saved ? "✓ Saved!" : "Save Beverage"}
      </button>
    </div>
  );
}

function SymptomForm({ onSave }) {
  const [category, setCategory] = useState("discomfort");
  const [bristol, setBristol] = useState(null);
  const [locations, setLocations] = useState([]);
  const [onset, setOnset] = useState(null);
  const [pain, setPain] = useState(0);
  const [symptoms, setSymptoms] = useState([]);
  const [notes, setNotes] = useState("");
  const [entryDt, setEntryDt] = useState(toInputVal);
  const [saved, setSaved] = useState(false);
  const toggleSym = s => setSymptoms(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleLoc = l => setLocations(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l]);
  const reset = () => { setBristol(null); setLocations([]); setOnset(null); setPain(0); setSymptoms([]); setNotes(""); setEntryDt(toInputVal()); };
  const handleSave = () => {
    onSave({ type: "symptom", ts: inputToISO(entryDt), symptomCategory: category, bristol, locations, onset, pain, symptoms, notes });
    reset(); setSaved(true); setTimeout(() => setSaved(false), 1800);
  };
  return (
    <div style={S.card}>
      <div style={S.cardHeader}><span style={{ fontSize: 24 }}>🌿</span><span style={S.cardTitle}>Log Symptoms</span></div>
      <DateTimeField value={entryDt} onChange={setEntryDt} />
      <div style={{ display: "flex", background: "#FBF6F0", borderRadius: 12, padding: 3, marginBottom: 18, gap: 2 }}>
        {[["discomfort","😣","Discomfort / Pain"],["bm","🚽","Bowel Movement"]].map(([id, emoji, label]) => (
          <button key={id} onClick={() => { setCategory(id); reset(); }} style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            padding: "9px 6px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
            background: category === id ? "#3D2C2C" : "none",
            color: category === id ? "#FBF6F0" : "#9A7A7A",
          }}><span>{emoji}</span><span>{label}</span></button>
        ))}
      </div>
      {category === "discomfort" && (<>
        <div style={S.sectionLabel}>Where is the discomfort?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {BODY_LOCATIONS.map(l => (
            <button key={l.id} onClick={() => toggleLoc(l.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, cursor: "pointer",
              border: `2px solid ${locations.includes(l.id) ? "#8B6BAF" : "#EDE0D4"}`,
              background: locations.includes(l.id) ? "#8B6BAF18" : "#FDFAF7",
            }}>
              <span style={{ fontSize: 16 }}>{l.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: locations.includes(l.id) ? "#6B4BAF" : "#3D2C2C" }}>{l.label}</span>
              {locations.includes(l.id) && <span style={{ marginLeft: "auto", color: "#8B6BAF", fontSize: 16 }}>✓</span>}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={S.sectionLabel}>How did it come on?</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ONSET_TYPES.map(o => <button key={o} onClick={() => setOnset(onset === o ? null : o)} style={{ ...S.pill, fontSize: 12, ...(onset === o ? { background: "#8B6BAF18", borderColor: "#8B6BAF", color: "#6B4BAF" } : {}) }}>{o}</button>)}
          </div>
        </div>
      </>)}
      {category === "bm" && (<>
        <div style={S.sectionLabel}>Bristol Stool Scale</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
          {BRISTOL.map(b => (
            <button key={b.n} onClick={() => setBristol(b.n)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, cursor: "pointer",
              border: `2px solid ${bristol === b.n ? b.color : "#EDE0D4"}`,
              background: bristol === b.n ? b.color + "22" : "#FDFAF7",
            }}>
              <span style={{ fontSize: 20 }}>{b.emoji}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#3D2C2C" }}>Type {b.n}</div>
                <div style={{ fontSize: 12, color: "#9A7A7A" }}>{b.label}</div>
              </div>
              {bristol === b.n && <span style={{ marginLeft: "auto", color: b.color, fontSize: 18 }}>✓</span>}
            </button>
          ))}
        </div>
      </>)}
      <PainSlider value={pain} onChange={setPain} />
      <div style={{ marginBottom: 16 }}>
        <div style={S.sectionLabel}>Symptoms</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {DISCOMFORT_SYMPTOMS.map(s => <button key={s} onClick={() => toggleSym(s)} style={{ ...S.pill, fontSize: 12, ...(symptoms.includes(s) ? S.pillSym : {}) }}>{s}</button>)}
        </div>
      </div>
      <textarea placeholder="Notes… (e.g. 'started 20 mins after dinner', 'worse when lying down')" value={notes} onChange={e => setNotes(e.target.value)} style={{ ...S.textarea, marginBottom: 16 }} rows={2} />
      <button onClick={handleSave} style={{ ...S.saveBtn, ...(saved ? S.savedBtn : {}) }}>{saved ? "✓ Saved!" : "Save Entry"}</button>
    </div>
  );
}

function LogTab({ onSave }) {
  const [mode, setMode] = useState("food");
  return (
    <div>
      <div style={{ display: "flex", background: "#FFF", borderRadius: 14, padding: 4, marginBottom: 16, boxShadow: "0 2px 8px rgba(61,44,44,0.06)", gap: 2 }}>
        {[["food","🍽️","Meal"],["beverage","🥤","Drink"],["symptom","🌿","Symptoms"]].map(([id, emoji, label]) => (
          <button key={id} onClick={() => setMode(id)} style={{
            flex: 1, padding: "9px 4px", borderRadius: 10, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            background: mode === id ? "#3D2C2C" : "none",
            color: mode === id ? "#FBF6F0" : "#9A7A7A",
          }}><span>{emoji}</span><span>{label}</span></button>
        ))}
      </div>
      {mode === "food" && <FoodForm onSave={onSave} />}
      {mode === "beverage" && <BeverageForm onSave={onSave} />}
      {mode === "symptom" && <SymptomForm onSave={onSave} />}
    </div>
  );
}

// ── Entry helpers ─────────────────────────────────────────────────────────────
const entryIcon = e => {
  if (e.type === "food") return "🍽️";
  if (e.type === "symptom") return "🌿";
  return DRINK_TYPES.find(d => d.id === e.drinkType)?.emoji || "🥤";
};
const entryBorder = e => {
  if (e.type === "food") return "#C49A6C";
  if (e.type === "symptom") return "#6BAF92";
  return DRINK_TYPES.find(d => d.id === e.drinkType)?.color || "#5B9BD5";
};
const entryLabel = e => {
  if (e.type === "food") return e.mealType;
  if (e.type === "symptom") return e.symptomCategory === "bm" ? "Bowel Movement" : "Discomfort / Pain";
  return e.drinkName || DRINK_TYPES.find(d => d.id === e.drinkType)?.label || "Drink";
};

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab({ entries, onDelete, onExport, onBackup, onRestore }) {
  const [importMsg, setImportMsg] = useState(null);
  const handleFile = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg(null);
    importJSON(file,
      imported => { onRestore(imported); setImportMsg({ ok: true, text: `✓ Restored ${imported.length} entries` }); },
      err => setImportMsg({ ok: false, text: `⚠️ ${err}` })
    );
    e.target.value = "";
  };
  const sorted = [...entries].sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const groups = {};
  sorted.forEach(e => { const d = fmtDate(e.ts); if (!groups[d]) groups[d] = []; groups[d].push(e); });

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={onExport} style={{ flex: 1, padding: "11px 6px", borderRadius: 12, border: "1.5px solid #C49A6C", background: "transparent", color: "#C49A6C", fontFamily: "Georgia,serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⬇️ CSV</button>
        <button onClick={onBackup} style={{ flex: 1, padding: "11px 6px", borderRadius: 12, border: "1.5px solid #6BAF92", background: "transparent", color: "#6BAF92", fontFamily: "Georgia,serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>💾 JSON</button>
        <button onClick={() => { const i = document.createElement("input"); i.type="file"; i.accept=".json"; i.onchange=handleFile; i.click(); }} style={{ flex: 1, padding: "11px 6px", borderRadius: 12, border: "1.5px solid #8B6BAF", background: "transparent", color: "#8B6BAF", fontFamily: "Georgia,serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⬆️ Restore</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["For AI analysis","#C49A6C"],["JSON backup","#6BAF92"],["From backup","#8B6BAF"]].map(([label, color]) => (
          <div key={label} style={{ flex: 1, textAlign: "center", fontSize: 10, color, opacity: 0.7 }}>{label}</div>
        ))}
      </div>
      {importMsg && (
        <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 13, fontWeight: 600,
          background: importMsg.ok ? "#6BAF9220" : "#E6394620",
          color: importMsg.ok ? "#4a9a78" : "#E63946",
          border: `1px solid ${importMsg.ok ? "#6BAF9260" : "#E6394640"}` }}>
          {importMsg.text}
        </div>
      )}
      {!sorted.length ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#B09090" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📓</div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 18 }}>No entries yet</div>
          <div style={{ fontSize: 14, marginTop: 6 }}>Start logging from the Log tab</div>
        </div>
      ) : Object.entries(groups).map(([date, items]) => (
        <div key={date} style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 700, color: "#3D2C2C", marginBottom: 8, paddingLeft: 4 }}>{date}</div>
          {items.map(e => (
            <div key={e.ts} style={{ background: "#FFF", borderRadius: 14, padding: 14, marginBottom: 8, borderLeft: `3px solid ${entryBorder(e)}`, boxShadow: "0 1px 6px rgba(61,44,44,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span>{entryIcon(e)}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#3D2C2C" }}>{entryLabel(e)}</span>
                    <span style={{ fontSize: 12, color: "#B09090" }}>{fmtTime(e.ts)}</span>
                  </div>
                  {e.foods && <div style={{ fontSize: 13, color: "#5C3D3D" }}>{e.foods}</div>}
                  {e.drinkName && <div style={{ fontSize: 13, color: "#5C3D3D" }}>{e.drinkName}{e.size ? ` · ${e.size}` : ""}</div>}
                  {e.modifiers?.length > 0 && <div style={{ fontSize: 12, color: "#9A7A7A" }}>{e.modifiers.join(", ")}</div>}
                  {e.bristol && <div style={{ fontSize: 13, color: "#5C3D3D" }}>{BRISTOL.find(b => b.n === e.bristol)?.emoji} Bristol Type {e.bristol}</div>}
                  {e.locations?.length > 0 && <div style={{ fontSize: 13, color: "#5C3D3D" }}>📍 {e.locations.map(l => BODY_LOCATIONS.find(b => b.id === l)?.label).join(", ")}</div>}
                  {e.onset && <div style={{ fontSize: 12, color: "#9A7A7A" }}>Onset: {e.onset}</div>}
                  {e.pain > 0 && <div style={{ fontSize: 13, color: "#5C3D3D" }}>Pain: {e.pain}/10</div>}
                  {e.symptoms?.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                      {e.symptoms.map(s => <span key={s} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 10, background: "#F4A26118", color: "#C47A30", fontWeight: 600 }}>{s}</span>)}
                    </div>
                  )}
                  {e.notes && <div style={{ fontSize: 12, color: "#9A7A7A", fontStyle: "italic", marginTop: 4 }}>{e.notes}</div>}
                </div>
                <button onClick={() => onDelete(e.ts)} style={{ border: "none", background: "none", color: "#D4B0A0", fontSize: 16, cursor: "pointer", padding: "0 4px", alignSelf: "flex-start" }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Insights helpers ──────────────────────────────────────────────────────────
const FOOD_STOP = new Set(["with","the","and","some","bit","side","fresh","fried","grilled","baked","steamed","large","small","medium","cup","bowl","plate","glass","slice","pieces","two","three","one","half","whole","from","have","were","that","this","after","also","just"]);

function getPreSymptomWindow(entries, windowHours = 4, minPain = 4) {
  const bad = entries.filter(e => e.type === "symptom" && (e.pain || 0) >= minPain);
  if (!bad.length) return null;
  const drinkCounts = {}, foodWords = {};
  bad.forEach(sym => {
    const symTime = new Date(sym.ts).getTime();
    const winStart = symTime - windowHours * 3600000;
    entries.forEach(e => {
      const t = new Date(e.ts).getTime();
      if (t < winStart || t >= symTime) return;
      if (e.type === "beverage") drinkCounts[e.drinkType] = (drinkCounts[e.drinkType] || 0) + 1;
      if (e.type === "food" && e.foods) {
        e.foods.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).forEach(w => {
          if (w.length >= 4 && !FOOD_STOP.has(w)) foodWords[w] = (foodWords[w] || 0) + 1;
        });
      }
    });
  });
  return {
    drinks: Object.entries(drinkCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    foods: Object.entries(foodWords).sort((a, b) => b[1] - a[1]).slice(0, 10),
    total: bad.length,
  };
}

// ── Bristol line graph ────────────────────────────────────────────────────────
function BristolLineGraph({ entries }) {
  const bms = entries
    .filter(e => e.type === "symptom" && e.bristol)
    .sort((a, b) => new Date(a.ts) - new Date(b.ts))
    .slice(-14);
  if (bms.length < 2) return (
    <div style={{ textAlign: "center", padding: "16px 0 4px", color: "#B09090", fontSize: 13 }}>
      Log at least 2 bowel movements to see the trend
    </div>
  );
  const W = 320, H = 148;
  const pL = 20, pR = 8, pT = 8, pB = 30;
  const cW = W - pL - pR, cH = H - pT - pB;
  // y: type 1 at bottom, type 7 at top
  const fy = b => pT + cH - ((b - 1) / 6) * cH;
  const fx = i => pL + (bms.length > 1 ? (i / (bms.length - 1)) * cW : cW / 2);
  const pts = bms.map((e, i) => ({ x: fx(i), y: fy(e.bristol), b: e.bristol, label: fmtDate(e.ts) }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const dotColor = b => b >= 3 && b <= 4 ? "#6BAF92" : b >= 2 && b <= 5 ? "#F4A261" : "#E63946";
  // Healthy zone: types 3–4
  const yTop = fy(4), yBot = fy(3);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {/* Healthy zone fill */}
      <rect x={pL} y={yTop} width={cW} height={yBot - yTop} fill="#6BAF9222" />
      {/* Healthy zone boundary lines */}
      <line x1={pL} y1={yTop} x2={pL + cW} y2={yTop} stroke="#6BAF92" strokeWidth="1.2" strokeDasharray="5,4" opacity="0.8" />
      <line x1={pL} y1={yBot} x2={pL + cW} y2={yBot} stroke="#6BAF92" strokeWidth="1.2" strokeDasharray="5,4" opacity="0.8" />
      {/* "Healthy" label */}
      <text x={pL + cW - 2} y={yTop - 3} textAnchor="end" fontSize="8" fill="#6BAF92" opacity="0.9" fontWeight="700">ideal range</text>
      {/* Y axis labels */}
      {[1,2,3,4,5,6,7].map(b => (
        <text key={b} x={pL - 4} y={fy(b) + 3.5} textAnchor="end" fontSize="8.5"
          fill={b >= 3 && b <= 4 ? "#6BAF92" : "#C0A0A0"} fontWeight={b >= 3 && b <= 4 ? "700" : "400"}>{b}</text>
      ))}
      {/* Connecting line */}
      <polyline points={polyline} fill="none" stroke="#C49A6C" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots + date labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill={dotColor(p.b)} stroke="#FFF" strokeWidth="1.5" />
          {(bms.length <= 7 || i % 2 === 0) && (
            <text x={p.x} y={H - 8} textAnchor="middle" fontSize="8" fill="#B09090">{p.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ── Pain calendar ─────────────────────────────────────────────────────────────
function PainCalendar({ entries }) {
  const [view, setView] = useState("month");

  // day key -> max pain
  const dayPain = {};
  entries.filter(e => e.type === "symptom" && e.pain > 0).forEach(e => {
    const k = new Date(e.ts).toDateString();
    dayPain[k] = Math.max(dayPain[k] || 0, e.pain);
  });

  const cellStyle = (d) => {
    if (!d) return {};
    const p = dayPain[d.toDateString()];
    if (!p) return { bg: "#F5EDE4", text: "#C0A8A0", border: "transparent" };
    if (p >= 7) return { bg: "#E6394622", text: "#E63946", border: "#E6394660" };
    if (p >= 4) return { bg: "#F4A26122", text: "#C47A30", border: "#F4A26160" };
    return { bg: "#6BAF9222", text: "#4a9a78", border: "#6BAF9260" };
  };

  const today = new Date();
  const DOW = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  const Toggle = () => (
    <div style={{ display: "flex", background: "#F5EDE4", borderRadius: 10, padding: 3, marginBottom: 14, gap: 2 }}>
      {["week","month"].map(v => (
        <button key={v} onClick={() => setView(v)} style={{
          flex: 1, padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer",
          fontSize: 12, fontWeight: 700, fontFamily: "inherit",
          background: view === v ? "#3D2C2C" : "none",
          color: view === v ? "#FBF6F0" : "#9A7A7A",
        }}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
      ))}
    </div>
  );

  const Legend = () => (
    <div style={{ display: "flex", gap: 12, marginTop: 12, justifyContent: "center" }}>
      {[["#6BAF92","1–3"],["#F4A261","4–6"],["#E63946","7–10"],["#F5EDE4","none"]].map(([c, l]) => (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: c + "40", border: `1.5px solid ${c}` }} />
          <span style={{ fontSize: 10, color: "#9A7A7A" }}>{l}</span>
        </div>
      ))}
    </div>
  );

  if (view === "week") {
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d; });
    return (
      <div>
        <Toggle />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {days.map((d, i) => {
            const cs = cellStyle(d);
            const pain = dayPain[d.toDateString()];
            const isToday = d.toDateString() === today.toDateString();
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                background: cs.bg, border: `1.5px solid ${isToday ? "#3D2C2C" : cs.border}`,
                borderRadius: 10, padding: "8px 2px" }}>
                <span style={{ fontSize: 9, color: "#9A7A7A", fontWeight: 600 }}>{DOW[d.getDay()]}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: isToday ? "#3D2C2C" : cs.text }}>{d.getDate()}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: cs.text, minHeight: 14 }}>{pain || ""}</span>
              </div>
            );
          })}
        </div>
        <Legend />
      </div>
    );
  }

  // Month view
  const year = today.getFullYear(), month = today.getMonth();
  const monthName = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <Toggle />
      <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "#3D2C2C", marginBottom: 10, fontFamily: "Georgia,serif" }}>{monthName}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {DOW.map(d => <div key={d} style={{ textAlign: "center", fontSize: 9, color: "#B09090", fontWeight: 700, padding: "2px 0" }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const cs = cellStyle(d);
          const pain = dayPain[d.toDateString()];
          const isToday = d.toDateString() === today.toDateString();
          return (
            <div key={i} style={{ aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", borderRadius: 7, background: cs.bg,
              border: `1.5px solid ${isToday ? "#3D2C2C" : cs.border}`, gap: 1 }}>
              <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? "#3D2C2C" : cs.text }}>{d.getDate()}</span>
              {pain && <span style={{ fontSize: 8, fontWeight: 700, color: cs.text, lineHeight: 1 }}>{pain}</span>}
            </div>
          );
        })}
      </div>
      <Legend />
    </div>
  );
}

// ── Insights Tab ──────────────────────────────────────────────────────────────
function InsightsTab({ entries }) {
  const sE = entries.filter(e => e.type === "symptom");
  const fE = entries.filter(e => e.type === "food");
  const bE = entries.filter(e => e.type === "beverage");
  if (entries.length < 5) return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: "#B09090" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
      <div style={{ fontFamily: "Georgia,serif", fontSize: 18 }}>Log more entries</div>
      <div style={{ fontSize: 14, marginTop: 6 }}>Insights appear after a few days of tracking</div>
    </div>
  );
  const avgPain = sE.length ? (sE.reduce((a, e) => a + (e.pain || 0), 0) / sE.length).toFixed(1) : "—";
  const symCount = {};
  sE.forEach(e => (e.symptoms || []).forEach(s => { symCount[s] = (symCount[s] || 0) + 1; }));
  const topSym = Object.entries(symCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const day = sE.filter(e => fmtDate(e.ts) === fmtDate(d.toISOString()));
    const pain = day.length ? day.reduce((a, x) => a + (x.pain || 0), 0) / day.length : null;
    last7.push({ label, pain });
  }
  const preWindow = getPreSymptomWindow(entries);
  const hasBMs = sE.some(e => e.bristol);
  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[[fE.length,"Meals logged"],[bE.length,"Drinks logged"],[sE.length,"Symptom logs"],[avgPain,"Avg pain score"]].map(([n, l], i) => (
          <div key={i} style={{ background: "#FFF", borderRadius: 16, padding: "16px 12px", textAlign: "center", boxShadow: "0 1px 8px rgba(61,44,44,0.06)" }}>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 32, fontWeight: 900, color: "#3D2C2C", lineHeight: 1 }}>{n}</div>
            <div style={{ fontSize: 11, color: "#9A7A7A", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Pain this week */}
      {last7.some(d => d.pain !== null) && (
        <div style={{ background: "#FFF", borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: "0 1px 8px rgba(61,44,44,0.06)" }}>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 700, color: "#3D2C2C", marginBottom: 12 }}>📈 Pain this week</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90 }}>
            {last7.map((d, i) => {
              const h = d.pain !== null ? Math.max((d.pain / 10) * 72, 4) : 4;
              const c = d.pain > 6 ? "#E63946" : d.pain > 3 ? "#F4A261" : "#6BAF92";
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  {d.pain !== null && <div style={{ fontSize: 10, color: "#9A7A7A" }}>{Number(d.pain).toFixed(0)}</div>}
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                    <div style={{ width: "100%", height: h, background: d.pain !== null ? c : "#EDE0D4", borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#9A7A7A" }}>{d.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pain calendar */}
      <div style={{ background: "#FFF", borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: "0 1px 8px rgba(61,44,44,0.06)" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 700, color: "#3D2C2C", marginBottom: 4 }}>📅 Pain days</div>
        <div style={{ fontSize: 11, color: "#B09090", marginBottom: 12 }}>Days with symptom entries, colored by max pain</div>
        <PainCalendar entries={entries} />
      </div>

      {/* Bristol line graph */}
      {hasBMs && (
        <div style={{ background: "#FFF", borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: "0 1px 8px rgba(61,44,44,0.06)" }}>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 700, color: "#3D2C2C", marginBottom: 2 }}>💩 Stool type trend</div>
          <div style={{ fontSize: 11, color: "#B09090", marginBottom: 10 }}>Green zone = ideal range (types 3–4)</div>
          <BristolLineGraph entries={entries} />
        </div>
      )}

      {/* Pre-symptom window */}
      {preWindow && (preWindow.drinks.length > 0 || preWindow.foods.length > 0) && (
        <div style={{ background: "#FFF", borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: "0 1px 8px rgba(61,44,44,0.06)" }}>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 700, color: "#3D2C2C", marginBottom: 4 }}>⏱ Before bad symptoms</div>
          <div style={{ fontSize: 11, color: "#B09090", marginBottom: 12 }}>Most common in the 4 hrs before pain ≥ 4 ({preWindow.total} events)</div>
          {preWindow.drinks.length > 0 && (<>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9A7A7A", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Drinks</div>
            {preWindow.drinks.map(([id, count]) => {
              const dt = DRINK_TYPES.find(d => d.id === id);
              return (
                <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #F5EDE4" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span>{dt?.emoji || "🥤"}</span><span style={{ fontSize: 13, color: "#3D2C2C" }}>{dt?.label || id}</span></div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#C49A6C" }}>{count}×</span>
                </div>
              );
            })}
          </>)}
          {preWindow.foods.length > 0 && (
            <div style={{ marginTop: preWindow.drinks.length ? 14 : 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9A7A7A", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Food keywords</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {preWindow.foods.map(([word, count]) => (
                  <span key={word} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: "#F4A26118", color: "#C47A30", fontWeight: 600 }}>{word} {count > 1 ? `×${count}` : ""}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {topSym.length > 0 && (
        <div style={{ background: "#FFF", borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: "0 1px 8px rgba(61,44,44,0.06)" }}>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 700, color: "#3D2C2C", marginBottom: 12 }}>⚡ Most frequent symptoms</div>
          {topSym.map(([s, c]) => (
            <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #F5EDE4" }}>
              <span style={{ fontSize: 14, color: "#3D2C2C" }}>{s}</span>
              <span style={{ fontFamily: "Georgia,serif", fontWeight: 700, color: "#C49A6C", fontSize: 16 }}>{c}×</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Help Modal ────────────────────────────────────────────────────────────────
function HelpModal({ onClose }) {
  const sections = [
    { emoji: "✏️", title: "Logging daily", items: [
      "Log every meal, drink, and symptom as close to when it happens as possible — timing is key to spotting patterns.",
      "For meals, describe ingredients specifically. \"Pasta with cream sauce\" is more useful than just \"pasta\".",
      "For drinks, always pick modifiers like \"with milk\" or \"caffeinated\" — these are common triggers.",
      "Log discomfort even without a bowel movement. Use 😣 Discomfort, tap where it hurts, and how it came on.",
      "For bowel movements, use 🚽 Bowel Movement and pick the Bristol type that matches.",
    ]},
    { emoji: "📊", title: "Insights tab", items: [
      "Check this after a week or two. It shows your pain trend, most frequent symptoms, and top drinks.",
      "Look for patterns — do bad days follow certain foods or drinks the night before?",
    ]},
    { emoji: "⬇️", title: "Exporting your data", items: [
      "CSV is for AI analysis. Tap ⬇️ CSV — the file saves to your iPhone's Files app under Downloads.",
      "JSON is your backup. Tap 💾 JSON to save a full copy. Keep it safe in iCloud Drive.",
      "To restore after a new phone: tap ⬆️ Restore, find your JSON file in Files, and all entries come back.",
    ]},
    { emoji: "🤖", title: "Using AI to find patterns", items: [
      "Open Safari or the Claude app and start a new chat.",
      "Tap the paperclip icon and upload your CSV from the Files app.",
      "Ask: \"Look at my food and symptom logs. What foods or drinks seem to cause my worst days?\"",
      "The more weeks of data you have, the better the patterns will be.",
    ]},
  ];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,18,10,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ background: "#FBF6F0", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 430, margin: "0 auto", padding: "24px 20px 40px", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "#EDE0D4", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ fontFamily: "Georgia,serif", fontSize: 20, fontWeight: 700, color: "#3D2C2C", marginBottom: 4 }}>How to use gutdiary</div>
        <div style={{ fontSize: 12, color: "#9A7A7A", marginBottom: 24 }}>A simple guide to getting the most out of it</div>
        {sections.map(section => (
          <div key={section.title} style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>{section.emoji}</span>
              <span style={{ fontFamily: "Georgia,serif", fontSize: 15, fontWeight: 700, color: "#3D2C2C" }}>{section.title}</span>
            </div>
            {section.items.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: "#C49A6C", marginTop: 6, flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: "#5C3D3D", lineHeight: 1.5 }}>{item}</div>
              </div>
            ))}
          </div>
        ))}
        <button onClick={onClose} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "#3D2C2C", color: "#FBF6F0", fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>Got it</button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [entries, setEntries] = useState([]);
  const [tab, setTab] = useState("log");
  const [showHelp, setShowHelp] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => { loadDB().then(data => { setEntries(data); setReady(true); }); }, []);

  const addEntry = e => { const next = [...entries, e]; setEntries(next); saveDB(next); };
  const deleteEntry = ts => { const next = entries.filter(e => e.ts !== ts); setEntries(next); saveDB(next); };
  const restoreEntries = imported => {
    const merged = [...entries, ...imported].reduce((acc, e) => {
      if (!acc.find(x => x.ts === e.ts)) acc.push(e);
      return acc;
    }, []);
    setEntries(merged); saveDB(merged);
  };

  if (!ready) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#FBF6F0" }}>
      <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 900, color: "#3D2C2C" }}>gut<span style={{ color: "#C49A6C" }}>diary</span></div>
    </div>
  );

  return (
    <div style={S.root}>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 26, fontWeight: 900, color: "#FBF6F0", letterSpacing: -0.5 }}>gut<span style={{ color: "#C49A6C" }}>diary</span></div>
            <div style={{ fontSize: 11, color: "#C49A6C88", letterSpacing: 1, textTransform: "uppercase" }}>your gut companion</div>
          </div>
          <button onClick={() => setShowHelp(true)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 20, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚙️</button>
        </div>
      </div>
      <div style={S.content}>
        {tab === "log"      && <LogTab onSave={addEntry} />}
        {tab === "history"  && <HistoryTab entries={entries} onDelete={deleteEntry} onExport={() => exportCSV(entries)} onBackup={() => exportJSON(entries)} onRestore={restoreEntries} />}
        {tab === "insights" && <InsightsTab entries={entries} />}
      </div>
      <div style={S.nav}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 24px", border: "none", background: "none", cursor: "pointer", color: tab === t.id ? "#3D2C2C" : "#B09090", transition: "color 0.2s" }}>
            <span style={{ fontSize: 22 }}>{t.icon}</span>
            <span style={{ fontSize: 11, fontWeight: tab === t.id ? 700 : 400 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  root:         { fontFamily: "-apple-system,sans-serif", background: "#FBF6F0", height: "100%", maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", overflow: "hidden" },
  header:       { background: "linear-gradient(135deg,#3D2C2C 0%,#5C3D3D 100%)", padding: "calc(env(safe-area-inset-top) + 14px) 20px 14px", flexShrink: 0 },
  content:      { flex: 1, overflowY: "auto", padding: "16px 16px calc(env(safe-area-inset-bottom) + 80px)" },
  nav:          { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#FBF6F0", borderTop: "1px solid #EDE0D4", display: "flex", justifyContent: "space-around", padding: "6px 0 calc(env(safe-area-inset-bottom) + 8px)", zIndex: 100 },
  card:         { background: "#FFF", borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: "0 2px 16px rgba(61,44,44,0.07)" },
  cardHeader:   { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 },
  cardTitle:    { fontFamily: "Georgia,serif", fontSize: 20, fontWeight: 700, color: "#3D2C2C" },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: "#9A7A7A", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  textarea:     { width: "100%", border: "1.5px solid #EDE0D4", borderRadius: 12, padding: "10px 12px", fontSize: 15, color: "#3D2C2C", background: "#FDFAF7", resize: "none", outline: "none", boxSizing: "border-box", marginBottom: 14, fontFamily: "inherit" },
  pill:         { padding: "6px 14px", borderRadius: 20, border: "1.5px solid #EDE0D4", background: "#FDFAF7", fontSize: 13, cursor: "pointer", color: "#5C3D3D", fontFamily: "inherit" },
  pillActive:   { background: "#3D2C2C", color: "#FBF6F0", borderColor: "#3D2C2C" },
  pillSym:      { background: "#E76F5115", borderColor: "#E76F51", color: "#E76F51" },
  saveBtn:      { width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "#3D2C2C", color: "#FBF6F0", fontFamily: "Georgia,serif", fontSize: 17, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" },
  savedBtn:     { background: "#6BAF92" },
};
