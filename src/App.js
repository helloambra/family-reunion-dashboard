import { useState, useMemo, useEffect, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "./supabase";

const COLORS = {
  red: "#b01f24", blue: "#4071b6", yellow: "#ffbd59",
  green: "#b9d661", black: "#21211f", cream: "#fffde6",
  creamDark: "#f5efcc", border: "#ddd8b0", muted: "#6b6655",
};

const BASE_ADULT = 2000;
const BASE_CHILD = 2000;
const EVENT_DATE = new Date("2026-06-19T00:00:00");

function fmtDate(d) {
  const [, m, day] = d.split("-");
  return `${parseInt(m)}/${parseInt(day)}`;
}

function getDaysToEvent() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((EVENT_DATE - today) / 86400000);
}

function Stat({ label, value, color, sub, topColor }) {
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: topColor || COLORS.red }} />
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: COLORS.muted, marginBottom: 6, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || COLORS.black, lineHeight: 1 }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function Badge({ children, color, bg }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: bg || "#e8f5cc", color: color || "#4a6b10" }}>
      {children}
    </span>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted }}>{label}</label>
      <input {...props} style={{ height: 36, padding: "0 10px", fontSize: 14, borderRadius: 8, border: `1.5px solid ${COLORS.border}`, background: COLORS.cream, color: COLORS.black, outline: "none", width: props.width || 130 }} />
    </div>
  );
}

