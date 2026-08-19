export type MathsFormulaSeed = {
  division: "Core basics" | "Algebra" | "Geometry" | "Trigonometry & Mensuration" | "Statistics";
  chapterTitle?: string;
  title: string;
  expression: string;
  explanation: string;
  tags: string[];
  sortOrder: number;
};

/**
 * Reference content is seeded into Supabase and read from the database at runtime.
 * Chapter titles are resolved to database chapter IDs by seed-academics.ts.
 */
export const mathsFormulaSeeds: MathsFormulaSeed[] = [
  { division: "Core basics", title: "Order of operations", expression: "Bracket → Of → Division / Multiplication → Addition / Subtraction", explanation: "Work from the innermost brackets and keep the order consistent before simplifying.", tags: ["arithmetic", "simplification"], sortOrder: 10 },
  { division: "Core basics", title: "Percentage change", expression: "Percentage change = (Change ÷ Original value) × 100%", explanation: "Use the original value as the denominator, not the new value.", tags: ["percentage", "word problem"], sortOrder: 20 },
  { division: "Core basics", title: "Ratio sharing", expression: "One part = Total quantity ÷ Sum of ratio parts", explanation: "Find one ratio part first, then multiply by the required share.", tags: ["ratio", "proportion"], sortOrder: 30 },
  { division: "Core basics", title: "Unit conversion", expression: "1 km = 1000 m · 1 m = 100 cm · 1 m² = 10,000 cm²", explanation: "For area, square the length conversion; for volume, cube it.", tags: ["units", "mensuration"], sortOrder: 40 },

  { division: "Algebra", chapterTitle: "বীজগাণিতিক রাশি", title: "Difference of two squares", expression: "a² − b² = (a − b)(a + b)", explanation: "Use when two perfect squares are separated by subtraction.", tags: ["factorisation", "identity"], sortOrder: 110 },
  { division: "Algebra", chapterTitle: "বীজগাণিতিক রাশি", title: "Square of a sum", expression: "(a + b)² = a² + 2ab + b²", explanation: "The middle term is twice the product of the two terms.", tags: ["identity", "expansion"], sortOrder: 120 },
  { division: "Algebra", chapterTitle: "বীজগাণিতিক রাশি", title: "Square of a difference", expression: "(a − b)² = a² − 2ab + b²", explanation: "Keep the middle term negative and the final square positive.", tags: ["identity", "expansion"], sortOrder: 130 },
  { division: "Algebra", chapterTitle: "বীজগাণিতিক রাশি", title: "Cube identities", expression: "a³ + b³ = (a + b)(a² − ab + b²)\na³ − b³ = (a − b)(a² + ab + b²)", explanation: "The sign in the second factor changes when the first factor changes from plus to minus.", tags: ["factorisation", "cube"], sortOrder: 140 },
  { division: "Algebra", chapterTitle: "সূচক ও লগারিদম", title: "Index laws", expression: "aᵐaⁿ = aᵐ⁺ⁿ · aᵐ ÷ aⁿ = aᵐ⁻ⁿ · (aᵐ)ⁿ = aᵐⁿ", explanation: "Use the same non-zero base and apply the matching law for multiplication, division, or a power of a power.", tags: ["indices", "exponents"], sortOrder: 150 },
  { division: "Algebra", chapterTitle: "সূচক ও লগারিদম", title: "Logarithm product and quotient", expression: "logₐ(xy) = logₐx + logₐy\nlogₐ(x/y) = logₐx − logₐy", explanation: "The base a must be positive and not equal to 1, and the arguments must be positive.", tags: ["logarithm"], sortOrder: 160 },
  { division: "Algebra", chapterTitle: "দুই চলকবিশিষ্ট সরল সহসমীকরণ", title: "Pair of linear equations", expression: "a₁x + b₁y = c₁\na₂x + b₂y = c₂", explanation: "Use elimination, substitution, or comparison to find the ordered pair (x, y).", tags: ["simultaneous equations", "linear"], sortOrder: 170 },
  { division: "Algebra", chapterTitle: "সসীম ধারা", title: "Arithmetic sequence", expression: "aₙ = a + (n − 1)d\nSₙ = n/2 [2a + (n − 1)d]", explanation: "a is the first term, d is the common difference, and n is the number of terms.", tags: ["sequence", "series"], sortOrder: 180 },

  { division: "Geometry", chapterTitle: "রেখা, কোণ ও ত্রিভুজ", title: "Triangle angle sum", expression: "A + B + C = 180°", explanation: "The three interior angles of every triangle add up to 180 degrees.", tags: ["triangle", "angle"], sortOrder: 210 },
  { division: "Geometry", chapterTitle: "রেখা, কোণ ও ত্রিভুজ", title: "Pythagorean theorem", expression: "c² = a² + b²", explanation: "In a right-angled triangle, c is the side opposite the right angle.", tags: ["triangle", "right angle"], sortOrder: 220 },
  { division: "Geometry", chapterTitle: "বৃত্ত", title: "Circle circumference and area", expression: "Circumference = 2πr\nArea = πr²", explanation: "Use radius r; if diameter d is given, r = d/2.", tags: ["circle", "area"], sortOrder: 230 },
  { division: "Geometry", chapterTitle: "বৃত্ত", title: "Arc length", expression: "Arc length = (θ/360°) × 2πr", explanation: "θ is the central angle subtended by the arc.", tags: ["circle", "arc"], sortOrder: 240 },
  { division: "Geometry", chapterTitle: "অনুপাত, সদৃশতা ও প্রতিসমতা", title: "Similar figures", expression: "Corresponding sides are proportional\nArea ratio = (side ratio)²", explanation: "For similar figures, matching lengths share one scale factor; areas use its square.", tags: ["similarity", "ratio"], sortOrder: 250 },

  { division: "Trigonometry & Mensuration", chapterTitle: "ত্রিকোণমিতিক অনুপাত", title: "Right-triangle ratios", expression: "sin θ = perpendicular / hypotenuse\ncos θ = base / hypotenuse\ntan θ = perpendicular / base", explanation: "Remember the sides relative to angle θ: opposite, adjacent, and hypotenuse.", tags: ["trigonometry", "ratio"], sortOrder: 310 },
  { division: "Trigonometry & Mensuration", chapterTitle: "ত্রিকোণমিতিক অনুপাত", title: "Identity", expression: "sin²θ + cos²θ = 1", explanation: "Use this to find one ratio when the other ratio is known, with the correct sign for the quadrant.", tags: ["trigonometry", "identity"], sortOrder: 320 },
  { division: "Trigonometry & Mensuration", chapterTitle: "ত্রিকোণমিতিক অনুপাত", title: "Complementary angles", expression: "sin(90° − θ) = cos θ\ncos(90° − θ) = sin θ", explanation: "Complementary angles add to 90 degrees and swap sine with cosine.", tags: ["trigonometry", "angles"], sortOrder: 330 },
  { division: "Trigonometry & Mensuration", chapterTitle: "দূরত্ব ও উচ্চতা", title: "Height and distance", expression: "tan θ = Height ÷ Horizontal distance", explanation: "Rearrange as Height = distance × tan θ when the angle of elevation is known.", tags: ["trigonometry", "height", "distance"], sortOrder: 340 },
  { division: "Trigonometry & Mensuration", chapterTitle: "পরিমিতি", title: "Cuboid", expression: "Volume = lbh\nTotal surface area = 2(lb + bh + hl)", explanation: "l, b, and h are length, breadth, and height.", tags: ["mensuration", "cuboid"], sortOrder: 350 },
  { division: "Trigonometry & Mensuration", chapterTitle: "পরিমিতি", title: "Cylinder", expression: "Volume = πr²h\nCurved surface area = 2πrh", explanation: "r is radius and h is perpendicular height.", tags: ["mensuration", "cylinder"], sortOrder: 360 },
  { division: "Trigonometry & Mensuration", chapterTitle: "পরিমিতি", title: "Cone and sphere", expression: "Cone volume = 1/3πr²h\nSphere volume = 4/3πr³\nSphere surface area = 4πr²", explanation: "Use perpendicular height h for the cone, not its slant height.", tags: ["mensuration", "solid"], sortOrder: 370 },

  { division: "Statistics", chapterTitle: "পরিসংখ্যান", title: "Arithmetic mean", expression: "Mean = Σx ÷ n\nFrequency mean = Σfx ÷ Σf", explanation: "For a frequency table, multiply each value by its frequency before adding.", tags: ["statistics", "mean"], sortOrder: 410 },
  { division: "Statistics", chapterTitle: "পরিসংখ্যান", title: "Range", expression: "Range = Largest value − Smallest value", explanation: "Range describes the spread using only the two extreme values.", tags: ["statistics", "spread"], sortOrder: 420 },
  { division: "Statistics", chapterTitle: "পরিসংখ্যান", title: "Pie-chart angle", expression: "Sector angle = (Category value ÷ Total value) × 360°", explanation: "Convert a category’s share of the total into the central angle of its sector.", tags: ["statistics", "chart"], sortOrder: 430 },
];
