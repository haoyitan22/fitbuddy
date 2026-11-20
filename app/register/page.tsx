"use client";

import "@fontsource/zcool-kuaile/400.css";
import "./register.css";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Pet, UserProfile } from "@/lib/auth";
import { saveUserData, createSession, clearTempData, clearPreviousAccountData } from "@/lib/auth";
import { ageOf, targetsFor } from "@/lib/goals";
import { START_COINS } from "@/lib/coins";
import KeyedVideo from "@/components/register/KeyedVideo";
import { Ruler, WheelColumn } from "@/components/register/Pickers";

/* ──────────────────────────────────────────────────────────────
   Registration: adopt a pet first, then the pet walks the user
   through one question per screen, shows the personal plan, and
   only then asks for the account. 12 steps + a "welcome home" screen.
   Progress is kept in sessionStorage, so a reload resumes the step.
   ────────────────────────────────────────────────────────────── */

type Kind = "panda" | "cat" | "hamster" | "fox" | "bear";

const PETS: { kind: Kind; trait: string; pet: Pet }[] = [
  { kind: "panda", trait: "憨厚爱犯困", pet: { emoji: "🐼", species: "熊猫", name: "胖达", desc: "憨厚可爱，最懂减脂的辛苦" } },
  { kind: "cat", trait: "慵懒又温柔", pet: { emoji: "🐱", species: "猫咪", name: "橘子", desc: "慵懒温柔，陪你每一顿饭" } },
  { kind: "hamster", trait: "元气小太阳", pet: { emoji: "🐹", species: "仓鼠", name: "豆豆", desc: "活力满满，每天都很期待你" } },
  { kind: "fox", trait: "机灵小俏皮", pet: { emoji: "🦊", species: "狐狸", name: "小狐", desc: "机灵可爱，和你一起闪闪发光" } },
  { kind: "bear", trait: "稳重又暖心", pet: { emoji: "🐻", species: "棕熊", name: "肉桂", desc: "稳重暖心，默默支持你" } },
];
/** Name ideas: ones that suit each pet, plus a shared pool; shown five at a time with 换一批. */
const NAME_IDEAS: Record<Kind, string[]> = {
  panda: ["团团", "圆圆", "圆滚滚", "阿福", "黑白配", "墩墩", "竹子", "笋笋", "滚滚", "芝麻汤圆", "奥利奥", "胖胖", "饭团", "小黑眼圈"],
  cat: ["小橘", "咪咪", "芒果", "布丁", "橘座", "蛋黄", "胡萝卜", "南瓜", "大橘", "喵酱", "柚子", "鱼丸", "金桔", "小老虎"],
  hamster: ["汤圆", "瓜子", "毛球", "糯米", "豆包", "花生", "仓仓", "米团", "奶糖", "鼓鼓", "松饼", "小圆", "栗子球", "腮腮"],
  fox: ["阿狸", "火火", "柿子", "小枫", "红豆", "橙子", "小火苗", "狐宝", "枫糖", "丹丹", "糖葫芦", "辣椒", "狐小桃", "落叶"],
  bear: ["可可", "熊熊", "布朗", "栗子", "巧克力", "摩卡", "咖啡豆", "大福", "憨憨", "蜂蜜", "拿铁", "黑糖", "肉松", "卡布"],
};
const SHARED_NAMES = ["小福星", "阿乐", "嘟嘟", "球球", "年糕", "麻薯", "奶盖", "布丁头", "元宝", "七七", "暖暖", "甜甜", "开心果", "小确幸", "棉花糖", "皮皮"];
const IDEAS_PER_BATCH = 5;
function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** Which of the nine small pet pictures each step shows next to its question. */
const BADGE: Record<number, number> = { 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 11: 8, 12: 9 };

