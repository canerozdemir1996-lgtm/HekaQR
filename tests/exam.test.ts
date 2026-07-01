import assert from "node:assert/strict";
import test from "node:test";
import { normalizeExamConfig, sanitizeExamForPublic, scoreExam } from "../lib/exam";

test("exam scoring happens from server-side correct answers", () => {
  const config = normalizeExamConfig({
    title: "Final",
    passScore: 50,
    questions: [
      { id: "q1", type: "multiple_choice", prompt: "One?", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correctAnswer: "a", points: 2 },
      { id: "q2", type: "short_answer", prompt: "City?", correctAnswer: "İstanbul", points: 3 },
    ],
  });

  const result = scoreExam(config, { q1: "a", q2: "istanbul" });
  assert.equal(result.score, 5);
  assert.equal(result.maxScore, 5);
  assert.equal(result.correctCount, 2);
  assert.equal(result.passed, true);
});

test("public exam payload omits answer key and access secrets", () => {
  const config = normalizeExamConfig({
    access: { mode: "password", password: "secret" },
    questions: [{ id: "q1", type: "true_false", prompt: "Ok?", correctAnswer: "true" }],
  });

  const publicConfig = sanitizeExamForPublic(config);
  assert.deepEqual(publicConfig.access, { mode: "password" });
  assert.equal("correctAnswer" in publicConfig.questions[0], false);
});
