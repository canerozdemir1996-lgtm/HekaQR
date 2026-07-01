export type ExamQuestionType = "multiple_choice" | "true_false" | "short_answer";
export type ExamAccessMode = "public" | "password" | "code" | "one_time";

export type ExamOption = {
  id: string;
  text: string;
};

export type ExamQuestion = {
  id: string;
  type: ExamQuestionType;
  prompt: string;
  helpText?: string;
  options: ExamOption[];
  correctAnswer: string | string[];
  points: number;
  required: boolean;
};

export type ExamConfig = {
  kind: "exam";
  title: string;
  description: string;
  instructions: string;
  timeLimitMinutes: number;
  startAt: string | null;
  endAt: string | null;
  passScore: number;
  singleAttempt: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showQuestionSummary: boolean;
  participantFields: {
    name: boolean;
    email: boolean;
    studentNo: boolean;
  };
  access: {
    mode: ExamAccessMode;
    password: string;
    codes: string[];
  };
  questions: ExamQuestion[];
};

export type ExamPublicQuestion = Omit<ExamQuestion, "correctAnswer">;
export type ExamPublicConfig = Omit<ExamConfig, "access" | "questions"> & {
  access: { mode: ExamAccessMode };
  questions: ExamPublicQuestion[];
};

export type ExamAnswerMap = Record<string, string | string[] | null | undefined>;

export type ExamScoreResult = {
  score: number;
  maxScore: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  passed: boolean;
  answers: Array<{
    questionId: string;
    answer: string | string[] | null;
    correctAnswer: string | string[];
    isCorrect: boolean;
    points: number;
  }>;
};

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function cleanText(value: unknown, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function cleanDate(value: unknown) {
  const text = cleanText(value, 80);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(+date) ? null : date.toISOString();
}

function normalizeAnswerText(value: unknown) {
  return cleanText(value, 500)
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");
}

function normalizeOption(input: unknown, index: number): ExamOption {
  const option = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    id: cleanText(option.id, 80) || `opt-${index + 1}`,
    text: cleanText(option.text, 500) || `Seçenek ${index + 1}`,
  };
}

function normalizeQuestion(input: unknown, index: number): ExamQuestion {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const type = ["multiple_choice", "true_false", "short_answer"].includes(String(raw.type))
    ? (raw.type as ExamQuestionType)
    : "multiple_choice";
  const options = type === "multiple_choice"
    ? (Array.isArray(raw.options) ? raw.options : []).map(normalizeOption).filter(option => option.text).slice(0, 8)
    : type === "true_false"
      ? [{ id: "true", text: "Doğru" }, { id: "false", text: "Yanlış" }]
      : [];
  const fallbackCorrect = type === "true_false" ? "true" : options[0]?.id ?? "";
  return {
    id: cleanText(raw.id, 80) || id("q"),
    type,
    prompt: cleanText(raw.prompt, 1000) || `Soru ${index + 1}`,
    helpText: cleanText(raw.helpText, 1000),
    options: type === "multiple_choice" && options.length < 2
      ? [{ id: "a", text: "A" }, { id: "b", text: "B" }]
      : options,
    correctAnswer: Array.isArray(raw.correctAnswer)
      ? raw.correctAnswer.map(item => cleanText(item, 500)).filter(Boolean)
      : cleanText(raw.correctAnswer, 500) || fallbackCorrect,
    points: cleanNumber(raw.points, 1, 0, 1000),
    required: raw.required !== false,
  };
}

export function createExamQuestion(type: ExamQuestionType = "multiple_choice"): ExamQuestion {
  if (type === "true_false") {
    return {
      id: id("q"),
      type,
      prompt: "",
      helpText: "",
      options: [{ id: "true", text: "Doğru" }, { id: "false", text: "Yanlış" }],
      correctAnswer: "true",
      points: 1,
      required: true,
    };
  }
  if (type === "short_answer") {
    return { id: id("q"), type, prompt: "", helpText: "", options: [], correctAnswer: "", points: 1, required: true };
  }
  return {
    id: id("q"),
    type,
    prompt: "",
    helpText: "",
    options: [{ id: id("opt"), text: "" }, { id: id("opt"), text: "" }],
    correctAnswer: "",
    points: 1,
    required: true,
  };
}