const ACTIVITY = [
  { id: "sedentary", title: "久坐不动", desc: "上班 / 上课坐一天，几乎不运动" },
  { id: "light", title: "轻度活动", desc: "每周运动 1-3 次，或每天走路 30 分钟" },
  { id: "moderate", title: "中度活动", desc: "每周运动 3-5 次" },
  { id: "intense", title: "高强度", desc: "几乎每天都练，或体力型工作" },
];
const PACES = [
  { months: 6, title: "稳稳来 · 6 个月", tail: "几乎没有饥饿感" },
  { months: 3, title: "刚刚好 · 3 个月", tail: "大多数人的选择", tag: "推荐" },
  { months: 2, title: "冲一冲 · 2 个月", tail: "需要更自律" },
];
/** ids are stored in fitbuddy_diet_prefs and read by the meal suggestions (lib/goals.ts). */
const DIET_GROUPS = [
  { title: "口味", items: [["nospicy", "不吃辣"], ["light", "清淡"], ["heavy", "重口味"]] },
  { title: "饮食方式", items: [["hiprotein", "高蛋白"], ["lowcarb", "低碳水"], ["veg", "素食"], ["fasting", "轻断食"]] },
  { title: "不吃的", items: [["noseafood", "海鲜"], ["nomeat", "牛羊肉"], ["nodairy", "乳制品"], ["nocilantro", "香菜"]] },
];

interface Form {
  kind: Kind | null; petName: string; gender: "female" | "male" | null; birthday: string;
  height: number; weight: number; activityLevel: string; targetWeight: number; goalMonths: number;
  diet: string[]; nickname: string; email: string; password: string;
}
const START: Form = {
  kind: null, petName: "", gender: null, birthday: "2000-06-15", height: 165, weight: 60, activityLevel: "light",
  targetWeight: 55, goalMonths: 3, diet: [], nickname: "", email: "", password: "",
};
const DRAFT_KEY = "fitbuddy_register_v2";
const TOTAL = 12;

