import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { Link, NavLink, Route, Routes, Navigate, useParams, useNavigate, HashRouter } from 'react-router-dom'

/**
 * UPDRS Part III – 簡易スコアラー（著作権テキストは未掲載）
 * - 0–4ボタン（選択中は青）
 * - 一覧表示＆合計
 * - メモ（測定条件やコツ）をローカル保存
 */

const FORM_ITEMS = [
  { id: "1", label: "話し方" },
  { id: "2", label: "表情" },
  {
    group: true,
    id: "rigidity",
    number: 3,
    label: "筋強剛",
    items: [
      { id: "3N",    label: "頸部" },
      { id: "3RUE",  label: "右上肢" },
      { id: "3LUE",  label: "左上肢" },
      { id: "3RLE",  label: "右下肢" },
      { id: "3LLE",  label: "左下肢" },
    ],
  },
  {
    group: true,
    id: "tap",
    number: 4,
    label: "指タッピング",
    items: [
      { id: "4R", label: "右" },
      { id: "4L", label: "左" },
    ],
  },
  {
    group: true,
    id: "hand",
    number: 5,
    label: "手の運動",
    items: [
      { id: "5R", label: "右" },
      { id: "5L", label: "左" },
    ],
  },
  {
    group: true,
    id: "prosup",
    number: 6,
    label: "回内回外",
    items: [
      { id: "6R", label: "右" },
      { id: "6L", label: "左" },
    ],
  },
  // 新規グループ: つま先タッピング
  {
    group: true,
    id: "toe_tapping",
    number: 7,
    label: "つま先タッピング",
    items: [
      { id: "7R", label: "右" },
      { id: "7L", label: "左" },
    ],
  },
  // 新規グループ: 下肢の敏捷性
  {
    group: true,
    id: "leg_agility",
    number: 8,
    label: "下肢の敏捷性",
    items: [
      { id: "8R", label: "右" },
      { id: "8L", label: "左" },
    ],
  },
  { id: "9",  label: "椅子からの立ち上がり" },
  { id: "10", label: "歩行" },
  { id: "11", label: "すくみ足歩行" },
  { id: "12", label: "姿勢の安定性" },
  { id: "13", label: "姿勢" },
  { id: "14", label: "身体の動作緩慢" },
  {
    group: true,
    id: "postural_tremor",
    number: 15,
    label: "姿勢時振戦",
    items: [
      { id: "15R", label: "右" },
      { id: "15L", label: "左" },
    ],
  },
  {
    group: true,
    id: "kinetic_tremor",
    number: 16,
    label: "運動時振戦",
    items: [
      { id: "16R", label: "右" },
      { id: "16L", label: "左" },
    ],
  },
  // 安静時振戦グループから18(持続性)を除外
  {
    group: true,
    id: "rest_tremor",
    number: 17,
    label: "安静時振戦",
    items: [
      { id: "17RUE", label: "右上肢" },
      { id: "17LUE", label: "左上肢" },
      { id: "17RLE", label: "右下肢" },
      { id: "17LLE", label: "左下肢" },
      { id: "17Lip", label: "口唇" },
    ],
  },
  // 18は個別扱い
  { id: "18", label: "安静時振戦の持続性" },
];

