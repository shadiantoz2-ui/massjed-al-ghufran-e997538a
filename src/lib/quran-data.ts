// Quran data: page→juz mapping (Madani mushaf 604 pages; this project uses 1..581 for juz 1..29)
// and surahs of juz 30 with ayah counts.

export const TOTAL_PAGES = 581;

// First page of each juz (juz 1..29). Juz 30 is handled by surahs below.
export const JUZ_START_PAGES: number[] = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182,
  201, 222, 242, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562,
];

export function pageToJuz(page: number): number {
  for (let i = JUZ_START_PAGES.length - 1; i >= 0; i--) {
    if (page >= JUZ_START_PAGES[i]) return i + 1;
  }
  return 1;
}

export function juzPages(juz: number): number[] {
  const start = JUZ_START_PAGES[juz - 1];
  const end = juz === 29 ? TOTAL_PAGES : JUZ_START_PAGES[juz] - 1;
  const arr: number[] = [];
  for (let p = start; p <= end; p++) arr.push(p);
  return arr;
}

// Juz 30 surahs: number, name (Arabic), ayah count
export interface SurahInfo {
  number: number;
  name: string;
  ayahCount: number;
}

export const JUZ_30_SURAHS: SurahInfo[] = [
  { number: 78, name: "النبأ", ayahCount: 40 },
  { number: 79, name: "النازعات", ayahCount: 46 },
  { number: 80, name: "عبس", ayahCount: 42 },
  { number: 81, name: "التكوير", ayahCount: 29 },
  { number: 82, name: "الانفطار", ayahCount: 19 },
  { number: 83, name: "المطففين", ayahCount: 36 },
  { number: 84, name: "الانشقاق", ayahCount: 25 },
  { number: 85, name: "البروج", ayahCount: 22 },
  { number: 86, name: "الطارق", ayahCount: 17 },
  { number: 87, name: "الأعلى", ayahCount: 19 },
  { number: 88, name: "الغاشية", ayahCount: 26 },
  { number: 89, name: "الفجر", ayahCount: 30 },
  { number: 90, name: "البلد", ayahCount: 20 },
  { number: 91, name: "الشمس", ayahCount: 15 },
  { number: 92, name: "الليل", ayahCount: 21 },
  { number: 93, name: "الضحى", ayahCount: 11 },
  { number: 94, name: "الشرح", ayahCount: 8 },
  { number: 95, name: "التين", ayahCount: 8 },
  { number: 96, name: "العلق", ayahCount: 19 },
  { number: 97, name: "القدر", ayahCount: 5 },
  { number: 98, name: "البينة", ayahCount: 8 },
  { number: 99, name: "الزلزلة", ayahCount: 8 },
  { number: 100, name: "العاديات", ayahCount: 11 },
  { number: 101, name: "القارعة", ayahCount: 11 },
  { number: 102, name: "التكاثر", ayahCount: 8 },
  { number: 103, name: "العصر", ayahCount: 3 },
  { number: 104, name: "الهمزة", ayahCount: 9 },
  { number: 105, name: "الفيل", ayahCount: 5 },
  { number: 106, name: "قريش", ayahCount: 4 },
  { number: 107, name: "الماعون", ayahCount: 7 },
  { number: 108, name: "الكوثر", ayahCount: 3 },
  { number: 109, name: "الكافرون", ayahCount: 6 },
  { number: 110, name: "النصر", ayahCount: 3 },
  { number: 111, name: "المسد", ayahCount: 5 },
  { number: 112, name: "الإخلاص", ayahCount: 4 },
  { number: 113, name: "الفلق", ayahCount: 5 },
  { number: 114, name: "الناس", ayahCount: 6 },
];

export const GRADE_LABELS: Record<string, string> = {
  excellent: "ممتاز",
  very_good: "جيد جداً",
  good: "جيد",
  needs_review: "يحتاج مراجعة",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  supervisor: "معلم مشرف",
  reciter: "معلم مقرئ",
  halaqah: "معلم الحلقة",
};
