import { useEffect, useMemo, useState } from "react";

/**
 * UPDRS Part III – 簡易スコアラー（著作権テキストは未掲載）
 * - 0–4ボタン（選択中は青）
 * - 一覧表示＆合計
 * - メモ（測定条件やコツ）をローカル保存
 */

const ITEMS = [
  { id: "18",     label: "言語" },
  { id: "19",     label: "表情" },
  { id: "20F",    label: "安静時振戦　顔面" },
  { id: "20RUE",  label: "安静時振戦　右上肢" },
  { id: "20LUE",  label: "安静時振戦　左上肢" },
  { id: "20RLE",  label: "安静時振戦　右下肢" },
  { id: "20LLE",  label: "安静時振戦　左下肢" },
  { id: "21R",    label: "動作時振戦　右上肢" },
  { id: "21L",    label: "動作時振戦　左上肢" },
  { id: "22Neck", label: "筋強剛　頸部" },
  { id: "22RUE",  label: "筋強剛　右上肢" },
  { id: "22LUE",  label: "筋強剛　左上肢" },
  { id: "22RLE",  label: "筋強剛　右下肢" },
  { id: "22LLE",  label: "筋強剛　左下肢" },
  { id: "23R",    label: "タッピング　右" },
  { id: "23L",    label: "タッピング　左" },
  { id: "24R",    label: "手の運動　右" },
  { id: "24L",    label: "手の運動　左" },
  { id: "25R",    label: "回外・回内　右" },
  { id: "25L",    label: "回外・回内　左" },
  { id: "26R",    label: "下肢の敏捷性　右" },
  { id: "26L",    label: "下肢の敏捷性　左" },
  { id: "27",     label: "椅子からの立ち上がり" },
  { id: "28",     label: "姿勢" },
  { id: "29",     label: "歩行" },
  { id: "30",     label: "姿勢の安定性" },
  { id: "31",     label: "動作緩慢・運動減少" },
];