const pad = (n: number) => String(n).padStart(2, "0");
const bmiOf = (w: number, h: number) => w / (h / 100) ** 2;
function bmiLevel(b: number) {
  return b < 18.5 ? "偏瘦" : b < 24 ? "正常" : b < 28 ? "偏胖" : "肥胖";
}
/** Marker position on the four equal BMI segments (Chinese adult ranges). */
function bmiPos(b: number) {
  const bands = [[14, 18.5], [18.5, 24], [24, 28], [28, 35]];
  for (let i = 0; i < bands.length; i++) {
    const [lo, hi] = bands[i];
    if (b < hi || i === bands.length - 1) return ((i + Math.min(1, Math.max(0, (b - lo) / (hi - lo)))) / 4) * 100;
  }
  return 50;
}
function addDays(days: number) {
  const d = new Date(); d.setDate(d.getDate() + Math.round(days)); return d;
}
const fmtDate = (d: Date) => `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;

const Check = ({ size = 13 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Heart = ({ size = 16, color = "#FF7A45" }: { size?: number; color?: string }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z" /></svg>
);
const Arrow = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Star = ({ color = "#fff", size = 20 }: { color?: string; size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 2l2.6 6.6L21.5 9l-5.3 4.6L17.9 21 12 17.2 6.1 21l1.7-7.4L2.5 9l6.9-.4z" /></svg>
);

export default function RegisterFlow() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(START);
  const [step, setStep] = useState(1);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [agree, setAgree] = useState(false);
  const [ideaOrder, setIdeaOrder] = useState<string[]>([]);
  const [ideaPage, setIdeaPage] = useState(0);

  // resume a half-finished registration after a reload
  useEffect(() => {
    try {
      const raw = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      if (raw?.form) setForm({ ...START, ...raw.form });
      if (raw?.step >= 1 && raw.step <= 12) setStep(raw.step === 10 ? 9 : raw.step);
    } catch { /* fresh start */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || step === 13) return;
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step })); } catch { /* ignore */ }
  }, [form, step, ready]);
  useEffect(() => { window.scrollTo(0, 0); setError(""); }, [step]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setError(""); setForm(f => ({ ...f, [k]: v })); };
  const pet = PETS.find(p => p.kind === form.kind) ?? PETS[0];
  const shownName = form.petName.trim() || pet.pet.name;
  const badge = (s: number) => `/register/avatars/${pet.kind}-${BADGE[s]}.webp`;

  const age = ageOf(form.birthday);
  const bmi = bmiOf(form.weight, form.height);
  const profileDraft: Partial<UserProfile> = {
    gender: form.gender ?? "female", birthday: form.birthday, height: form.height, weight: form.weight,
    activityLevel: form.activityLevel, targetWeight: form.targetWeight, goalMonths: form.goalMonths,
  };
  const targets = useMemo(() => targetsFor(profileDraft), [form]); // eslint-disable-line react-hooks/exhaustive-deps

  function back() {
    if (step === 1) router.push("/");
    else setStep(step === 11 ? 9 : step - 1);
  }
  const next = () => setStep(s => s + 1);

  function createAccount() {
    const nickname = form.nickname.trim(), email = form.email.trim();
    if (!nickname) return setError("给自己起个昵称吧");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("邮箱格式好像不对，再检查一下");
    if (form.password.length < 6) return setError("密码至少要 6 位");
    if (!agree) return setError("请先阅读并同意用户协议和隐私政策");
    const profile: UserProfile = {
      nickname, gender: form.gender ?? "female", birthday: form.birthday,
      weight: form.weight, height: form.height, targetWeight: form.targetWeight, goalMonths: form.goalMonths,
      activityLevel: form.activityLevel, email, password: form.password,
      pet: pet.pet, petName: shownName, petJoinDate: new Date().toISOString(),
    };
    // A new account starts empty: no coins, items or records left by an earlier account here.
    clearPreviousAccountData();
    saveUserData(profile);
    try { localStorage.setItem("fitbuddy_diet_prefs", JSON.stringify(form.diet)); } catch { /* ignore */ }
    createSession(email);
    clearTempData();
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setStep(13);
  }

  if (!ready) return <div className="rg" />;

  const top = (s: number, count = true) => (
    <div className="rg-top">
      <button type="button" className="rg-back" onClick={back} aria-label="返回上一步">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#5B2E1E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <span className="rg-track" role="progressbar" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={s} aria-label="注册进度">
        <b style={{ width: `${(s / TOTAL) * 100}%` }} />
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="#FF7A45" style={{ left: `${(s / TOTAL) * 100}%` }}><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z" /></svg>
      </span>
      {count && <span className="rg-count">手续 {s}/{TOTAL}</span>}
    </div>
  );
  const ask = (q: string, sub: string, img?: string) => (
    <div className="rg-ask">
      <div>
        <h1 className="rg-ribbon">{q}</h1>
        {sub && <p className="rg-sub">{sub}</p>}
      </div>
      {img && <img className="rg-badge" src={img} alt="" />}
    </div>
  );
  const cta = (label: string, onClick: () => void, disabled = false) => (
    <button type="button" className="rg-cta" onClick={onClick} disabled={disabled}>{label}<Arrow /></button>
  );

  let body: React.ReactNode = null;

  if (step === 1) {
    const card = (p: typeof PETS[number]) => (
      <button type="button" key={p.kind} className="rg-pet" aria-pressed={form.kind === p.kind}
        onClick={() => { if (form.kind !== p.kind) { setIdeaOrder([]); setIdeaPage(0); } setForm(f => ({ ...f, kind: p.kind, petName: f.kind === p.kind ? f.petName : "" })); }}>
        {form.kind === p.kind && <em><Heart size={11} color="#fff" />想领养</em>}
        <img src={`/register/pets/${p.kind}.webp`} alt="" />
        <b>{p.pet.name}</b><span>{p.trait}</span>
      </button>
    );
    body = <>
      {top(1)}
      {ask("先选一只小伙伴", "它会陪你记录每一餐、一起运动打卡")}
      <div className="rg-pets">
        <div className="rg-pets-row">{PETS.slice(0, 2).map(card)}</div>
        <div className="rg-pets-row small">{PETS.slice(2).map(card)}</div>
      </div>
      <div className="rg-spacer" />
      {cta(form.kind ? `就领养${pet.pet.name}了` : "选一只小伙伴", next, !form.kind)}
      <p className="rg-hint">之后在「我的」里随时能换伙伴</p>
    </>;
  }

  if (step === 2) {
    body = <>
      {top(2)}
      {ask("给它起个名字吧", "以后每天它都会喊你一起加油")}
      <div className="rg-card" style={{ alignItems: "center", gap: 14, padding: "22px 18px" }}>
        <img className="rg-big" src={`/register/pets/${pet.kind}.webp`} alt={pet.pet.name} />
        <input id="rg-petname" className="rg-input name" maxLength={10} value={form.petName} placeholder={pet.pet.name}
          onChange={e => set("petName", e.target.value)} aria-label="宠物的名字" />
        <div className="rg-row" style={{ alignSelf: "stretch" }}>
          <p className="rg-label">换个灵感</p>
          <button type="button" className="rg-refresh" onClick={() => {
            const pages = Math.floor(ideaOrder.length / IDEAS_PER_BATCH);
            if (ideaPage + 1 >= pages) { setIdeaOrder(shuffled([...NAME_IDEAS[pet.kind], ...SHARED_NAMES])); setIdeaPage(0); }
            else setIdeaPage(ideaPage + 1);
          }}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            换一批
          </button>
        </div>
        <div className="rg-chips" style={{ alignSelf: "stretch" }} aria-live="polite">
          {(ideaOrder.length ? ideaOrder.slice(ideaPage * IDEAS_PER_BATCH, (ideaPage + 1) * IDEAS_PER_BATCH) : [pet.pet.name, ...NAME_IDEAS[pet.kind].slice(0, IDEAS_PER_BATCH - 1)]).map(n => (
            <button type="button" key={n} className="rg-chip" aria-pressed={shownName === n} onClick={() => set("petName", n)}>{n}</button>
          ))}
        </div>
      </div>
      <div className="rg-spacer" />
      {cta("下一步", () => { if (!form.petName.trim()) set("petName", pet.pet.name); next(); })}
      <p className="rg-hint">名字之后也能改</p>
    </>;
  }

  if (step === 3) {
    body = <>
      {top(3)}
      {ask("你的性别是？", "生理性别会影响基础代谢的计算", badge(3))}
      <div className="rg-pair">
        {([["female", "女生"], ["male", "男生"]] as const).map(([g, label]) => (
          <button type="button" key={g} className="rg-gender" aria-pressed={form.gender === g} onClick={() => set("gender", g)}>
            <img src={`/register/gender/${g}.webp`} alt="" />
            <b>{label}{form.gender === g && <span className="rg-tick"><Check size={12} /></span>}</b>
          </button>
        ))}
      </div>
      <div className="rg-card" style={{ padding: "14px 16px" }}>
        <p className="rg-sub" style={{ fontSize: 13, lineHeight: "20px" }}>女生的基础代谢通常比男生低一些，{shownName}会按你的情况来算，不会一刀切。</p>
      </div>
      <div className="rg-spacer" />
      {cta("下一步", next, !form.gender)}
    </>;
  }

  if (step === 4) {
    const [y, m, d] = form.birthday.split("-").map(Number);
    const thisYear = new Date().getFullYear();
    const years = Array.from({ length: 80 }, (_, i) => thisYear - 10 - i).reverse();
    const days = Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => i + 1);
    const setDate = (yy: number, mm: number, dd: number) => {
      const max = new Date(yy, mm, 0).getDate();
      set("birthday", `${yy}-${pad(mm)}-${pad(Math.min(dd, max))}`);
    };
    body = <>
      {top(4)}
      {ask("你的生日是哪天？", "年龄和基础代谢水平息息相关", badge(4))}
      <div className="rg-card" style={{ padding: 12 }}>
        <div className="rg-wheel">
          <WheelColumn label="出生年份" options={years} value={y} suffix="年" onChange={v => setDate(v, m, d)} />
          <WheelColumn label="出生月份" options={Array.from({ length: 12 }, (_, i) => i + 1)} value={m} suffix="月" onChange={v => setDate(y, v, d)} />
          <WheelColumn label="出生日期" options={days} value={d} suffix="日" onChange={v => setDate(y, m, v)} />
        </div>
      </div>
      {age && (
        <div className="rg-card" style={{ gap: 8, padding: "16px 18px" }}>
          <div className="rg-big-num"><b>{age}</b><span>岁</span></div>
          <p className="rg-sub" style={{ fontSize: 13, lineHeight: "20px" }}>
            {age < 30 ? "基础代谢正旺盛，现在开始管理体重，效果会很明显～"
              : age < 45 ? "代谢开始慢慢放缓，吃对和动起来一样重要，我们一起来～"
                : "这个阶段更要稳稳来，吃够蛋白质、多走动，身体会越来越轻松～"}
          </p>
        </div>
      )}
      <div className="rg-spacer" />
      {cta("下一步", next)}
    </>;
  }

  if (step === 5) {
    const level = bmiLevel(bmi);
    body = <>
      {top(5)}
      {ask("你的身高和体重", "用来计算 BMI 和每天需要的热量", badge(5))}
      <div className="rg-card" style={{ gap: 6, padding: "14px 18px" }}>
        <p className="rg-label">身高</p>
        <Ruler id="rg-height" label="身高" unit="cm" min={120} max={220} step={1} value={form.height} onChange={v => set("height", v)} />
        <div className="rg-sep" />
        <p className="rg-label">体重</p>
        <Ruler id="rg-weight" label="体重" unit="kg" min={30} max={200} step={0.1} value={form.weight} onChange={v => set("weight", v)} />
      </div>
      <div className="rg-card" style={{ gap: 10, padding: "14px 18px" }}>
        <div className="rg-row">
          <b style={{ fontSize: 13, fontWeight: 500 }}>你的 BMI</b>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><b style={{ fontSize: 20 }}>{bmi.toFixed(1)}</b><span className="rg-pill">{level}</span></span>
        </div>
        <div className="rg-bmi" aria-hidden="true">
          {[["#9CC9F5", "偏瘦"], ["#FF7A45", "正常"], ["#FFC86B", "偏胖"], ["#FF8A7A", "肥胖"]].map(([c, n]) => <div key={n}><i style={{ background: c }} />{n}</div>)}
          <b style={{ left: `${bmiPos(bmi)}%` }} />
        </div>
      </div>
      <div className="rg-spacer" />
      {cta("下一步", () => { if (form.targetWeight >= form.weight || form.targetWeight < 30) set("targetWeight", Math.round(form.weight * 0.92)); next(); })}
    </>;
  }

  if (step === 6) {
    body = <>
      {top(6)}
      {ask("平时运动多吗？", "选最接近你最近一个月的状态", badge(6))}
      <div className="rg-options">
        {ACTIVITY.map(a => (
          <button type="button" key={a.id} className="rg-option" aria-pressed={form.activityLevel === a.id} onClick={() => set("activityLevel", a.id)}>
            <span><b>{a.title}</b><small>{a.desc}</small></span>
            <span className="rg-radio">{form.activityLevel === a.id && <Check />}</span>
          </button>
        ))}
      </div>
      <div className="rg-note"><img className="rg-badge" style={{ width: 40, height: 40 }} src={`/register/avatars/${pet.kind}-1.webp`} alt="" />
        <span style={{ color: "#A67760", fontSize: 12.5, lineHeight: "18px" }}>选错也没关系，之后{shownName}会根据你的打卡帮你调整</span></div>
      <div className="rg-spacer" />
      {cta("下一步", next)}
    </>;
  }

  if (step === 7) {
    const diff = form.weight - form.targetWeight;
    const tBmi = bmiOf(form.targetWeight, form.height);
    const minHealthy = Math.ceil(18.5 * (form.height / 100) ** 2);
    const tooLow = tBmi < 18.5;
    const msg = tooLow ? `目标 BMI 是 ${tBmi.toFixed(1)}，有点偏瘦了。建议定在 ${minHealthy} kg 以上，健康更重要～`
      : diff > 0.5 ? `减重 ${diff.toFixed(1)} kg（约 ${Math.round((diff / form.weight) * 100)}%），达成后 BMI ${tBmi.toFixed(1)}，健康又能做到！`
        : diff < -0.5 ? `增重 ${(-diff).toFixed(1)} kg，达成后 BMI ${tBmi.toFixed(1)}，我们会帮你吃够、吃好。`
          : "保持现在的体重也很棒，我们会帮你吃得均衡、动得开心。";
    body = <>
      {top(7)}
      {ask("你的目标体重是？", "我们会帮你检查这个目标健不健康", badge(7))}
      <div className="rg-card" style={{ gap: 6, padding: "22px 18px" }}>
        <Ruler id="rg-target" label="目标体重" unit="kg" min={30} max={200} step={0.1} value={form.targetWeight} onChange={v => set("targetWeight", v)} />
        <div className="rg-compare">
          <div>现在<b>{form.weight.toFixed(1)} kg</b></div>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#A67760" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div className="on">目标<b>{form.targetWeight.toFixed(1)} kg</b></div>
        </div>
      </div>
      <div className={`rg-note${tooLow ? " warn" : ""}`}><Star color="#F5A623" /><span style={{ fontWeight: 500 }}>{msg}</span></div>
      <div className="rg-spacer" />
      {cta("下一步", next)}
    </>;
  }

  if (step === 8) {
    const diff = Math.abs(form.weight - form.targetWeight);
    const plan = targets.plan;
    const keep = !plan || plan.goal === "maintain";
    const days = plan?.monthsNeeded ? plan.monthsNeeded * 30.4 : form.goalMonths * 30.4;
    body = <>
      {top(8)}
      {ask("想用多久达成？", keep ? "保持体重不用赶时间，选个舒服的节奏" : "越稳越不容易反弹哦", badge(8))}
      <div className="rg-options">
        {PACES.map(p => (
          <button type="button" key={p.months} className="rg-option" aria-pressed={form.goalMonths === p.months} onClick={() => set("goalMonths", p.months)}>
            <span><b>{p.title}{p.tag && <em>{p.tag}</em>}</b>
              <small>{keep ? p.tail : `每周约 ${(diff / (p.months * 4.345)).toFixed(2)} kg，${p.tail}`}</small></span>
            <span className="rg-radio">{form.goalMonths === p.months && <Check />}</span>
          </button>
        ))}
      </div>
      {!keep && plan && (
        <div className="rg-card" style={{ gap: 10, padding: "16px 18px" }}>
          <div className="rg-stats">
            <div><small>需要约</small><b>{Math.max(1, Math.round(days / 7))}<small>周</small></b></div>
            <div><small>{plan.goal === "lose" ? "每天少吃" : "每天多吃"}</small><b>{Math.abs(plan.adjust)}<small>kcal</small></b></div>
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, textAlign: "center" }}>预计 {fmtDate(addDays(days))} 达到 {form.targetWeight.toFixed(1)} kg</p>
          {plan.capped && <p className="rg-sub" style={{ textAlign: "center" }}>这个速度有点快，为了身体健康，{shownName}帮你放慢到每周约 {Math.abs(plan.weeklyKg)} kg</p>}
        </div>
      )}
      <div className="rg-spacer" />
      {cta("下一步", next)}
    </>;
  }

  if (step === 9) {
    const toggle = (id: string) => set("diet", form.diet.includes(id) ? form.diet.filter(x => x !== id) : [...form.diet, id]);
    body = <>
      {top(9)}
      {ask("有什么饮食偏好？", "可多选，推荐菜时会避开你不吃的", badge(9))}
      <div className="rg-card" style={{ padding: "18px 16px" }}>
        {DIET_GROUPS.map(g => (
          <div key={g.title} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p className="rg-label">{g.title}</p>
            <div className="rg-chips">
              {g.items.map(([id, label]) => (
                <button type="button" key={id} className="rg-chip" aria-pressed={form.diet.includes(id)} onClick={() => toggle(id)}>
                  {form.diet.includes(id) && <Check />}{label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rg-spacer" />
      {cta("下一步", next)}
      {form.diet.length === 0 && <button type="button" className="rg-link" onClick={next}>没有特别要求，跳过</button>}
    </>;
  }

  if (step === 10) body = <Generating name={shownName} kind={pet.kind} top={top(10, false)} onDone={() => setStep(11)} />;

  if (step === 11) {
    const t = targets;
    const carbs = Math.max(0, Math.round((t.calories - t.protein * 4 - t.fat * 9) / 4));
    const plan = t.plan;
    const days = plan?.monthsNeeded ? plan.monthsNeeded * 30.4 : form.goalMonths * 30.4;
    const end = addDays(days);
    const keep = !plan || plan.goal === "maintain";
    const w0 = form.weight, w1 = keep ? form.weight : form.targetWeight;
    // weight line: fast early, easing out (the usual shape of a steady deficit)
    const y = (w: number) => { const hi = Math.max(w0, w1), lo = Math.min(w0, w1); return hi === lo ? 60 : 22 + ((hi - w) / (hi - lo)) * 78; };
    const path = `M10 ${y(w0)} C 90 ${y(w0) + 2}, 120 ${(y(w0) + y(w1)) / 2 - 8}, 160 ${(y(w0) + y(w1)) / 2} S 240 ${y(w1) - 2}, 300 ${y(w1)}`;
    body = <>
      {top(11)}
      <div className="rg-plan-head">
        <div>
          <h1>你的专属健康计划</h1>
          <p className="rg-sub" style={{ fontSize: 13 }}>{keep ? "保持体重，吃得均衡更重要" : <>{`${end.getFullYear()}.${pad(end.getMonth() + 1)}.${pad(end.getDate())} 达到 `}<b style={{ color: "#FF7A45", fontSize: 16 }}>{w1.toFixed(1)} kg</b></>}</p>
        </div>
        <img className="rg-badge" src={badge(11)} alt="" />
      </div>
      <div className="rg-card" style={{ padding: 18 }}>
        <p className="rg-sub" style={{ fontSize: 13 }}>每天建议吃</p>
        <div className="rg-kcal"><b>{t.calories.toLocaleString()}</b><span style={{ fontWeight: 500 }}>kcal</span></div>
        <div className="rg-macros">
          <div>蛋白质<b>{t.protein}g</b><i style={{ background: "#A78BFA" }} /></div>
          <div>碳水<b>{carbs}g</b><i style={{ background: "#FFB86B" }} /></div>
          <div>脂肪<b>{t.fat}g</b><i style={{ background: "#7CC9F0" }} /></div>
        </div>
      </div>
      <div className="rg-card" style={{ gap: 8, padding: 16 }}>
        <div className="rg-row"><b style={{ fontSize: 13, fontWeight: 500 }}>体重变化预测</b>
          {!keep && plan && <span style={{ fontSize: 12, color: "#FF7A45", fontWeight: 500 }}>每周约 {plan.weeklyKg > 0 ? "+" : ""}{plan.weeklyKg} kg</span>}</div>
        <svg viewBox="0 0 310 120" width="100%" height="118" role="img" aria-label={`体重从 ${w0.toFixed(1)} kg 变化到 ${w1.toFixed(1)} kg`}>
          <defs><linearGradient id="rg-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF7A45" stopOpacity=".28" /><stop offset="1" stopColor="#FF7A45" stopOpacity="0" /></linearGradient></defs>
          <path d={`${path} L300 120 L10 120 Z`} fill="url(#rg-g)" />
          <path d={path} stroke="#FF7A45" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="10" cy={y(w0)} r="5" fill="#fff" stroke="#FF7A45" strokeWidth="3" />
          <circle cx="300" cy={y(w1)} r="5" fill="#FF7A45" />
        </svg>
        <div className="rg-row" style={{ fontSize: 11.5, color: "#A67760" }}>
          <span>今天 {w0.toFixed(1)} kg</span><span>{keep ? "保持" : `${end.getMonth() + 1}.${end.getDate()}`} · {w1.toFixed(1)} kg</span>
        </div>
      </div>
      <div className="rg-spacer" />
      {cta("保存我的计划", next)}
    </>;
  }

  if (step === 12) {
    body = <>
      {top(12)}
      {ask("最后一步，存好计划", "注册后数据会保存好，下次登录还在", badge(12))}
      <form className="rg-card" style={{ padding: "20px 18px" }} onSubmit={e => { e.preventDefault(); createAccount(); }}>
        <label className="rg-label" htmlFor="rg-nick" style={{ color: "#5B2E1E" }}>昵称</label>
        <input id="rg-nick" className="rg-input" maxLength={20} value={form.nickname} onChange={e => set("nickname", e.target.value)} placeholder="大家怎么称呼你" autoComplete="nickname" />
        <label className="rg-label" htmlFor="rg-email" style={{ color: "#5B2E1E" }}>邮箱</label>
        <input id="rg-email" className="rg-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="用于登录和找回计划" autoComplete="email" />
        <label className="rg-label" htmlFor="rg-pass" style={{ color: "#5B2E1E" }}>密码</label>
        <input id="rg-pass" className="rg-input" type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="至少 6 位" autoComplete="new-password" />
        <button type="submit" hidden />
      </form>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#A67760", cursor: "pointer" }}>
        <input id="rg-agree" type="checkbox" checked={agree} onChange={e => { setError(""); setAgree(e.target.checked); }} style={{ width: 18, height: 18, accentColor: "#FF7A45" }} />
        我已阅读并同意《用户协议》和《隐私政策》
      </label>
      {error && <p className="rg-error" role="alert">{error}</p>}
      <div className="rg-spacer" />
      {cta("完成注册", createAccount)}
      <button type="button" className="rg-link" onClick={() => router.push("/login")}>已有账号？去登录</button>
    </>;
  }

  if (step === 13) body = <WelcomeHome name={shownName} kind={pet.kind} onEnter={() => router.push("/home")} />;

  return (
    <div className="rg">
      <main className="rg-page">{body}</main>
    </div>
  );
}

function Generating({ name, kind, top, onDone }: { name: string; kind: Kind; top: React.ReactNode; onDone: () => void }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const t0 = performance.now(); let raf = 0, done = false;
    const tick = () => {
      const v = Math.min(100, Math.round((performance.now() - t0) / 65)); // ~6.5 s
      setP(v);
      if (v >= 100 && !done) { done = true; setTimeout(onDone, 700); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const intro = kind === "cat" || kind === "hamster" ? `/register/plan/${kind}-intro.mp4` : undefined;
  const items = ["计算你每天需要的热量", "按你的口味挑选菜谱", "安排运动打卡和宠物陪伴"];
  return <>
    {top}
    <div className="rg-gen-pet"><div><KeyedVideo intro={intro} src={`/register/plan/${kind}-loop.mp4`} label={`${name}抱着写字板认真打勾`} /></div></div>
    <div className="rg-center">
      <h1>{p >= 100 ? `${name}帮你定好计划啦！` : `${name}正在为你定制方案…`}</h1>
      <p className="rg-sub">{p >= 100 ? "马上带你去看" : "按你的身体数据和口味，一项项算好"}</p>
    </div>
    <ul className="rg-card rg-checks">
      {items.map((t, i) => (
        <li key={t} className={p >= [30, 62, 95][i] ? "on" : ""}><span>{t}</span><i><Check size={12} /></i></li>
      ))}
    </ul>
    <div className="rg-bar"><b style={{ width: `${p}%` }} /></div>
    <p className="rg-pct" aria-live="polite">{p}%</p>
  </>;
}

function WelcomeHome({ name, kind, onEnter }: { name: string; kind: Kind; onEnter: () => void }) {
  const [said, setSaid] = useState(false);
  // if the clip cannot autoplay, still show the gift and the button
  useEffect(() => { const t = setTimeout(() => setSaid(true), 5500); return () => clearTimeout(t); }, []);
  return <>
    <div style={{ height: 24 }} />
    <div className="rg-stamp"><Heart size={14} />领养成功</div>
    <div className="rg-home">
      <div className="rg-home-frame" aria-hidden="true" />
      <div className="rg-home-pet">
        <KeyedVideo src={`/register/welcome/${kind}.mp4`} loop={false} label={`${name}从框里爬出来挥手打招呼`} onDone={() => setSaid(true)} />
      </div>
    </div>
    <div className="rg-center rg-done-copy">
      <h1>欢迎回家！</h1>
      <p>{name}已经在家里等你了，<br />今天先记一餐，让它吃饱饱～</p>
    </div>
    <div className={`rg-gift rg-late${said ? " in" : ""}`}>
      <i><Star /></i>
      <div><b>新手礼包已到账</b><small>{START_COINS} 金币，可以去商城给它买装扮</small></div>
    </div>
    <div className="rg-spacer" />
    <div className={`rg-late${said ? " in" : ""}`} style={{ display: "flex", flexDirection: "column" }}>
      <button type="button" className="rg-cta" onClick={onEnter}>进入我的小家<Arrow /></button>
    </div>
  </>;
}
