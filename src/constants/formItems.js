/**
 * UPDRS Part III 項目定義（グループ・単体）
 */
export const FORM_ITEMS = [
  { id: "1", label: "話し方" },
  { id: "2", label: "表情" },
  {
    group: true,
    id: "rigidity",
    number: 3,
    label: "筋強剛",
    items: [
      { id: "3N", label: "　頸部" },
      { id: "3RUE", label: "右上肢" },
      { id: "3LUE", label: "左上肢" },
      { id: "3RLE", label: "右下肢" },
      { id: "3LLE", label: "左下肢" },
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
  { id: "9", label: "椅子からの立ち上がり" },
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
      { id: "17Lip", label: "　口唇" },
    ],
  },
  { id: "18", label: "安静時振戦の持続性" },
];