/** 固定の測定方法テキスト（編集不可の説明用） */
const GUIDE_TEXT = {
  "18": "0 正常\n1 表現，用語，声量に軽度の障害がある\n2 中等度の障害，単調で不明瞭だが理解可能\n3 高度の障害，離開が困難\n4 理解不能",
  "19": "0 正常\n1 わずかに表情が乏しく，ポーカーフェイス\n2 軽度だが明らかな表情の乏しさ\n3 中等度の表情の乏しさ，口を閉じていない時がある\n4 仮面用で，ほとんど表情がない．口は0.6cm以上開いている",
  "20F": "0 なし\n1 わずかな振戦がたまに見られる\n2 軽度の振戦が持続 or 中等度の振戦が時々\n3 中等度の振戦が大部分出現\n4 高度の振戦が大部分出現",
  "20RUE": "0 なし\n1 わずかな振戦がたまに見られる\n2 軽度の振戦が持続 or 中等度の振戦が時々\n3 中等度の振戦が大部分出現\n4 高度の振戦が大部分出現",
  "20LUE": "0 なし\n1 わずかな振戦がたまに見られる\n2 軽度の振戦が持続 or 中等度の振戦が時々\n3 中等度の振戦が大部分出現\n4 高度の振戦が大部分出現",
  "20RLE": "0 なし\n1 わずかな振戦がたまに見られる\n2 軽度の振戦が持続 or 中等度の振戦が時々\n3 中等度の振戦が大部分出現\n4 高度の振戦が大部分出現",
  "20LLE": "0 なし\n1 わずかな振戦がたまに見られる\n2 軽度の振戦が持続 or 中等度の振戦が時々\n3 中等度の振戦が大部分出現\n4 高度の振戦が大部分出現",
  "21R": "0 なし\n1 軽度で動作に伴う\n2 中等度で動作に伴う\n3 中等度で動作時，姿勢保持時に起こる\n4 高度で食事動作が障害される",
  "21L": "0 なし\n1 軽度で動作に伴う\n2 中等度で動作に伴う\n3 中等度で動作時，姿勢保持時に起こる\n4 高度で食事動作が障害される",
  "22Neck": "0 なし\n1 軽微 or 誘発できる程度\n2 軽微ないし中等度\n3 高度だが関節可動域は正常\n4 著明で，関節可動域に制限あり",
  "22RUE": "0 なし\n1 軽微 or 誘発できる程度\n2 軽微ないし中等度\n3 高度だが関節可動域は正常\n4 著明で，関節可動域に制限あり",
  "22LUE": "0 なし\n1 軽微 or 誘発できる程度\n2 軽微ないし中等度\n3 高度だが関節可動域は正常\n4 著明で，関節可動域に制限あり",
  "22RLE": "0 なし\n1 軽微 or 誘発できる程度\n2 軽微ないし中等度\n3 高度だが関節可動域は正常\n4 著明で，関節可動域に制限あり",
  "22LLE": "0 なし\n1 軽微 or 誘発できる程度\n2 軽微ないし中等度\n3 高度だが関節可動域は正常\n4 著明で，関節可動域に制限あり",
  "23R": "0 正常\n1 やや遅いか，振幅が小さい\n2 中等度の障害で疲れやすい，時々止まる\n3 高度，開始時にしばしばすくむ，動作中に止まる\n4 ほとんどできない",
  "23L": "0 正常\n1 やや遅いか，振幅が小さい\n2 中等度の障害で疲れやすい，時々止まる\n3 高度，開始時にしばしばすくむ，動作中に止まる\n4 ほとんどできない",
  "24R": "0 正常\n1 少し遅い or 振幅が小さい\n2 中等度，すぐ疲れる，ときに止まる\n3 高度，開始時にしばしばすくむ，運動が止まる\n4 ほとんどできない",
  "24L": "0 正常\n1 少し遅い or 振幅が小さい\n2 中等度，すぐ疲れる，ときに止まる\n3 高度，開始時にしばしばすくむ，運動が止まる\n4 ほとんどできない",
  "25R": "0 正常\n1 少し遅い or 振幅が小さい\n2 中等度，すぐ疲れる，ときに止まる\n3 高度，開始時にしばしばすくむ，運動が止まる\n4 ほとんどできない",
  "25L": "0 正常\n1 少し遅い or 振幅が小さい\n2 中等度，すぐ疲れる，ときに止まる\n3 高度，開始時にしばしばすくむ，運動が止まる\n4 ほとんどできない",
  "26R": "0 正常\n1 少し遅い or 振幅が小さい\n2 中等度，すぐ疲れる，ときに止まる\n3 高度，開始時にしばしばすくむ，運動が止まる\n4 ほとんどできない",
  "26L": "0 正常\n1 少し遅い or 振幅が小さい\n2 中等度，すぐ疲れる，ときに止まる\n3 高度，開始時にしばしばすくむ，運動が止まる\n4 ほとんどできない",
  "27": "0 正常\n1 遅い or 一度でうまくいかない\n2 肘掛けに腕をつく必要がある\n3 複数回，椅子に倒れ込むことがあるが，介助はいらない\n4 介助なしでは立ち上がれない",
  "28": "0 正常\n1 軽度の前屈，高齢者なら正常\n2 中等度の前屈で異常，一側にやや傾くことも\n3 高度の前屈，亀背を伴う，一側に中等度傾くことも\n4 高度の前屈，極端に異常",
  "29": "0 正常\n1 歩行干満，小刻みで引きずることもあるが，加速や突進はない\n2 歩行は困難だが介助なし，加速や突進あり\n3 高度の障害で介助を要する\n4 介助でも歩行できない",
  "30": "0 正常\n1 後方突進があるが，立ち直れる\n2 後方突進で倒れてしまう\n3 不安手で自然にバランスを失う\n4 介助無しで立てない",
  "31": "0 正常\n1 わずかに緩慢，人によっては正常，振幅がやや小さいことも\n2 軽度，運動量が低下，運動の大きさがやや低下\n3 中等度，中等度に運動量，運動の大きさが低下\n4 高度，高度に運動量，運動の大きさが低下",
};

const STORAGE_KEY = "updrs3_simple_v1";