/** 固定の測定方法テキスト（編集不可の説明用） */
const GUIDE_TEXT = {
  "1": "0 正常\n1 抑揚や声量に問題あるが理解可能\n2 抑揚，声量に問題あり一部単語がわかりにくい\n3 発話内容に理解しづらい点がある\n4 殆どの発話内容が理解しにくい",
  "2": "0 正常\n1 瞬きの頻度が少ない\n2 顔の下半分の仮面様顔貌もあるが，口は閉じてる\n3 時折口が開いたまま\n4 ほとんどの時間口が開いたままになってる",
  "3N": "0 なし\n1 誘発時に出現\n2 誘発なしでもあるが，他動的に容易に動かせる\n3 誘発なしでもあり，多糖的に動かすには努力を要する\n4 誘発なしでもあり，他動的に動かせない",
  "3RUE": "0 なし\n1 誘発時に出現\n2 誘発なしでもあるが，他動的に容易に動かせる\n3 誘発なしでもあり，多糖的に動かすには努力を要する\n4 誘発なしでもあり，他動的に動かせない",
  "3LUE": "0 なし\n1 誘発時に出現\n2 誘発なしでもあるが，他動的に容易に動かせる\n3 誘発なしでもあり，多糖的に動かすには努力を要する\n4 誘発なしでもあり，他動的に動かせない",
  "3RLE": "0 なし\n1 誘発時に出現\n2 誘発なしでもあるが，他動的に容易に動かせる\n3 誘発なしでもあり，多糖的に動かすには努力を要する\n4 誘発なしでもあり，他動的に動かせない",
  "3LLE": "0 なし\n1 誘発時に出現\n2 誘発なしでもあるが，他動的に容易に動かせる\n3 誘発なしでもあり，多糖的に動かすには努力を要する\n4 誘発なしでもあり，他動的に動かせない",
  "4R": "0 問題なし\n1 a)1-2回の中断 b)ほんの少し遅い c)最後に振幅減少\n2 a)3-5回の中断, b)少し遅い，c)中程で振幅減少\n3 a)5回を超える中断orすくみ,b)遅い,c)最初から振幅減衰\n4 全くor殆どできない",
  "4L": "0 問題なし\n1 a)1-2回の中断 b)ほんの少し遅い c)最後に振幅減少\n2 a)3-5回の中断, b)少し遅い，c)中程で振幅減少\n3 a)5回を超える中断orすくみ,b)遅い,c)最初から振幅減衰\n4 全くor殆どできない",
  "5R": "0 問題なし\n1 a)1-2回の中断 b)ほんの少し遅い c)最後に振幅減少\n2 a)3-5回の中断, b)少し遅い，c)中程で振幅減少\n3 a)5回を超える中断orすくみ,b)遅い,c)最初から振幅減衰\n4 全くor殆どできない",
  "5L": "0 問題なし\n1 a)1-2回の中断 b)ほんの少し遅い c)最後に振幅減少\n2 a)3-5回の中断, b)少し遅い，c)中程で振幅減少\n3 a)5回を超える中断orすくみ,b)遅い,c)最初から振幅減衰\n4 全くor殆どできない",
  "6R": "0 問題なし\n1 a)1-2回の中断 b)ほんの少し遅い c)最後に振幅減少\n2 a)3-5回の中断, b)少し遅い，c)中程で振幅減少\n3 a)5回を超える中断orすくみ,b)遅い,c)最初から振幅減衰\n4 全くor殆どできない",
  "6L": "0 問題なし\n1 a)1-2回の中断 b)ほんの少し遅い c)最後に振幅減少\n2 a)3-5回の中断, b)少し遅い，c)中程で振幅減少\n3 a)5回を超える中断orすくみ,b)遅い,c)最初から振幅減衰\n4 全くor殆どできない",
  "7R": "0 問題なし\n1 a)1-2回の中断 b)ほんの少し遅い c)最後に振幅減少\n2 a)3-5回の中断, b)少し遅い，c)中程で振幅減少\n3 a)5回を超える中断orすくみ,b)遅い,c)最初から振幅減衰\n4 全くor殆どできない",
  "7L": "0 問題なし\n1 a)1-2回の中断 b)ほんの少し遅い c)最後に振幅減少\n2 a)3-5回の中断, b)少し遅い，c)中程で振幅減少\n3 a)5回を超える中断orすくみ,b)遅い,c)最初から振幅減衰\n4 全くor殆どできない",
  "8R": "0 問題なし\n1 a)1-2回の中断 b)ほんの少し遅い c)最後に振幅減少\n2 a)3-5回の中断, b)少し遅い，c)中程で振幅減少\n3 a)5回を超える中断orすくみ,b)遅い,c)最初から振幅減衰\n4 全くor殆どできない",
  "8L": "0 問題なし\n1 a)1-2回の中断 b)ほんの少し遅い c)最後に振幅減少\n2 a)3-5回の中断, b)少し遅い，c)中程で振幅減少\n3 a)5回を超える中断orすくみ,b)遅い,c)最初から振幅減衰\n4 全くor殆どできない",
  "9": "0 問題なし\n1 正常より遅い, 2回以上施行, 椅子の前方に異動\n2 肘掛けを使う\n3 肘掛けを使って2回以上, 介助は不要\n4 介助なしでは立てない",
  "10": "0 振戦なし\n1 わずかな歩行障害\n2 相当の歩行障害あるが自立\n3 杖や歩行器が必要\n4 歩けない or 人の介助が必要",
  "11": "0 振戦なし\n1 歩き始め, 方向転換時, ドアを通る際に1度立ち止まりがある\n2 歩き始め, 方向転換時, ドアを通る際に２回以上立ち止まりがある\n3 直進歩行中に一度すくむ\n4 直進歩行中に何度もすくむ",
  "12": "0 振戦なし\n1 3-5歩要するが戻れる\n2 5歩より多く要するが,助けは要らない\n3 立位は取れるが, 倒れる\n4 非常に不安定, 軽く引くと倒れる",
  "13": "0 振戦なし\n1 完全な直立ではないが, 高齢者では正常\n2 明らかな前屈,側屈があるが,姿勢を直せる\n3 随意的に姿勢を直せない\n4 極めて異常な姿勢",
  "14": "0 振戦なし\n1 全体的にわずかな緩慢\n2 軽度の緩慢\n3 中等度の緩慢\n4 重度の緩慢",
  "15R": "0 振戦なし\n1 振戦はあるが, 振幅は1cm未満\n2 振幅は1cm~3cm\n3 振幅は3cm~10cm\n4 振幅が10cm以上",
  "15L": "0 振戦なし\n1 振戦はあるが, 振幅は1cm未満\n2 振幅は1cm~3cm\n3 振幅は3cm~10cm\n4 振幅が10cm以上",
  "16R": "0 振戦なし\n1 振戦はあるが, 振幅は1cm未満\n2 振幅は1cm~3cm\n3 振幅は3cm~10cm\n4 振幅が10cm以上",
  "16L": "0 振戦なし\n1 振戦はあるが, 振幅は1cm未満\n2 振幅は1cm~3cm\n3 振幅は3cm~10cm\n4 振幅が10cm以上",
  "17RUE": "0 振戦なし\n1 振戦はあるが, 振幅は1cm未満\n2 振幅は1cm~3cm\n3 振幅は3cm~10cm\n4 振幅が10cm以上",
  "17LUE": "0 振戦なし\n1 振戦はあるが, 振幅は1cm未満\n2 振幅は1cm~3cm\n3 振幅は3cm~10cm\n4 振幅が10cm以上",
  "17RLE": "0 振戦なし\n1 振戦はあるが, 振幅は1cm未満\n2 振幅は1cm~3cm\n3 振幅は3cm~10cm\n4 振幅が10cm以上",
  "17LLE": "0 振戦なし\n1 振戦はあるが, 振幅は1cm未満\n2 振幅は1cm~3cm\n3 振幅は3cm~10cm\n4 振幅が10cm以上",
  "17Lip": "0 振戦なし\n1 振戦はあるが, 振幅は1cm未満\n2 振幅は1cm~2cm\n3 振幅は2cm~3cm\n4 振幅が3cm以上",
  "18": "0 振戦なし\n1 全ての検査時間のうち,25%以下\n2 全ての検査時間のうち,26-50%\n3 全ての検査時間のうち,51-75%\n4 全ての検査時間のうち,75%を超える",
};

