import type { Chapter, MarksDistribution, Subject } from "./types";

export const allSubjectsCatalog: Subject[] = [
  { id: "bangla-1", name: "Bangla 1st Paper", shortName: "Bangla 1", strength: "moderate", weaknessScore: 58, workflow: "bangla-1", accent: "pink", category: "common", bookLanguage: "bn" },
  { id: "bangla-2", name: "Bangla 2nd Paper", shortName: "Bangla 2", strength: "moderate", weaknessScore: 55, workflow: "bangla-2", accent: "yellow", category: "common", bookLanguage: "bn" },
  { id: "english-1", name: "English 1st Paper", shortName: "English 1", strength: "strongest", weaknessScore: 20, workflow: "english", accent: "blue", category: "common", bookLanguage: "bn" },
  { id: "english-2", name: "English 2nd Paper", shortName: "English 2", strength: "strongest", weaknessScore: 20, workflow: "english", accent: "blue", category: "common", bookLanguage: "bn" },
  { id: "mathematics", name: "Mathematics", shortName: "Maths", strength: "toughest", weaknessScore: 100, workflow: "mathematics", accent: "lilac", category: "common", bookLanguage: "bn" },
  { id: "ict", name: "Information & Communication Technology", shortName: "ICT", strength: "strongest", weaknessScore: 25, workflow: "notebooklm", accent: "blue", category: "common", bookLanguage: "bn" },
  { id: "physics", name: "Physics", shortName: "Physics", strength: "toughest", weaknessScore: 70, workflow: "notebooklm", accent: "lilac", category: "group", studyGroup: "science", bookLanguage: "bn" },
  { id: "chemistry", name: "Chemistry", shortName: "Chemistry", strength: "toughest", weaknessScore: 70, workflow: "notebooklm", accent: "mint", category: "group", studyGroup: "science", bookLanguage: "bn" },
  { id: "biology", name: "Biology", shortName: "Biology", strength: "moderate", weaknessScore: 55, workflow: "notebooklm", accent: "mint", category: "group", studyGroup: "science", bookLanguage: "bn" },
  { id: "bgs", name: "Bangladesh and Global Studies", shortName: "BGS", strength: "moderate", weaknessScore: 45, workflow: "notebooklm", accent: "pink", category: "group", studyGroup: "science", bookLanguage: "bn" },
  { id: "business", name: "Business Entrepreneurship", shortName: "Business", strength: "strongest", weaknessScore: 18, workflow: "notebooklm", accent: "pink", category: "group", studyGroup: "commerce", bookLanguage: "bn" },
  { id: "finance", name: "Finance & Banking", shortName: "Finance", strength: "strongest", weaknessScore: 18, workflow: "notebooklm", accent: "mint", category: "group", studyGroup: "commerce", bookLanguage: "bn" },
  { id: "accounting", name: "Accounting", shortName: "Accounting", strength: "moderate", weaknessScore: 50, workflow: "accounting", accent: "yellow", category: "group", studyGroup: "commerce", bookLanguage: "bn" },
  { id: "science", name: "General Science", shortName: "Science", strength: "very-strong", weaknessScore: 30, workflow: "notebooklm", accent: "mint", category: "group", studyGroup: "commerce", bookLanguage: "bn" },
  { id: "geography", name: "Geography and Environment", shortName: "Geography", strength: "moderate", weaknessScore: 48, workflow: "notebooklm", accent: "mint", category: "group", studyGroup: "humanities", bookLanguage: "bn" },
  { id: "economics", name: "Economics", shortName: "Economics", strength: "moderate", weaknessScore: 50, workflow: "notebooklm", accent: "yellow", category: "group", studyGroup: "humanities", bookLanguage: "bn" },
  { id: "history", name: "History of Bangladesh and World Civilization", shortName: "History", strength: "moderate", weaknessScore: 48, workflow: "notebooklm", accent: "pink", category: "group", studyGroup: "humanities", bookLanguage: "bn" },
  { id: "civics", name: "Civics and Citizenship", shortName: "Civics", strength: "moderate", weaknessScore: 45, workflow: "notebooklm", accent: "blue", category: "group", studyGroup: "humanities", bookLanguage: "bn" },
  { id: "islam", name: "Islam and Moral Education", shortName: "Islam", strength: "strongest", weaknessScore: 22, workflow: "notebooklm", accent: "yellow", category: "religion", religionSubject: "islam", bookLanguage: "bn" },
  { id: "hinduism", name: "Hindu Religion and Moral Education", shortName: "Hindu Religion", strength: "moderate", weaknessScore: 40, workflow: "notebooklm", accent: "pink", category: "religion", religionSubject: "hinduism", bookLanguage: "bn" },
  { id: "buddhism", name: "Buddhist Religion and Moral Education", shortName: "Buddhist Religion", strength: "moderate", weaknessScore: 40, workflow: "notebooklm", accent: "mint", category: "religion", religionSubject: "buddhism", bookLanguage: "bn" },
  { id: "christianity", name: "Christian Religion and Moral Education", shortName: "Christian Religion", strength: "moderate", weaknessScore: 40, workflow: "notebooklm", accent: "blue", category: "religion", religionSubject: "christianity", bookLanguage: "bn" },
  { id: "higher-mathematics", name: "Higher Mathematics", shortName: "Higher Math", strength: "toughest", weaknessScore: 72, workflow: "mathematics", accent: "lilac", category: "fourth", fourthSubject: "higher-mathematics", bookLanguage: "bn" },
  { id: "agriculture", name: "Agriculture Studies", shortName: "Agriculture", strength: "toughest", weaknessScore: 94, workflow: "notebooklm", accent: "mint", category: "fourth", fourthSubject: "agriculture", bookLanguage: "bn" },
  { id: "home-science", name: "Home Science", shortName: "Home Science", strength: "moderate", weaknessScore: 35, workflow: "notebooklm", accent: "pink", category: "fourth", fourthSubject: "home-science", bookLanguage: "bn" },
];