export default function App() {
  // 現在日時を取得
  const now = new Date();
  const defaultDate = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const defaultHour = String(now.getHours()).padStart(2, "0");
  const defaultMinute = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, "0"); // 5分単位に丸める

  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState("");
  const [pop, setPop] = useState({ open: false, id: null, text: "", x: 0, y: 0 });
  const [userId, setUserId] = useState("");
  const [measureDate, setMeasureDate] = useState(defaultDate);
  const [measureHour, setMeasureHour] = useState(defaultHour);
  const [measureMinute, setMeasureMinute] = useState(defaultMinute);
  const [afterMinutes, setAfterMinutes] = useState("");

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
    () => ITEMS.reduce((sum, it) => sum + Number(scores[it.id] ?? 0), 0),
    [scores]
  );

  // Set score by id
  const setScore = (id, v) =>
    setScores((prev) => ({ ...prev, [id]: Number(v) }));

  const resetAll = () => {
    if (!confirm("全スコアとメモをクリアします。よろしいですか？")) return;
    setScores({});
    setNotes("");
  };

  const handleLabelClick = (e, id) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const text = GUIDE_TEXT[id] || "この項目の説明は未設定です。GUIDE_TEXT に追記してください。";

    const POP_W = 300;
    const POP_H = 220;
    const M = 8;

    let left = rect.left;
    let top  = rect.bottom + M;

    const maxLeft = window.innerWidth - POP_W - M;
    if (left > maxLeft) left = Math.max(M, maxLeft);
    if (left < M) left = M;
    if (top + POP_H > window.innerHeight - M) {
      top = Math.max(M, rect.top - POP_H - M);
    }
    setPop({ open: true, id, text, x: left, y: top });
  };

  // CSVエクスポート関数（BOM付きUTF-8、項目を行に）
  const handleExportCSV = () => {
    // ヘッダー
    const headers = ["項目名", "スコア"];
    // 各項目を行に
    const rows = ITEMS.map(it => [
      it.label,
      scores[it.id] ?? ""
    ]);
    // 追加情報（ID, 日付, 時刻, 服薬後, 合計, メモ）も行で追加
    rows.unshift(["ID", userId]);
    rows.unshift(["日付", measureDate]);
    rows.unshift(["時刻", `${measureHour}:${measureMinute}`]);
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
      <div className="max-w-5xl mx-auto p-6">
        {/* タイトル */}
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center">UPDRS Part III（簡易版）</h1>
        <p className="text-xs text-gray-500 mb-6 text-center">
          個人/教育目的のプロトタイプ。。
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
        </div>

        {/* 合計 & メモ */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow">
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
          <table className="w-full text-sm table-fixed">
            <thead className="bg-gray-100">
              <tr>
                <th className="w-12 px-2 py-2 text-left text-xs text-gray-500">ID</th>
                <th className="px-2 py-2 text-left">項目</th>
                <th className="w-[320px] px-2 py-2 text-left">スコア</th>
              </tr>
            </thead>
            <tbody>
              {ITEMS.map((it) => {
                return (
                  <tr key={it.id} className="border-t">
                    <td className="px-2 py-2 font-mono text-xs text-gray-500 whitespace-nowrap">{it.id}</td>
                    <td className="px-2 py-2">
                      <span className="text-gray-900">{it.label}</span>
                      <button
                        type="button"
                        className="ml-2 inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 focus:outline-none no-underline"
                        onClick={(e) => handleLabelClick(e, it.id)}
                        aria-label={`${it.label} の説明を表示`}
                      >
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-gray-50 border-gray-300 text-gray-700">説明</span>
                      </button>
                    </td>
                    <td className="px-2 py-2">
                      <div className="overflow-x-auto md:overflow-visible">
                        <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                          {[0, 1, 2, 3, 4].map((n) => {
                            const selected = Number(scores[it.id] ?? -1) === n;
                            return (
                              <button
                                key={n}
                                onClick={() => setScore(it.id, n)}
                                className={
                                  "w-12 text-center px-2 py-2 border rounded-lg transition-colors duration-200 text-sm " +
                                  (selected
                                    ? "bg-blue-500 text-white border-blue-500"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100")
                                }
                                aria-pressed={selected}
                              >
                                {n}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t bg-gray-50">
                <td className="px-4 py-3 font-semibold">合計</td>
                <td className="px-4 py-3 text-xl font-bold" colSpan={2}>{total}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 簡単な運用メモ（解説の雛形） */}
        <section className="mt-6 rounded-2xl bg-white p-4 shadow">
          <h2 className="font-semibold mb-2">測定時の注意事項</h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>タイミング：服薬ON/OFF（例：レボドパ後◯分）を必ずメモ。</li>
            <li>左右差：利き手/利き足をメモ（再現性向上）。</li>
            <li>安全：転倒リスクのある項目は介助者配置。</li>
            <li>数値＋所見の質的特徴（例：律動性低下、途中停止、振戦周波など）をメモ。</li>
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
            className="fixed z-50 max-w-sm rounded-xl border bg-white p-3 shadow-lg"
            style={{ top: pop.y, left: pop.x, width: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 text-xs font-semibold text-gray-600">測定方法</div>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {pop.text}
            </pre>
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
    </div>
  );
}
