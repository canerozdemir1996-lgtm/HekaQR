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

test("exam supports fill blank, multi select and manual essay scoring", () => {
  const config = normalizeExamConfig({
    title: "Mixed",
    questions: [
      { id: "blank", type: "fill_blank", prompt: "Capital?", correctAnswer: "Ankara", points: 2 },
      { id: "multi", type: "multi_select", prompt: "Pick two", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }], correctAnswer: ["a", "c"], points: 3 },
      { id: "essay", type: "essay", prompt: "Explain", points: 10 },
    ],
  });

  const result = scoreExam(config, { blank: "ankara", multi: ["c", "a"], essay: "Long answer" });
  assert.equal(result.score, 5);
  assert.equal(result.maxScore, 15);
  assert.equal(result.correctCount, 2);
  assert.equal(result.wrongCount, 1);
});