export let subjects: Subject[] = [...allSubjectsCatalog];

export let workflowSteps = {
  notebooklm: ["Video overview", "Audio overview", "Flashcards", "Reports", "Guidebook MCQ / CQ / SQ", "Independent recall & practice"],
  accounting: ["NotebookLM concept overview", "Audio overview", "Flashcards & reports", "Worked example review", "Independent numerical practice", "Guidebook MCQ / CQ / SQ", "Error check"],
  "bangla-1": ["YouTube class", "Guidebook MCQ", "Guidebook CQ", "Guidebook SQ", "Timed written answer"],
  "bangla-2": ["Read textbook", "Read guidebook", "Grammar / format drill", "Written practice", "Self-check"],
  english: ["Ask ChatGPT for lesson", "Exam-format practice", "Get ChatGPT feedback", "Rewrite weak answer"],
  mathematics: ["Learn concept", "Study examples", "Independent problem set", "Timed set", "Mistake reattempt"],
} as const;

type Seed = [string, string, number | undefined, string | undefined, string | undefined];
const seed: Seed[] = [
  ...[
    "প্রত্যুপকার", "ফুলের বিবাহ", "সুভা", "বই পড়া", "অভাগীর স্বর্গ", "নীরিহ বাঙালি", "পল্লিসাহিত্য", "আম-আঁটির ভেঁপু", "মানুষ মুহম্মদ (স.)", "নিমগাছ", "উপেক্ষিত শক্তির উদ্বোধন", "প্রবাসবন্ধু", "মমতাদি", "একুশের গল্প", "আমাদের নতুন গৌরবগাথা",
  ].map((title, i) => ["bangla-1", title, i + 1, "Prose", undefined] as Seed),
  ...[
    "বন্দনা", "কপোতাক্ষ নদ", "প্রাণ", "অন্ধবধূ", "ঝর্ণার গান", "জীবন বিনিময়", "উমর ফারুক", "সেইদিন এই মাঠ", "যাব আমি তোমার দেশে", "আমার দেশ", "বৃষ্টি", "আমি কোনো আগন্তুক নই", "রানার", "তোমাকে পাওয়ার জন্যে, হে স্বাধীনতা", "বোশেখ",
  ].map((title, i) => ["bangla-1", title, i + 1, "Poetry", undefined] as Seed),
  ["bangla-1", "1971", undefined, "Supplementary novel", "Moderately difficult"],
  ["bangla-1", "বহিপীর", undefined, "Supplementary drama", "Easy after repeated reading"],
  ...["ভাষা ও বাংলা ব্যাকরণ", "ধ্বনিতত্ত্ব", "শব্দতত্ত্ব / রূপতত্ত্ব", "বাক্যতত্ত্ব", "বাগর্থ", "অনুবাদ", "অনুচ্ছেদ", "সারাংশ ও সারমর্ম", "ভাব-সম্প্রসারণ", "চিঠিপত্র ও আবেদনপত্র", "প্রতিবেদন", "প্রায়োগিক ও কল্পনানির্ভর লেখা", "প্রবন্ধ রচনা"].map((title, i) => ["bangla-2", title, i + 1, undefined, undefined] as Seed),
  ...["Seen comprehension", "Unseen information transfer", "Summary writing", "Matching", "Rearranging sentences", "Solitude", "Time, You Old Gipsy Man", "Stopping by Woods on a Snowy Evening", "The Story of an Hour", "The Purple Jar", "A Pound of Flesh, Three Caskets, The Trial", "Completing story", "Dialogue writing"].map((title) => ["english-1", title, undefined, "Exam format", undefined] as Seed),
  ...["Gap filling with clues", "Substitution table", "Right form of verbs", "Changing sentences", "Tag questions", "Suffixes and prefixes", "Prepositions", "Connectors / linking words", "Punctuation and capitalization", "Paragraph writing", "E-mail / letter / application", "Short composition"].map((title) => ["english-2", title, undefined, "Exam format", undefined] as Seed),
  ["mathematics", "বাস্তব সংখ্যা", 1, "Algebra", "Easy"], ["mathematics", "সেট ও ফাংশন", 2, "Algebra", "Easy"], ["mathematics", "বীজগাণিতিক রাশি", 3, "Algebra", "Difficult and extremely important"], ["mathematics", "সূচক ও লগারিদম", 4, "Algebra", "Moderate and important"], ["mathematics", "এক চলকবিশিষ্ট সমীকরণ", 5, "Algebra", "Never touched"],
  ["mathematics", "রেখা, কোণ ও ত্রিভুজ", 6, "Geometry", "Never touched"], ["mathematics", "ব্যবহারিক জ্যামিতি", 7, "Geometry", "Difficult and extremely important"], ["mathematics", "বৃত্ত", 8, "Geometry", "Difficult and extremely important"],
  ["mathematics", "ত্রিকোণমিতিক অনুপাত", 9, "Trigonometry & Mensuration", "Learning"], ["mathematics", "দূরত্ব ও উচ্চতা", 10, "Trigonometry & Mensuration", "Never touched"],
  ["mathematics", "বীজগাণিতিক অনুপাত ও সমানুপাত", 11, "Algebra", "Never touched"], ["mathematics", "দুই চলকবিশিষ্ট সরল সহসমীকরণ", 12, "Algebra", "Never touched"], ["mathematics", "সসীম ধারা", 13, "Algebra", "Decent"],
  ["mathematics", "অনুপাত, সদৃশতা ও প্রতিসমতা", 14, "Geometry", "Never touched"], ["mathematics", "ক্ষেত্রফল সম্পর্কিত উপপাদ্য ও সম্পাদ্য", 15, "Geometry", "Never touched"], ["mathematics", "পরিমিতি", 16, "Trigonometry & Mensuration", "Good"], ["mathematics", "পরিসংখ্যান", 17, "Statistics", "Easiest and very important"],
  ...["উন্নততর জীবনধারা", "জীবনের জন্য পানি", "হৃদ্যন্ত্রের যত কথা এবং অন্যান্য", "নবজীবনের সূচনা", "দেখতে হলে আলো চাই", "পলিমার", "অম্ল, ক্ষারক ও লবণের ব্যবহার", "আমাদের সম্পদ", "দুর্যোগের সাথে বসবাস", "এসো বলকে জানি", "প্রাত্যহিক জীবনে তড়িৎ"].map((title, i) => ["science", title, i + 1, undefined, i === 10 ? "Never touched; most difficult" : undefined] as Seed),
  ...["আকাইদ ও নৈতিক জীবন", "শরিয়তের উৎস", "ইবাদত", "আখলাক", "আদর্শ জীবনচরিত"].map((title, i) => ["islam", title, i + 1, undefined, i ? "Partially read" : "Almost complete"] as Seed),
  ...["তথ্য ও যোগাযোগ প্রযুক্তি ও আমাদের বাংলাদেশ", "কম্পিউটার রক্ষণাবেক্ষণ ও সাইবার নিরাপত্তা", "ইন্টারনেট ও ওয়েব পরিচিতি", "আমার লেখালেখি ও হিসাব", "মাল্টিমিডিয়া ও গ্রাফিক্স", "প্রোগ্রামিংয়ের মাধ্যমে সমস্যার সমাধান"].map((title, i) => ["ict", title, i + 1, undefined, i === 5 ? "Partially read; difficult" : undefined] as Seed),
  ...["ব্যবসায় পরিচিতি", "ব্যবসায় উদ্যোগ ও উদ্যোক্তা", "আত্মকর্মসংস্থান", "মালিকানার ভিত্তিতে ব্যবসায়", "ব্যবসায়ের আইনগত দিক", "ব্যবসায় পরিকল্পনা", "বাংলাদেশের শিল্প", "ব্যবসায় প্রতিষ্ঠানের ব্যবস্থাপনা", "বিপণন", "ব্যবসায় উদ্যোগ উন্নয়নে সহায়ক সেবা", "ব্যবসায় নৈতিকতা ও সামাজিক দায়িত্ব", "সফল উদ্যোক্তাদের জীবনী থেকে শিক্ষণীয়"].map((title, i) => ["business", title, i + 1, undefined, undefined] as Seed),
  ...["অর্থায়ন ও ব্যবসায় অর্থায়ন", "অর্থায়নের উৎস", "শেয়ার, বন্ড ও ডিবেঞ্চার", "অর্থের সময়মূল্য", "ঝুঁকি ও অনিশ্চয়তা", "মূলধনি আয়-ব্যয় প্রাক্কলন", "মূলধন ব্যয়", "মুদ্রা, ব্যাংক ও ব্যাংকিং", "ব্যাংকিং ব্যবসায় ও তার ধরন", "বাণিজ্যিক ব্যাংক", "ব্যাংকের আমানত", "ব্যাংক ও গ্রাহক", "কেন্দ্রীয় ব্যাংক"].map((title, i) => ["finance", title, i + 1, i < 7 ? "Finance" : "Banking", undefined] as Seed),
  ...["হিসাববিজ্ঞান পরিচিতি", "লেনদেন", "দুতরফা দাখিলা পদ্ধতি", "মূলধন ও মুনাফা জাতীয় লেনদেন", "হিসাব", "জাবেদা", "খতিয়ান", "নগদান বই", "রেওয়ামিল", "আর্থিক বিবরণী", "পণ্যের ক্রয়মূল্য, উৎপাদন ব্যয় ও বিক্রয়মূল্য", "পারিবারিক ও আত্মকর্মসংস্থানমূলক উদ্যোগের হিসাব"].map((title, i) => ["accounting", title, i + 1, i === 9 ? "Financial statement" : undefined, i === 9 ? "Extremely difficult; direct 20-mark priority" : undefined] as Seed),
  ...["কৃষি প্রযুক্তি", "কৃষি উপকরণ", "কৃষি ও জলবায়ু", "কৃষিজ উৎপাদন", "বনায়ন", "কৃষি সমবায়", "পারিবারিক খামার"].map((title, i) => ["agriculture", title, i + 1, undefined, i === 3 ? "Never studied; very difficult" : undefined] as Seed),
  ...["ভৌত রাশি ও পরিমাপ", "গতি", "বল", "কাজ, ক্ষমতা ও শক্তি", "পদার্থের অবস্থা ও চাপ", "প্রভাব", "তাপ", "মহাকর্ষ ও অভিকর্ষ", "তরঙ্গ", "আলোর প্রতিফলন", "আলোর প্রতিসরণ", "স্থির বিদ্যুৎ", "চল বিদ্যুৎ", "চুম্বকত্ব"].map((title, i) => ["physics", title, i + 1, undefined, undefined] as Seed),
  ...["পদার্থের গঠন", "পদার্থের অবস্থা", "পদার্থের পরিবর্তন", "পর্যায় সারণি", "রাসায়নিক বন্ধন", "মোল ধারণা ও রাসায়নিক গণনা", "রাসায়নিক বিক্রিয়া", "অম্ল, ক্ষারক ও লবণ", "ধাতু ও অধাতু", "জৈব রসায়ন", "খনিজ সম্পদ", "ব্যবহারিক রসায়ন"].map((title, i) => ["chemistry", title, i + 1, undefined, undefined] as Seed),
  ...["কোষ ও টিস্যু", "কোষ বিভাজন", "জীবনীশক্তি", "জীবজগতের শ্রেণিবিন্যাস", "উদ্ভিদ প্রজনন", "উদ্ভিদের বৃদ্ধি", "জীবের প্রজনন", "বংশগতি", "পরিবেশ", "জীবপ্রযুক্তি", "জীবের চলন", "জীবনে প্রযুক্তি"].map((title, i) => ["biology", title, i + 1, undefined, undefined] as Seed),
  ...["বাংলাদেশের স্বাধীনতা সংগ্রাম", "বাংলাদেশের সরকার ও নাগরিক", "বাংলাদেশের সম্পদ ও অর্থনীতি", "বাংলাদেশের সামাজিক পরিবর্তন", "দক্ষিণ এশিয়ার ভূপ্রকৃতি", "জনসংখ্যা ও উন্নয়ন", "বাংলাদেশ ও আন্তর্জাতিক সম্পর্ক", "দুর্যোগ ও পরিবেশ", "টেকসই উন্নয়ন", "বিশ্বায়ন"].map((title, i) => ["bgs", title, i + 1, undefined, undefined] as Seed),
  ...["ভূগোলের ধারণা ও পৃথিবী", "মহাবিশ্ব ও সৌরজগৎ", "ভূমিরূপ ও ভূ-প্রক্রিয়া", "বায়ুমণ্ডল ও জলবায়ু", "জলমণ্ডল", "বাংলাদেশের ভূপ্রকৃতি", "বাংলাদেশের জলবায়ু", "প্রাকৃতিক সম্পদ", "জনসংখ্যা ও বসতি", "পরিবেশ ও দুর্যোগ"].map((title, i) => ["geography", title, i + 1, undefined, undefined] as Seed),
  ...["অর্থনীতির মৌলিক ধারণা", "উৎপাদন ও উপকরণ", "ভোগ ও সঞ্চয়", "বাজার ও মূল্য", "জাতীয় আয়", "মুদ্রা ও ব্যাংক", "বাংলাদেশের অর্থনীতি", "সরকারি অর্থব্যবস্থা", "আন্তর্জাতিক বাণিজ্য", "উন্নয়ন ও পরিবেশ"].map((title, i) => ["economics", title, i + 1, undefined, undefined] as Seed),
  ...["ইতিহাসের ধারণা", "প্রাচীন বাংলার ইতিহাস", "মধ্যযুগের বাংলা", "ইউরোপ ও আধুনিক যুগ", "ব্রিটিশ শাসন", "বাংলার নবজাগরণ", "ভাষা আন্দোলন", "মুক্তিযুদ্ধ", "স্বাধীন বাংলাদেশের অভ্যুদয়", "বিশ্বসভ্যতা", "বিশ্বযুদ্ধ ও পরবর্তী বিশ্ব", "বাংলাদেশ ও বিশ্ব"].map((title, i) => ["history", title, i + 1, undefined, undefined] as Seed),
  ...["পৌরনীতি ও নাগরিকতার ধারণা", "রাষ্ট্র ও সরকার", "নাগরিকতা ও আইন", "বাংলাদেশের সংবিধান", "স্থানীয় সরকার", "গণতন্ত্র ও নির্বাচন", "মানবাধিকার", "সুশাসন", "সামাজিক মূল্যবোধ", "আন্তর্জাতিক নাগরিকতা"].map((title, i) => ["civics", title, i + 1, undefined, undefined] as Seed),
  ...["হিন্দুধর্মের বিশ্বাস", "বেদ ও উপনিষদ", "পূজা ও ধর্মীয় আচার", "নৈতিক শিক্ষা", "আদর্শ জীবন"].map((title, i) => ["hinduism", title, i + 1, undefined, undefined] as Seed),
  ...["বুদ্ধের জীবন ও বাণী", "ত্রিরত্ন ও নৈতিকতা", "বৌদ্ধ আচার ও সংস্কৃতি", "সামাজিক মূল্যবোধ", "আদর্শ জীবন"].map((title, i) => ["buddhism", title, i + 1, undefined, undefined] as Seed),
  ...["খ্রিষ্টীয় বিশ্বাস ও নৈতিকতা", "বাইবেল ও ধর্মীয় জীবন", "প্রার্থনা ও উপাসনা", "খ্রিষ্টীয় আদর্শ জীবন", "সামাজিক মূল্যবোধ"].map((title, i) => ["christianity", title, i + 1, undefined, undefined] as Seed),
  ...["বীজগণিত", "জ্যামিতি", "ত্রিকোণমিতি", "সমতলীয় ভেক্টর", "সম্ভাবনা", "পরিসংখ্যান", "স্থানাঙ্ক জ্যামিতি", "ফাংশন", "ধারা", "ব্যবহারিক গণিত"].map((title, i) => ["higher-mathematics", title, i + 1, undefined, undefined] as Seed),
  ...["গৃহ ব্যবস্থাপনা", "খাদ্য ও পুষ্টি", "স্বাস্থ্য ও পরিচ্ছন্নতা", "পোশাক ও বস্ত্র", "শিশু বিকাশ", "পরিবার ও সমাজ", "গৃহসজ্জা", "ভোক্তা শিক্ষা", "জীবনদক্ষতা", "ব্যবহারিক কাজ"].map((title, i) => ["home-science", title, i + 1, undefined, undefined] as Seed),
];