export function buildDemoExamConfig(title = "Online Sınav"): ExamConfig {
  const first = createExamQuestion("multiple_choice");
  return {
    kind: "exam",
    title,
    description: "QR ile açılan mobil sınav.",
    instructions: "Bilgilerinizi girin ve süre dolmadan yanıtlarınızı gönderin.",
    timeLimitMinutes: 20,
    startAt: null,
    endAt: null,
    passScore: 70,
    singleAttempt: true,
    shuffleQuestions: false,
    shuffleOptions: false,
    showQuestionSummary: true,
    participantFields: { name: true, email: false, studentNo: false },
    access: { mode: "public", password: "", codes: [] },
    questions: [{ ...first, prompt: "Örnek soru", options: [{ id: "a", text: "A seçeneği" }, { id: "b", text: "B seçeneği" }], correctAnswer: "a" }],
  };
}

export function normalizeExamConfig(input: unknown, fallbackTitle = "Online Sınav"): ExamConfig {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const participant = (raw.participantFields && typeof raw.participantFields === "object" ? raw.participantFields : {}) as Record<string, unknown>;
  const access = (raw.access && typeof raw.access === "object" ? raw.access : {}) as Record<string, unknown>;
  const accessMode = ["public", "password", "code", "one_time"].includes(String(access.mode)) ? (access.mode as ExamAccessMode) : "public";
  const questions = (Array.isArray(raw.questions) ? raw.questions : [])
    .map(normalizeQuestion)
    .filter(question => question.prompt.trim())
    .slice(0, 80);

  return {
    kind: "exam",
    title: cleanText(raw.title, 200) || fallbackTitle,
    description: cleanText(raw.description, 1000),
    instructions: cleanText(raw.instructions, 2000),
    timeLimitMinutes: cleanNumber(raw.timeLimitMinutes, 20, 0, 480),
    startAt: cleanDate(raw.startAt),
    endAt: cleanDate(raw.endAt),
    passScore: cleanNumber(raw.passScore, 70, 0, 100),
    singleAttempt: raw.singleAttempt !== false,
    shuffleQuestions: raw.shuffleQuestions === true,
    shuffleOptions: raw.shuffleOptions === true,
    showQuestionSummary: raw.showQuestionSummary !== false,
    participantFields: {
      name: participant.name !== false,
      email: participant.email === true,
      studentNo: participant.studentNo === true,
    },
    access: {
      mode: accessMode,
      password: cleanText(access.password, 200),
      codes: Array.isArray(access.codes) ? access.codes.map(code => cleanText(code, 100)).filter(Boolean).slice(0, 500) : [],
    },
    questions: questions.length ? questions : buildDemoExamConfig(fallbackTitle).questions,
  };
}

export function sanitizeExamForPublic(config: ExamConfig): ExamPublicConfig {
  return {
    ...config,
    access: { mode: config.access.mode },
    questions: config.questions.map(({ correctAnswer: _correctAnswer, ...question }) => question),
  };
}

export function scoreExam(config: ExamConfig, answers: ExamAnswerMap): ExamScoreResult {
  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;
  const details: ExamScoreResult["answers"] = [];

  for (const question of config.questions) {
    const rawAnswer = answers[question.id];
    const answer = Array.isArray(rawAnswer)
      ? rawAnswer.map(item => cleanText(item, 500)).filter(Boolean)
      : cleanText(rawAnswer, 500) || null;
    const blank = Array.isArray(answer) ? answer.length === 0 : !answer;
    const correctAnswer = question.correctAnswer;
    const isCorrect = !blank && (
      question.type === "short_answer"
        ? (Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]).some(item => normalizeAnswerText(item) === normalizeAnswerText(answer))
        : String(answer) === String(Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer)
    );
    const points = isCorrect ? question.points : 0;
    maxScore += question.points;
    score += points;
    if (blank) blankCount += 1;
    else if (isCorrect) correctCount += 1;
    else wrongCount += 1;
    details.push({ questionId: question.id, answer, correctAnswer, isCorrect, points });
  }

  const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return {
    score,
    maxScore,
    correctCount,
    wrongCount,
    blankCount,
    passed: percent >= config.passScore,
    answers: details,
  };
}

export function isExamOpen(config: ExamConfig, now = new Date()) {
  if (config.startAt && now < new Date(config.startAt)) return { open: false, reason: "not_started" as const };
  if (config.endAt && now > new Date(config.endAt)) return { open: false, reason: "closed" as const };
  return { open: true, reason: null };
}
