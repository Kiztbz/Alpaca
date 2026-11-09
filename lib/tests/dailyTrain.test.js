import { consumeDailyTrainQuestion, createDailyTrainQueue, DAILY_TRAIN_QUESTION_SECONDS } from "../dailyTrain";

describe("Daily Train sessions", () => {
  const quizzes = Array.from({ length: 8 }, (_, index) => ({ id: index + 1 }));

  test("caps every assessment at five questions", () => {
    expect(createDailyTrainQueue(quizzes).map(({ id }) => id)).toEqual([1, 2, 3, 4, 5]);
  });

  test("a skipped question is consumed instead of requeued", () => {
    const queue = createDailyTrainQueue(quizzes);
    expect(consumeDailyTrainQuestion(queue, 0).map(({ id }) => id)).toEqual([2, 3, 4, 5]);
  });

  test("uses a 45 second per-question limit", () => {
    expect(DAILY_TRAIN_QUESTION_SECONDS).toBe(45);
  });
});