const defaultFormats: Record<string, string[]> = {
  "bangla-1": ["MCQ", "CQ", "SQ"], "bangla-2": ["MCQ", "Written"], "english-1": ["Reading", "Writing"], "english-2": ["Grammar", "Writing"], mathematics: ["MCQ", "CQ", "Short"], ict: ["MCQ", "Short", "Practical"], accounting: ["MCQ", "Short", "Creative", "Financial statement"], agriculture: ["MCQ", "CQ", "Short", "Practical"],
};

const infer = (note?: string) => {
  const value = note?.toLowerCase() ?? "";
  if (value.includes("never") || value.includes("extremely difficult") || value.includes("most difficult")) return { status: "not-started" as const, confidence: 1 as const };
  if (value.includes("partial") || value.includes("learning") || value.includes("moderate") || value.includes("difficult")) return { status: "learning" as const, confidence: 2 as const };
  if (value.includes("easy") || value.includes("good") || value.includes("complete") || value.includes("decent")) return { status: "practising" as const, confidence: 4 as const };
  return { status: "learning" as const, confidence: 3 as const };
};

const inferDifficulty = (note?: string): Chapter["difficulty"] => {
  const value = note?.toLowerCase() ?? "";
  if (value.includes("easiest")) return 1;
  if (value.includes("easy")) return 2;
  if (value.includes("extremely difficult") || value.includes("most difficult")) return 5;
  if (value.includes("difficult") || value.includes("never touched")) return 4;
  return 3;
};

