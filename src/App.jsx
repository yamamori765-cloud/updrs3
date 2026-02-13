import React, { useEffect, useMemo, useRef, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import QRCode from "qrcode";
import { FORM_ITEMS } from "./constants/formItems";
import { GUIDE_TEXT } from "./constants/guideText";
import { supabase } from "./lib/supabase";

/** localStorage キー（スコア・メモの自動保存） */
const STORAGE_KEY = "updrs3_simple_v1";

/** 0–4 のスコアボタン（単体・グループ共通） */
function ScoreButtons({ itemId, score, setScore }) {
  const current = Number(score ?? -1);
  return (
    <div className="w-full grid grid-cols-5 gap-2 sm:flex sm:flex-nowrap sm:gap-2 sm:justify-end">
      {[0, 1, 2, 3, 4].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => setScore(itemId, n)}
          className={`py-2 rounded-lg border text-sm w-full sm:w-12 md:w-14 lg:w-16 ${
            current === n
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

/** テキスト幅を計測してポップオーバー位置・幅を算出 */
function getPopoverLayout(text, rect) {
  const measure = (t) => {
    const probe = document.createElement("div");
    Object.assign(probe.style, {
      position: "absolute",
      visibility: "hidden",
      whiteSpace: "nowrap",
      fontSize: "0.875rem",
      lineHeight: "1.25rem",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
    });
    const longest = String(t).split("\n").reduce((a, b) => (a.length >= b.length ? a : b), "");
    probe.textContent = longest || "";
    document.body.appendChild(probe);
    const w = probe.scrollWidth;
    document.body.removeChild(probe);
    return w;
  };
  const M = 8;
  const minW = 220;
  const maxW = Math.max(220, window.innerWidth - 2 * M);
  const contentW = measure(text) + 40;
  const w = Math.min(Math.max(contentW, minW), maxW);
  let left = rect.left;
  let top = rect.bottom + M;
  if (left > window.innerWidth - w - M) left = Math.max(M, window.innerWidth - w - M);
  if (left < M) left = M;
  const POP_H = 240;
  if (top + POP_H > window.innerHeight - M) top = Math.max(M, rect.top - POP_H - M);
  return { x: left, y: top, w };
}

const CRLF = "\r\n";

function Scorer() {
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
  const [qrOpen, setQrOpen] = useState(false);
  const [qrImages, setQrImages] = useState([]);
  const [qrText, setQrText] = useState("");
  const [userId, setUserId] = useState("");
  const [measureDate, setMeasureDate] = useState(defaultDate);
  const [measureHour, setMeasureHour] = useState(defaultHour);
  const [measureMinute, setMeasureMinute] = useState(defaultMinute);
  const [afterMinutes, setAfterMinutes] = useState("");
  const [onOffState, setOnOffState] = useState("ON"); // 現在の状態（ON/OFF）
  // --- Supabase 認証/保存 用 ---
  const [session, setSession] = useState(null);
  const [mine, setMine] = useState([]); // 自分の記録（一覧表示用）
  // --- Supabase 認証（ログイン不要：匿名で自動サインイン）---
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session ?? null;
      setSession(s);
      if (!s) supabase.auth.signInAnonymously().catch(() => {});
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0")), []);
  const minuteOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")), []);

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
    const text = GUIDE_TEXT[id] ?? "この項目の説明は未設定です。";
    const { x, y, w } = getPopoverLayout(text, rect);
    setPop({ open: true, id, text, x, y, w });
  };

  async function saveAssessment() {
    if (!supabase) return alert("Supabaseの設定がされていません（.env を確認）");
    if (!session?.user) return alert("保存の準備ができていません。しばらく待ってから再度お試しください。");
    const measured_at = new Date(`${measureDate}T${measureHour}:${measureMinute}:00`);
    const { error } = await supabase.from("assessments").insert({
      user_id: session.user.id,
      patient_code: userId || null,
      total,
      items: scores,
      state: onOffState,
      measured_at,
      memo: notes || null,
    });
    if (error) alert(error.message);
    else alert("保存しました");
  }

  async function loadMine() {
    if (!supabase) return alert("Supabaseの設定がされていません（.env を確認）");
    if (!session?.user) return alert("準備ができていません。しばらく待ってから再度お試しください。");
    const { data, error } = await supabase
      .from("assessments")
      .select("id, created_at, patient_code, total, state, measured_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) alert(error.message);
    else setMine(data ?? []);
  }

  /** 現在の入力内容を日本語・改行付きテキストにまとめる（QRコード・電子カルテ用・Windows対応CRLF） */
  const buildQrPayload = () => {
    const lines = [
      `日付: ${measureDate}`,
      `時間: ${measureHour}:${measureMinute}`,
      `合計: ${total}`,
      "",
      "【項目スコア】",
    ];

    // 項目スコア（重複部分はグループ名でまとめる）
    FORM_ITEMS.forEach((entry) => {
      if (entry.group) {
        lines.push(`${entry.label}:`);
        entry.items.forEach((it) => {
          lines.push(`  ${it.label.trim()}: ${scores[it.id] ?? 0}`);
        });
      } else {
        lines.push(`${entry.label}: ${scores[entry.id] ?? 0}`);
      }
    });

    return lines.join(CRLF);
  };

  /** QRコードを生成してモーダル表示 */
  const handleShowQR = async () => {
    const text = buildQrPayload();
    try {
      if (!text) {
        alert("QRコード化するデータがありません。スコアを入力してください。");
        return;
      }

      // テキストを4分割の連結QRにする（できるだけ均等な長さで4つまで）
      const totalLen = text.length;
      const chunkSize = Math.ceil(totalLen / 4);
      const segments = [];
      for (let i = 0; i < 4; i++) {
        const start = i * chunkSize;
        if (start >= totalLen) break;
        const end = Math.min(start + chunkSize, totalLen);
        segments.push(text.slice(start, end));
      }

      const urls = await Promise.all(
        segments.map((seg) => QRCode.toDataURL(seg, { width: 280, margin: 2 }))
      );

      setQrText(text);
      setQrImages(urls);
      setQrOpen(true);
    } catch (e) {
      alert("QRコードの生成に失敗しました: " + (e.message || e));
    }
  };

  /** テキストをコピー（BOM付きUTF-8でWindowsの文字化けを防止） */
  const handleCopyQrText = () => {
    const BOM = "\uFEFF";
    navigator.clipboard.writeText(BOM + qrText).then(() => alert("テキストをコピーしました（UTF-8 BOM付き）"));
  };

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
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center">UPDRS Part III</h1>
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
            onClick={handleShowQR}
          >
            QRコード生成
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-xl bg-white border hover:bg-gray-50 text-sm"
            onClick={resetAll}
          >
            リセット
          </button>
        </div>

        {/* 保存・自分の記録（Supabase 設定時のみ・ログイン不要） */}
        {supabase && (
          <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
            <button
              className="px-3 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
              onClick={saveAssessment}
              disabled={!session?.user}
            >
              保存
            </button>
            <button
              className="px-3 py-2 rounded bg-white border disabled:opacity-50"
              onClick={loadMine}
              disabled={!session?.user}
            >
              自分の記録
            </button>
            {!session?.user && (
              <span className="text-xs text-gray-500">準備中…</span>
            )}
          </div>
        )}

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
                <th className="w-10 px-1 py-2 text-left text-xs text-gray-500">ID</th>
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
                      <td className="px-1 py-2 font-mono text-xs text-gray-400 whitespace-nowrap align-top text-center">{entry.group ? entry.number : it.id}</td>
                      <td colSpan={2} className="p-3 align-top">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="text-gray-900 text-base leading-6 flex items-center gap-2 whitespace-nowrap">
                            <span>{it.label}</span>
                            <button
                              onClick={(e) => handleLabelClick(e, it.id)}
                              className="text-[10px] px-2 py-0.5 rounded-full border bg-gray-50 border-gray-300 text-gray-700 shrink-0"
                            >
                              説明
                            </button>
                          </div>
                          <ScoreButtons itemId={it.id} score={scores[it.id]} setScore={setScore} />
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
                      <td className="px-1 py-2 font-mono text-xs text-gray-400 whitespace-nowrap align-top text-center">{entry.number}</td>
                      <td className="px-2 py-2 align-top" colSpan={2}>
                        <div className="text-gray-900 text-base leading-6 flex items-center gap-2 whitespace-nowrap">
                          <span>{entry.label}</span>
                          <button
                            type="button"
                            className="text-[10px] px-2 py-0.5 rounded-full border bg-gray-50 border-gray-300 text-gray-700 shrink-0"
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
                        <td className="px-1 py-2 font-mono text-xs text-gray-400 whitespace-nowrap align-top text-center"></td>
                        <td colSpan={2} className="p-3 align-top">
                          <div className="flex items-center justify-between gap-2 whitespace-nowrap">
                            <div className="text-xs text-gray-500">{it.label}</div>
                            <ScoreButtons itemId={it.id} score={scores[it.id]} setScore={setScore} />
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
            <li>全身の自動運動や安静時振戦の項目は、すべての検査を通して観察する</li>
            <li>検査中にジスキネジアがあったなら，検査に影響したかどうかを記載する</li>
          </ul>
        </section>
      </div>

      {/* QRコードモーダル */}
      {qrOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setQrOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="QRコード"
            className="fixed left-1/2 top-1/2 z-50 w-[min(90vw,360px)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white p-4 shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-center font-semibold text-gray-800">
              QRコード（評価データ・連結QR）
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-3">
                {qrImages.map((src, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div className="text-xs text-gray-500">
                      連結QR {idx + 1}/{qrImages.length}
                    </div>
                    <img
                      src={src}
                      alt={`UPDRS3 評価データのQRコード ${idx + 1}/${qrImages.length}`}
                      className="rounded-lg"
                    />
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-1 text-xs text-gray-500">
                  QRの内容（日本語・改行付き・Windows用CRLF）
                </div>
                <textarea
                  readOnly
                  className="w-full rounded-lg border bg-gray-50 p-2 text-xs font-mono whitespace-pre"
                  rows={10}
                  value={qrText}
                />
                <button
                  type="button"
                  className="mt-2 w-full rounded-lg border bg-gray-100 py-2 text-sm hover:bg-gray-200"
                  onClick={handleCopyQrText}
                >
                  テキストをコピー（BOM付きUTF-8）
                </button>
              </div>
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-xl border bg-gray-100 py-2 text-sm hover:bg-gray-200"
              onClick={() => setQrOpen(false)}
            >
              閉じる
            </button>
          </div>
        </>
      )}

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


// ルーティングの枠（ログインなしシンプル版）
function AppRoutes() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-5xl mx-auto p-4">
        <Routes>
          <Route path="/" element={<Scorer />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
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