const STORAGE_KEY = "updrs3_simple_v1";

function Scorer({ guest = false }) {
  const nav = useNavigate();
  const allItems = React.useMemo(
    () => FORM_ITEMS.flatMap((e) => (e.group ? e.items : [e])),
    []
  );
  const initialScores = useMemo(
    () => Object.fromEntries(allItems.map((it) => [it.id, 0])),
    [allItems]
  );
  // 現在日時を取得
  const now = new Date();
  const defaultDate = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const defaultHour = String(now.getHours()).padStart(2, "0");
  const defaultMinute = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, "0"); // 5分単位に丸める

  const [scores, setScores] = useState(initialScores);
  const totalRowRef = useRef(null);
  const [totalRowOnScreen, setTotalRowOnScreen] = useState(true);

  useEffect(() => {
    const el = totalRowRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      setTotalRowOnScreen(entry.isIntersecting);
    }, { root: null, threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // --- Supabase 接続テスト（本番/Preview 環境でも判定できる）---
  useEffect(() => {
    if (!supabase) {
      console.warn('[Supabase接続テスト] 環境変数未設定のためスキップ');
      return;
    }
    supabase
      .from('assessments')
      .select('id')
      .limit(1)
      .then(({ data, error }) => {
        console.log('[Supabase接続テスト]', { ok: !error, error, sample: data });
      })
      .catch((e) => console.log('[Supabase接続テスト]', { ok: false, error: e }));
  }, []);
  const [notes, setNotes] = useState("");
  const [pop, setPop] = useState({ open: false, id: null, text: "", x: 0, y: 0, w: 300 });
  const [userId, setUserId] = useState("");
  const [measureDate, setMeasureDate] = useState(defaultDate);
  const [measureHour, setMeasureHour] = useState(defaultHour);
  const [measureMinute, setMeasureMinute] = useState(defaultMinute);
  const [afterMinutes, setAfterMinutes] = useState("");
  const [onOffState, setOnOffState] = useState("ON"); // 現在の状態（ON/OFF）
  // --- Supabase 認証/保存 用 ---
  const [session, setSession] = useState(null);
  const [mine, setMine] = useState([]); // 自分の記録（一覧表示用）
  // --- Supabase 認証状態を監視 ---
  useEffect(() => {
    if (!supabase) return; // 環境変数未設定時は何もしない
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // --- ログイン/ログアウト関数 ---
  async function signOut() {
    await supabase.auth.signOut();
  }

  // 時刻プルダウンの選択肢
  const hourOptions = [];
  for (let h = 0; h < 24; h++) {
    hourOptions.push(String(h).padStart(2, "0"));
  }
  const minuteOptions = [];
  for (let m = 0; m < 60; m += 5) {
    minuteOptions.push(String(m).padStart(2, "0"));
  }

  // 保存/読込（ブラウザに自動保存）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { scores: s, notes: n } = JSON.parse(raw);
        if (s) setScores(s);
        if (n) setNotes(n);
      }
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ scores, notes }));
  }, [scores, notes]);

  const total = useMemo(
    () => allItems.reduce((sum, it) => sum + Number(scores[it.id] ?? 0), 0),
    [scores, allItems]
  );

  // Set score by id
  const setScore = (id, v) =>
    setScores((prev) => ({ ...prev, [id]: Number(v) }));

  const resetAll = () => {
    if (!confirm('全スコアとメモをクリアします。よろしいですか？')) return;
    setScores(initialScores);
    setNotes('');
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const handleLabelClick = (e, id) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const text = GUIDE_TEXT[id] || "この項目の説明は未設定です。GUIDE_TEXT に追記してください。";

    // --- ポップ幅をテキストに合わせて自動調整（折り返さない）---
    const measure = (t) => {
      const probe = document.createElement('div');
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      probe.style.whiteSpace = 'nowrap';
      probe.style.fontSize = '0.875rem'; // text-sm 相当
      probe.style.lineHeight = '1.25rem';
      probe.style.padding = '0px';
      probe.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
      // 最長行のみ計測
      const longest = String(t).split('\n').reduce((a, b) => (a.length >= b.length ? a : b), '');
      probe.textContent = longest || '';
      document.body.appendChild(probe);
      const w = probe.scrollWidth;
      document.body.removeChild(probe);
      return w;
    };

    const M = 8;               // 余白
    const minW = 220;          // 最小幅
    const maxW = Math.max(220, window.innerWidth - 2 * M); // 画面内に収まる上限
    const contentW = measure(text) + 40; // パディング/ボーダー分を上乗せ
    const popW = Math.min(Math.max(contentW, minW), maxW);

    // --- 位置計算（fixed：ビューポート基準）---
    let left = rect.left;
    let top  = rect.bottom + M; // ボタン直下

    const maxLeft = window.innerWidth - popW - M;
    if (left > maxLeft) left = Math.max(M, maxLeft);
    if (left < M) left = M;

    const POP_H = 240; // 想定高さ（足りなければ増やす）
    if (top + POP_H > window.innerHeight - M) {
      top = Math.max(M, rect.top - POP_H - M);
    }

    setPop({ open: true, id, text, x: left, y: top, w: popW });
  };

  // --- Supabase: 保存/自分の記録の読込 ---
    async function saveAssessment() {
      if (guest) return alert('ゲストモードでは保存できません。ログインしてください');
      if (!supabase) return alert('Supabaseの設定がされていません（.env.local / Vercel の環境変数を確認）');
      if (!session?.user) return alert("先にログインしてください");
      const measured_at = new Date(`${measureDate}T${measureHour}:${measureMinute}:00`);
      const { error } = await supabase.from('assessments').insert({
        user_id: session.user.id,
        patient_code: userId || null,
        total,
        items: scores,
        state: onOffState,
        measured_at,
        memo: notes || null,
      });
      if (error) alert(error.message); else alert("保存しました");
    }

    async function loadMine() {
      if (!supabase) return alert('Supabaseの設定がされていません（.env.local / Vercel の環境変数を確認）');
      if (!session?.user) return alert("先にログインしてください");
      const { data, error } = await supabase
        .from('assessments')
        .select('id, created_at, patient_code, total, state, measured_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) alert(error.message); else setMine(data ?? []);
    }

  // CSVエクスポート関数（BOM付きUTF-8、項目を行に）
  const handleExportCSV = () => {
    // ヘッダー
    const headers = ["項目名", "スコア"];
    // 各項目を行に
    const rows = FORM_ITEMS.flatMap((entry) => {
      if (entry.group) {
        return entry.items.map((it) => [
          `${entry.label} ${it.label}`,
          scores[it.id] ?? "",
        ]);
      }
      return [[entry.label, scores[entry.id] ?? ""]];
    });
    // 追加情報（ID, 日付, 時刻, 状態, 服薬後, 合計, メモ）も行で追加
    rows.unshift(["ID", userId]);
    rows.unshift(["日付", measureDate]);
    rows.unshift(["時刻", `${measureHour}:${measureMinute}`]);
    rows.unshift(["状態(ON/OFF)", onOffState]);
    rows.unshift(["服薬後(分)", afterMinutes]);
    rows.push(["合計", total]);
    rows.push(["メモ", notes.replace(/\r?\n/g, " ")]);
    // CSV文字列生成
    const csv = [headers, ...rows].map(arr =>
      arr.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ).join("\r\n");
    // BOM付きでダウンロード
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `updrs3_${measureDate}_${userId || "noid"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-5xl mx-auto p-6 pt-20">
        {/* タイトル */}
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center">UPDRS Part III（簡易版）</h1>
        <p className="text-xs text-gray-500 mb-6 text-center">
          個人/教育目的のプロトタイプです
        </p>
        {/* ID・日付・測定時刻・服薬後・エクスポートボタン */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">ID</label>
            <input
              type="text"
              className="border rounded-lg px-2 py-1 text-sm w-28"
              placeholder="ID入力"
              value={userId}
              onChange={e => setUserId(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">日付</label>
            <input
              type="date"
              className="border rounded-lg px-2 py-1 text-sm"
              value={measureDate}
              onChange={e => setMeasureDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">測定時刻</label>
            <select
              className="border rounded-lg px-2 py-1 text-sm"
              value={measureHour}
              onChange={e => setMeasureHour(e.target.value)}
            >
              {hourOptions.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span className="text-xs">時</span>
            <select
              className="border rounded-lg px-2 py-1 text-sm"
              value={measureMinute}
              onChange={e => setMeasureMinute(e.target.value)}
            >
              {minuteOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <span className="text-xs">分</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">状態</label>
            <select
              className="border rounded-lg px-2 py-1 text-sm w-24"
              value={onOffState}
              onChange={(e) => setOnOffState(e.target.value)}
            >
              <option value="ON">ON</option>
              <option value="OFF">OFF</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">服薬後</label>
            <input
              type="number"
              min="0"
              className="border rounded-lg px-2 py-1 text-sm w-16"
              placeholder="分"
              value={afterMinutes}
              onChange={e => setAfterMinutes(e.target.value)}
            />
            <span className="text-xs text-gray-500">分</span>
          </div>
          <button
            type="button"
            className="px-3 py-2 rounded-xl bg-white border hover:bg-gray-50 text-sm"
            onClick={handleExportCSV}
          >
            CSVエクスポート
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-xl bg-white border hover:bg-gray-50 text-sm"
            onClick={resetAll}
          >
            リセット
          </button>
        </div>

        {/* 認証＆保存 操作バー（Magic Link は使わない） */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
          {guest ? (
            <div className="text-sm text-gray-600">
              ゲストモードで利用中：保存や記録の閲覧はできません。<br className="sm:hidden" />
              ログインすると Supabase に保存できます。
            </div>
          ) : session ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-600 truncate max-w-[200px]">{session.user.email}</span>
              <button className="px-3 py-2 rounded bg-white border" onClick={signOut}>ログアウト</button>
              <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={saveAssessment}>保存</button>
              <button className="px-3 py-2 rounded bg-white border" onClick={loadMine}>自分の記録</button>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-600">保存にはログインが必要です。</span>
              <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => nav('/')}>ログインへ</button>
            </div>
          )}
        </div>

        {/* 合計 & メモ */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div ref={totalRowRef} className="rounded-2xl bg-white p-4 shadow">
            <div className="text-sm text-gray-500">合計</div>
            <div className="text-3xl font-bold">{total}</div>
          </div>
          <div className="sm:col-span-2 rounded-2xl bg-white p-4 shadow">
            <div className="text-sm text-gray-500 mb-1">メモ（測定のコツ・条件など）</div>
            <textarea
              className="w-full min-h-[80px] border rounded-xl px-3 py-2"
              placeholder="例：内服後◯分ON、計測順、転倒リスクなど"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* 一覧 */}
        <div className="rounded-2xl bg-white shadow overflow-hidden">
          <table className="w-full text-sm table-auto">
            <thead className="bg-gray-100 hidden md:table-header-group">
              <tr>
                <th className="w-14 px-2 py-2 text-left text-xs text-gray-500">ID</th>
                <th className="px-2 py-2 text-left">項目</th>
                <th className="md:w-[360px] px-2 py-2 text-left">スコア</th>
              </tr>
            </thead>
            <tbody>
              {FORM_ITEMS.map((entry) => {
                if (!entry.group) {
                  const it = entry;
                  return (
                    <tr key={it.id} className="border-t">
                      <td className="px-2 py-2 font-mono text-xs text-gray-500 whitespace-nowrap align-top">{it.id}</td>
                      <td colSpan={2} className="p-3 align-top">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="text-gray-900 text-base leading-6 flex items-center gap-2">
                            <span>{it.label}</span>
                            <button
                              onClick={(e) => handleLabelClick(e, it.id)}
                              className="text-[10px] px-2 py-0.5 rounded-full border bg-gray-50 border-gray-300 text-gray-700"
                            >
                              説明
                            </button>
                          </div>
                          <div className="grid grid-cols-5 gap-2 w-full sm:w-auto">
                            {[0,1,2,3,4].map((n)=>(
                              <button
                                key={n}
                                onClick={()=>setScore(it.id,n)}
                                className={`py-2 rounded-lg border text-sm w-full ${
                                  Number(scores[it.id]??-1)===n
                                  ? "bg-blue-500 text-white border-blue-500"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }
                // グループ項目
                return (
                  <React.Fragment key={entry.id}>
                    {/* 大項目 */}
                    <tr key={entry.id} className="border-t">
                      <td className="px-2 py-2 font-mono text-xs text-gray-500 whitespace-nowrap align-top">{entry.number}</td>
                      <td className="px-2 py-2 align-top" colSpan={2}>
                        <div className="text-gray-900 text-base leading-6 flex items-center gap-2">
                          <span>{entry.label}</span>
                          <button
                            type="button"
                            className="text-[10px] px-2 py-0.5 rounded-full border bg-gray-50 border-gray-300 text-gray-700"
                            onClick={(e) => handleLabelClick(e, entry.items[0].id)}
                            aria-label={`${entry.label} の説明を表示`}
                          >
                            説明
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* サブ項目（小文字・薄文字、flex+gridボタン） */}
                    {entry.items.map((it) => (
                      <tr key={it.id}>
                        <td className="px-2 py-2 font-mono text-xs text-gray-500 whitespace-nowrap align-top">{it.id}</td>
                        <td colSpan={2} className="p-3 align-top">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="text-xs text-gray-500">{it.label}</div>
                            <div className="grid grid-cols-5 gap-2 w-full sm:w-auto">
                              {[0,1,2,3,4].map((n)=>(
                                <button
                                  key={n}
                                  onClick={()=>setScore(it.id,n)}
                                  className={`py-2 rounded-lg border text-sm w-full ${
                                    Number(scores[it.id]??-1)===n
                                    ? "bg-blue-500 text-white border-blue-500"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 自分の記録（最新50件） */}
        {mine.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white p-4 shadow">
            <div className="font-semibold mb-2">自分の記録（最新50件）</div>
            <ul className="space-y-1 text-sm">
              {mine.map((r) => (
                <li key={r.id} className="flex justify-between border-b py-1">
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                  <span className="text-gray-600">合計 {r.total} / 状態 {r.state || '-'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 簡単な運用メモ（解説の雛形） */}
        <section className="mt-6 rounded-2xl bg-white p-4 shadow">
          <h2 className="font-semibold mb-2">測定時の注意事項</h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>全身の自動運動や安静時振戦の項目は、すべての検査を通して得られる</li>
            <li>左検査中にジスキネジアがあったなら，検査に影響したかどうかを明記する</li>
          </ul>
        </section>
      </div>

      {/* 説明ポップオーバー（読み取り専用） */}
      {pop.open && (
        <>
          {/* 画面全体のオーバーレイ：ここをクリックしたら閉じる */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setPop((p) => ({ ...p, open: false }))}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed z-50 rounded-xl border bg-white p-3 shadow-lg"
            style={{ top: pop.y, left: pop.x, width: pop.w, maxWidth: `calc(100vw - 16px)` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 text-xs font-semibold text-gray-600">測定方法</div>
            <pre className="m-0 whitespace-pre text-sm leading-relaxed text-gray-800">{pop.text}</pre>
            <div className="mt-3 text-right">
              <button
                type="button"
                onClick={() => setPop((p) => ({ ...p, open: false }))}
                className="text-xs px-2 py-1 rounded-lg border hover:bg-gray-50"
              >
                閉じる
              </button>
            </div>
          </div>
        </>
      )}
    { !totalRowOnScreen && (
      <div className="fixed top-6 left-6 z-40">
        <div className="rounded-2xl bg-white p-5 shadow border">
          <div className="text-sm text-gray-500">合計</div>
          <div className="text-3xl font-bold">{total}</div>
        </div>
      </div>
    )}
    </div>
  );
}


// ルーティングの枠（AppRoutesをHashRouterでラップする新しいApp）
function AppRoutes() {
  const [session, setSession] = useState(null);
  const [guest, setGuest] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ゲストモード初期化（localStorageから）
  useEffect(() => {
    try {
      const g = localStorage.getItem('guest_mode');
      setGuest(g === '1');
    } catch {}
  }, []);

  function enterGuest() {
    try { localStorage.setItem('guest_mode', '1'); } catch {}
    setGuest(true);
    navigate('/app');
  }

  function exitGuest() {
    try { localStorage.removeItem('guest_mode'); } catch {}
    setGuest(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link to="/" className="font-bold">UPDRS3</Link>
          <nav className="flex items-center gap-4 text-sm">
            <NavLink to="/app"     className={({isActive})=> isActive ? 'text-blue-600' : 'text-gray-600'}>入力</NavLink>
            <NavLink to="/records" className={({isActive})=> isActive ? 'text-blue-600' : 'text-gray-600'}>記録</NavLink>
            {guest && <span className="px-2 py-0.5 text-xs border rounded-full text-gray-600">ゲスト</span>}
            {!session
              ? <NavLink to="/" className={({isActive})=> isActive ? 'text-blue-600' : 'text-gray-600'}>ログイン</NavLink>
              : <button onClick={()=>{exitGuest(); supabase?.auth.signOut();}} className="text-gray-600">ログアウト</button>}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        <Routes>
          {/* 最初はログイン画面のみ */}
          <Route path="/" element={<Login onGuest={enterGuest} />} />

          {/* 入力（スコアラー） */}
          <Route path="/app" element={<Scorer guest={guest} />} />

          {/* 記録（ログイン必須） */}
          <Route path="/records" element={<RequireAuth session={session}><Records /></RequireAuth>} />
          <Route path="/records/:id" element={<RequireAuth session={session}><RecordDetail /></RequireAuth>} />

          {/* 不明URLは / へ */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}

// ログイン必須のガード
function RequireAuth({ session, children }) {
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

/* ======= ここから：追加ページ（シンプル版） ======= */

function Login({ onGuest }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { if (data.session) nav('/app', { replace: true }); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (s) nav('/app', { replace: true }); });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  async function signInWithPassword() {
    if (!supabase) return alert('Supabase未設定');
    if (!email || !password) return alert('メールとパスワードを入力してください');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) alert(error.message);
  }

  async function signUp() {
    if (!supabase) return alert('Supabase未設定');
    if (!email || !password) return alert('メールとパスワードを入力してください');
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) return alert(error.message);
    if (data.session) nav('/app', { replace: true });
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl p-6 shadow">
      <h2 className="text-xl font-semibold mb-1 text-center">ログイン</h2>
      <p className="text-xs text-gray-500 mb-4 text-center">データ保存にはログインが必要です。ゲストは保存できません。</p>

      <label className="block text-sm mb-1">メール</label>
      <input
        type="email"
        className="w-full border rounded px-3 py-2 mb-3"
        placeholder="you@example.com"
        value={email}
        onChange={e=>setEmail(e.target.value)}
      />

      <label className="block text-sm mb-1">パスワード</label>
      <input
        type="password"
        className="w-full border rounded px-3 py-2 mb-4"
        placeholder="8文字以上"
        value={password}
        onChange={e=>setPassword(e.target.value)}
      />

      <div className="flex gap-2">
        <button disabled={busy} onClick={signInWithPassword} className="flex-1 px-4 py-2 rounded bg-blue-600 text-white">ログイン</button>
        <button disabled={busy} onClick={signUp} className="px-4 py-2 rounded border">新規登録</button>
      </div>

      <div className="mt-6 text-center">
        <button type="button" onClick={onGuest} className="px-4 py-2 rounded border text-gray-700 w-full">ゲストとして使う（保存なし）</button>
      </div>
    </div>
  );
}

// /records （一覧）
function Records() {
  const [rows, setRows] = useState([]);
  useEffect(()=>{
    if (!supabase) return;
    supabase.from('assessments')
      .select('id, created_at, total, state, patient_code')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({data, error})=>{
        if (error) alert(error.message);
        else setRows(data ?? []);
      });
  },[]);
  return (
    <div className="bg-white rounded-2xl p-4 shadow">
      <h2 className="font-semibold mb-3">自分の記録</h2>
      <ul className="divide-y">
        {rows.map(r=>(
          <li key={r.id} className="py-2 flex items-center justify-between">
            <div>
              <div className="text-sm">{new Date(r.created_at).toLocaleString()}</div>
              <div className="text-xs text-gray-500">合計 {r.total} / 状態 {r.state || '-'} / ID {r.patient_code || '-'}</div>
            </div>
            <Link to={`/records/${r.id}`} className="text-blue-600 text-sm">詳細</Link>
          </li>
        ))}
        {rows.length===0 && <li className="py-6 text-center text-gray-500">まだ記録がありません</li>}
      </ul>
    </div>
  );
}

// /records/:id （詳細）
function RecordDetail() {
  const { id } = useParams();
  const [rec, setRec] = useState(null);

  useEffect(()=>{
    if (!supabase || !id) return;
    supabase.from('assessments').select('*').eq('id', id).single()
      .then(({data, error})=>{
        if (error) alert(error.message);
        else setRec(data);
      });
  },[id]);

  if (!rec) return <div className="text-gray-500">読み込み中…</div>;

  const items = rec.items || {};
  return (
    <div className="bg-white rounded-2xl p-4 shadow">
      <h2 className="font-semibold mb-3">記録詳細</h2>
      <div className="text-sm text-gray-600 mb-2">
        実施 {new Date(rec.measured_at ?? rec.created_at).toLocaleString()} / 合計 {rec.total} / 状態 {rec.state || '-'} / ID {rec.patient_code || '-'}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr><th className="text-left p-2">項目</th><th className="text-left p-2">スコア</th></tr>
        </thead>
        <tbody>
          {Object.entries(items).map(([k,v])=>(
            <tr key={k} className="border-t">
              <td className="p-2">{k}</td>
              <td className="p-2">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rec.memo && (
        <div className="mt-4">
          <div className="text-xs text-gray-500 mb-1">メモ</div>
          <div className="whitespace-pre-wrap text-sm">{rec.memo}</div>
        </div>
      )}
    </div>
  );
}