export function orderChapters(items: Chapter[]) {
  return [...items].sort((a, b) => (a.number ?? Number.MAX_SAFE_INTEGER) - (b.number ?? Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title, "bn"));
}

export let chapters: Chapter[] = seed.map(([subjectId, title, number, division, note], index) => ({
  id: `${subjectId}-${index + 1}`, subjectId, title, number, division, note, ...infer(note), difficulty: inferDifficulty(note),
  formats: defaultFormats[subjectId] ?? ["MCQ", "Short", "Creative"], questionsAttempted: 0, questionsCorrect: 0,
}));

export let marksDistributions: MarksDistribution[] = [
  { subjectId: "bangla-1", questionType: "Creative — prose and poetry", rule: "Answer 5 of 8; at least 2 from each section", marks: 50 },
  { subjectId: "bangla-1", questionType: "Supplementary short questions", rule: "Answer 2 of 4; 1 novel and 1 drama", marks: 20 },
  { subjectId: "bangla-1", questionType: "MCQ", rule: "Answer all 30", marks: 30 },
  { subjectId: "bangla-2", part: "Grammar", questionType: "MCQ", rule: "Answer all 30", marks: 30 },
  { subjectId: "bangla-2", part: "Writing", questionType: "Paragraph", rule: "1 of 3", marks: 10 }, { subjectId: "bangla-2", part: "Writing", questionType: "Summary / essence", rule: "1 of 2", marks: 10 }, { subjectId: "bangla-2", part: "Writing", questionType: "Expansion of idea", rule: "1 of 2", marks: 10 }, { subjectId: "bangla-2", part: "Writing", questionType: "Letter / application", rule: "1 of 2", marks: 10 }, { subjectId: "bangla-2", part: "Writing", questionType: "News report", rule: "1 of 2", marks: 10 }, { subjectId: "bangla-2", part: "Writing", questionType: "Essay / composition", rule: "1 of 3", marks: 20 },
  ...[["Seen MCQ", 7], ["Seen questions", 10], ["Seen gap filling", 5], ["Information transfer", 5], ["Summary", 10], ["Matching", 5], ["Rearranging", 8], ["Poem questions", 10], ["Story questions", 10], ["Completing story", 15], ["Dialogue", 15]].map(([questionType, marks]) => ({ subjectId: "english-1", questionType: String(questionType), rule: "SSC exam format", marks: Number(marks) })),
  ...[["Gap filling", 10], ["Substitution table", 5], ["Right form of verbs", 10], ["Changing sentences", 10], ["Tag questions", 5], ["Suffixes / prefixes", 5], ["Prepositions", 5], ["Connectors", 5], ["Punctuation", 5], ["Paragraph", 10], ["E-mail / letter / application", 10], ["Short composition", 20]].map(([questionType, marks]) => ({ subjectId: "english-2", questionType: String(questionType), rule: "SSC exam format", marks: Number(marks) })),
  { subjectId: "mathematics", part: "Written", questionType: "CQ", rule: "Creative question section", marks: 50 }, { subjectId: "mathematics", part: "Written", questionType: "Short", rule: "Short question section", marks: 20 }, { subjectId: "mathematics", part: "Written", questionType: "MCQ", rule: "MCQ section", marks: 30 },
  ...["science", "islam", "business"].flatMap((subjectId) => [{ subjectId, questionType: "Creative", rule: "Answer 5 of 8", marks: 50 }, { subjectId, questionType: "Short", rule: "Answer 10 of 15", marks: 20 }, { subjectId, questionType: "MCQ", rule: "Answer all 30", marks: 30 }]),
  { subjectId: "ict", part: "Written", questionType: "MCQ", rule: "Answer all", marks: 15 }, { subjectId: "ict", part: "Written", questionType: "Short", rule: "Answer as directed", marks: 10 }, { subjectId: "ict", part: "Practical", questionType: "Practical", rule: "Practical examination", marks: 25 },
  { subjectId: "finance", questionType: "Creative", rule: "Answer 5 of 8; at least 2 Finance and 2 Banking", marks: 50 }, { subjectId: "finance", questionType: "Short", rule: "Answer 10 of 15; at least 4 from each part", marks: 20 }, { subjectId: "finance", questionType: "MCQ", rule: "Answer all 30", marks: 30 },
  { subjectId: "accounting", questionType: "Financial statement", rule: "Compulsory", marks: 20 }, { subjectId: "accounting", questionType: "Creative", rule: "Answer 4 of 7", marks: 40 }, { subjectId: "accounting", questionType: "Short", rule: "Answer 5 of 7", marks: 10 }, { subjectId: "accounting", questionType: "MCQ", rule: "Answer all 30", marks: 30 },
  { subjectId: "agriculture", part: "Written", questionType: "CQ", rule: "Creative question section", marks: 40 }, { subjectId: "agriculture", part: "Written", questionType: "Short", rule: "Short question section", marks: 10 }, { subjectId: "agriculture", part: "Written", questionType: "MCQ", rule: "MCQ section", marks: 25 }, { subjectId: "agriculture", part: "Practical", questionType: "Practical", rule: "Practical examination", marks: 25 },
  ...["physics", "chemistry", "biology"].flatMap((subjectId) => [{ subjectId, part: "Written", questionType: "CQ", rule: "Creative question section", marks: 50 }, { subjectId, part: "Written", questionType: "MCQ", rule: "MCQ section", marks: 25 }, { subjectId, part: "Practical", questionType: "Practical", rule: "Practical examination", marks: 25 }]),
  ...["bgs", "geography", "economics", "history", "civics", "hinduism", "buddhism", "christianity", "higher-mathematics", "home-science"].flatMap((subjectId) => [{ subjectId, questionType: "Creative", rule: "Creative question section", marks: 50 }, { subjectId, questionType: "Short", rule: "Short question section", marks: 20 }, { subjectId, questionType: "MCQ", rule: "MCQ section", marks: 30 }]),
];

export type AcademicExam = { id: string; name: string; start: string; end: string };

export let exams: AcademicExam[] = [
  { id: "test", name: "Full-Syllabus Test", start: "2026-10-28", end: "2026-11-12" },
  { id: "ssc", name: "SSC 2027", start: "2027-01-07", end: "2027-02-06" },
];

export function replaceAcademicData(next: { subjects: Subject[]; chapters: Chapter[]; marksDistributions: MarksDistribution[]; exams: AcademicExam[]; workflowSteps?: typeof workflowSteps }) {
  subjects = next.subjects;
  chapters = next.chapters;
  marksDistributions = next.marksDistributions;
  exams = next.exams;
  if (next.workflowSteps) workflowSteps = next.workflowSteps;
}