export default function App() {
  const [rsvpEntries, setRsvpEntries] = useState([]);
  const [paidEntries, setPaidEntries] = useState([]);
  const [activeTab, setActiveTab] = useState("rsvp");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [rDate, setRDate] = useState(new Date().toISOString().split("T")[0]);
  const [rAdult, setRAdult] = useState("");
  const [rChild, setRChild] = useState("");

  const [pDate, setPDate] = useState(new Date().toISOString().split("T")[0]);
  const [pBundle, setPBundle] = useState("");
  const [pPass, setPPass] = useState("");
  const [pSiptale, setPSiptale] = useState("");
  const [pDessert, setPDessert] = useState("");
  const [pFood, setPFood] = useState("");
  const [pWing, setPWing] = useState("");

  const daysTo = getDaysToEvent();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: rsvp }, { data: paid }] = await Promise.all([
      supabase.from("rsvp_entries").select("*").order("date", { ascending: true }),
      supabase.from("paid_entries").select("*").order("date", { ascending: true }),
    ]);
    if (rsvp) setRsvpEntries(rsvp);
    if (paid) setPaidEntries(paid);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const rsvpDaily = useMemo(() => {
    return rsvpEntries.map((e, i) => {
      const adult = BASE_ADULT - e.adult_out;
      const child = BASE_CHILD - e.child_out;
      const total = adult + child;
      const prevAdult = i === 0 ? 0 : BASE_ADULT - rsvpEntries[i - 1].adult_out;
      const prevChild = i === 0 ? 0 : BASE_CHILD - rsvpEntries[i - 1].child_out;
      const dailyAdult = Math.max(0, adult - prevAdult);
      const dailyChild = Math.max(0, child - prevChild);
      return { date: fmtDate(e.date), rawDate: e.date, adult, child, total, dailyAdult, dailyChild, dailyNew: dailyAdult + dailyChild };
    });
  }, [rsvpEntries]);

  const paidDaily = useMemo(() => {
    let cumBundle = 0, cumPass = 0, cumSiptale = 0, cumDessert = 0, cumFood = 0, cumWing = 0;
    return paidEntries.map((e) => {
      cumBundle += e.bundle; cumPass += e.pass; cumSiptale += e.siptale;
      cumDessert += e.dessert; cumFood += e.food; cumWing += e.wing;
      const dailyNew = e.bundle + e.pass + e.siptale + e.dessert + e.food + e.wing;
      const total = cumBundle + cumPass + cumSiptale + cumDessert + cumFood + cumWing;
      return {
        date: fmtDate(e.date), rawDate: e.date,
        bundle: cumBundle, pass: cumPass, siptale: cumSiptale,
        dessert: cumDessert, food: cumFood, wing: cumWing,
        dailyNew, total,
      };
    });
  }, [paidEntries]);

  const latestRsvp = rsvpDaily[rsvpDaily.length - 1];
  const latestPaid = paidDaily[paidDaily.length - 1];

  function showMsg(text) { setMsg(text); setTimeout(() => setMsg(""), 3000); }

  async function addRsvp() {
    if (!rDate || !rAdult || !rChild) { alert("Fill in all fields."); return; }
    setSaving(true);
    const { error } = await supabase.from("rsvp_entries").upsert({
      date: rDate, adult_out: parseInt(rAdult), child_out: parseInt(rChild)
    }, { onConflict: "date" });
    if (error) { alert("Error saving: " + error.message); }
    else { setRAdult(""); setRChild(""); showMsg(`RSVP entry for ${fmtDate(rDate)} saved.`); await loadData(); }
    setSaving(false);
  }

  async function addPaid() {
    if (!pDate) { alert("Fill in the date."); return; }
    setSaving(true);
    const { error } = await supabase.from("paid_entries").upsert({
      date: pDate,
      bundle: parseInt(pBundle) || 0, pass: parseInt(pPass) || 0,
      siptale: parseInt(pSiptale) || 0, dessert: parseInt(pDessert) || 0,
      food: parseInt(pFood) || 0, wing: parseInt(pWing) || 0,
    }, { onConflict: "date" });
    if (error) { alert("Error saving: " + error.message); }
    else { setPBundle(""); setPPass(""); setPSiptale(""); setPDessert(""); setPFood(""); setPWing(""); showMsg(`Add-on entry for ${fmtDate(pDate)} saved.`); await loadData(); }
    setSaving(false);
  }

  async function removeRsvp(date) {
    await supabase.from("rsvp_entries").delete().eq("date", date);
    await loadData();
  }

  async function removePaid(date) {
    await supabase.from("paid_entries").delete().eq("date", date);
    await loadData();
  }

  const tabStyle = (t) => ({
    padding: "8px 20px", fontSize: 13, fontWeight: 700, borderRadius: 8, border: "none", cursor: "pointer",
    background: activeTab === t ? COLORS.red : "transparent",
    color: activeTab === t ? "#fff" : COLORS.muted,
  });

  const cardStyle = { background: "#fff", border: `1.5px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 16 };
  const sectionTitle = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: COLORS.muted, marginBottom: 14 };

  if (loading) {
    return (
      <div style={{ background: COLORS.cream, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ color: COLORS.muted, fontSize: 14 }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.cream, minHeight: "100vh", padding: "24px 20px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.red, letterSpacing: "-0.02em" }}>The Family Reunion</div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 3 }}>Walter Where?House · June 19, 2026 · Sales Dashboard</div>
          </div>
          <div style={{ background: COLORS.black, color: COLORS.cream, borderRadius: 10, padding: "10px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: COLORS.yellow }}>Days to Event</div>
            <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{Math.max(0, daysTo)}</div>
          </div>
        </div>

        <div style={{ background: COLORS.black, color: COLORS.cream, borderRadius: 10, padding: "11px 18px", fontSize: 13, marginBottom: 20, display: "flex", gap: 8, alignItems: "center" }}>
          <span>📊</span>
          <span>
            <strong style={{ color: COLORS.yellow }}>{latestRsvp?.total ?? 0} RSVPs</strong> confirmed &nbsp;·&nbsp;
            <strong style={{ color: COLORS.yellow }}>{latestPaid?.total ?? 0} paid add-ons</strong> sold &nbsp;·&nbsp;
            {daysTo > 0 ? `${daysTo} days remaining` : daysTo === 0 ? "Event is today!" : "Event has passed"}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
          <Stat label="Total RSVPs" value={latestRsvp?.total} color={COLORS.red} sub={`${latestRsvp?.adult ?? 0}A + ${latestRsvp?.child ?? 0}C`} topColor={COLORS.red} />
          <Stat label="Adult RSVPs" value={latestRsvp?.adult} color={COLORS.blue} sub="Free.99 GA Adult" topColor={COLORS.blue} />
          <Stat label="Child RSVPs" value={latestRsvp?.child} color={COLORS.black} sub="Free.99 GA Child" topColor={COLORS.yellow} />
          <Stat label="Paid Add-ons" value={latestPaid?.total} color={COLORS.black} sub={`${latestPaid?.bundle ?? 0} bundle · ${latestPaid?.pass ?? 0} pass`} topColor={COLORS.green} />
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 16, background: COLORS.creamDark, padding: 4, borderRadius: 10, width: "fit-content" }}>
          <button style={tabStyle("rsvp")} onClick={() => setActiveTab("rsvp")}>Free RSVPs</button>
          <button style={tabStyle("paid")} onClick={() => setActiveTab("paid")}>Paid Add-ons</button>
        </div>

        {activeTab === "rsvp" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div style={cardStyle}>
                <div style={sectionTitle}>Daily new RSVPs</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={rsvpDaily} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e4cc" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 12 }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="dailyAdult" name="Adult" stackId="a" fill={COLORS.blue} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="dailyChild" name="Child" stackId="a" fill={COLORS.green} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={cardStyle}>
                <div style={sectionTitle}>Cumulative RSVPs</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={rsvpDaily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e4cc" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 12 }} />
                    <Line type="monotone" dataKey="total" name="Total RSVPs" stroke={COLORS.red} strokeWidth={2.5} dot={{ fill: COLORS.yellow, r: 3, strokeWidth: 2, stroke: COLORS.red }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={sectionTitle}>Log daily RSVP report</div>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                <Input label="Date" type="date" value={rDate} onChange={e => setRDate(e.target.value)} width={155} />
                <Input label="GA Adult outstanding" type="number" placeholder="e.g. 1740" value={rAdult} onChange={e => setRAdult(e.target.value)} />
                <Input label="GA Child outstanding" type="number" placeholder="e.g. 1880" value={rChild} onChange={e => setRChild(e.target.value)} />
                <button onClick={addRsvp} disabled={saving} style={{ height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700, borderRadius: 8, border: "none", background: saving ? "#ccc" : COLORS.red, color: "#fff", cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 8 }}>Enter the "outstanding" numbers from the See Tickets email under Free.99 GA Adult and Free.99 GA Child.</div>
              <div style={{ fontSize: 12, color: COLORS.blue, marginTop: 6, fontWeight: 600, minHeight: 16 }}>{msg}</div>
            </div>

            <div style={cardStyle}>
              <div style={sectionTitle}>RSVP log</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>{["Date", "Total", "Adult", "Child", "New that day", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: COLORS.muted, padding: "6px 10px", borderBottom: `1.5px solid ${COLORS.border}` }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {[...rsvpDaily].reverse().map(d => (
                    <tr key={d.rawDate} style={{ borderBottom: `1px solid ${COLORS.creamDark}` }}>
                      <td style={{ padding: "8px 10px", color: COLORS.muted, fontSize: 12 }}>{d.rawDate}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700 }}>{d.total}</td>
                      <td style={{ padding: "8px 10px" }}>{d.adult}</td>
                      <td style={{ padding: "8px 10px" }}>{d.child}</td>
                      <td style={{ padding: "8px 10px" }}>
                        {d.dailyNew === 0 ? <Badge bg={COLORS.creamDark} color={COLORS.muted}>—</Badge>
                          : d.dailyNew >= 20 ? <Badge bg="#fdecea" color={COLORS.red}>🔥 +{d.dailyNew}</Badge>
                          : <Badge bg="#dde8f8" color={COLORS.blue}>+{d.dailyNew}</Badge>}
                      </td>
                      <td style={{ padding: "8px 4px" }}>
                        <button onClick={() => removeRsvp(d.rawDate)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 16 }}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "paid" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Grown Folks Bundle", value: latestPaid?.bundle, cap: 50, color: COLORS.red },
                { label: "Grown Folks Pass", value: latestPaid?.pass, cap: 1500, color: COLORS.blue },
                { label: "Siptale Cocktail", value: latestPaid?.siptale, cap: 100, color: COLORS.green },
                { label: "Dessert Competition", value: latestPaid?.dessert, cap: 100, color: COLORS.yellow },
                { label: "Food Competition Bundle", value: latestPaid?.food, cap: 50, color: COLORS.red },
                { label: "Wing Competition", value: latestPaid?.wing, cap: 100, color: COLORS.blue },
              ].map(item => (
                <div key={item.label} style={{ background: "#fff", border: `1.5px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 16px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: item.color }} />
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: COLORS.muted, marginBottom: 5, marginTop: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.black }}>{item.value ?? 0}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>of {item.cap} available</div>
                  <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: COLORS.creamDark }}>
                    <div style={{ height: "100%", borderRadius: 4, background: item.color, width: `${Math.min(100, ((item.value ?? 0) / item.cap) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div style={cardStyle}>
                <div style={sectionTitle}>Daily new add-on sales</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={paidDaily} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e4cc" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 12 }} />
                    <Bar dataKey="dailyNew" name="New sales" fill={COLORS.red} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={cardStyle}>
                <div style={sectionTitle}>Cumulative add-on sales</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={paidDaily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e4cc" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 12 }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="bundle" name="Bundle" stroke={COLORS.red} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pass" name="Pass" stroke={COLORS.blue} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="siptale" name="Siptale" stroke={COLORS.green} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="dessert" name="Dessert" stroke={COLORS.yellow} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="food" name="Food Bundle" stroke="#e8734a" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="wing" name="Wing" stroke="#9b59b6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={sectionTitle}>Log today's add-on sales</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <Input label="Date" type="date" value={pDate} onChange={e => setPDate(e.target.value)} width={155} />
                <Input label="Bundle new" type="number" placeholder="0" value={pBundle} onChange={e => setPBundle(e.target.value)} width={90} />
                <Input label="Pass new" type="number" placeholder="0" value={pPass} onChange={e => setPPass(e.target.value)} width={90} />
                <Input label="Siptale new" type="number" placeholder="0" value={pSiptale} onChange={e => setPSiptale(e.target.value)} width={90} />
                <Input label="Dessert new" type="number" placeholder="0" value={pDessert} onChange={e => setPDessert(e.target.value)} width={90} />
                <Input label="Food new" type="number" placeholder="0" value={pFood} onChange={e => setPFood(e.target.value)} width={90} />
                <Input label="Wing new" type="number" placeholder="0" value={pWing} onChange={e => setPWing(e.target.value)} width={90} />
                <button onClick={addPaid} disabled={saving} style={{ height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700, borderRadius: 8, border: "none", background: saving ? "#ccc" : COLORS.red, color: "#fff", cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 8 }}>Enter how many new tickets sold today for each add-on. Leave blank or 0 if nothing sold.</div>
              <div style={{ fontSize: 12, color: COLORS.blue, marginTop: 6, fontWeight: 600, minHeight: 16 }}>{msg}</div>
            </div>

            <div style={cardStyle}>
              <div style={sectionTitle}>Add-on sales log</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>{["Date", "Total", "Bundle", "Pass", "Siptale", "Dessert", "Food", "Wing", "New today", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: COLORS.muted, padding: "6px 8px", borderBottom: `1.5px solid ${COLORS.border}` }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {[...paidDaily].reverse().map(d => (
                    <tr key={d.rawDate} style={{ borderBottom: `1px solid ${COLORS.creamDark}` }}>
                      <td style={{ padding: "7px 8px", color: COLORS.muted, fontSize: 11 }}>{d.rawDate}</td>
                      <td style={{ padding: "7px 8px", fontWeight: 700 }}>{d.total}</td>
                      <td style={{ padding: "7px 8px" }}>{d.bundle}</td>
                      <td style={{ padding: "7px 8px" }}>{d.pass}</td>
                      <td style={{ padding: "7px 8px" }}>{d.siptale}</td>
                      <td style={{ padding: "7px 8px" }}>{d.dessert}</td>
                      <td style={{ padding: "7px 8px" }}>{d.food}</td>
                      <td style={{ padding: "7px 8px" }}>{d.wing}</td>
                      <td style={{ padding: "7px 8px" }}>
                        {d.dailyNew === 0 ? <Badge bg={COLORS.creamDark} color={COLORS.muted}>—</Badge>
                          : <Badge bg="#dde8f8" color={COLORS.blue}>+{d.dailyNew}</Badge>}
                      </td>
                      <td style={{ padding: "7px 4px" }}>
                        <button onClick={() => removePaid(d.rawDate)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 16 }}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
