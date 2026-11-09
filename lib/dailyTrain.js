export const DAILY_TRAIN_SESSION_SIZE = 5;
export const DAILY_TRAIN_QUESTION_SECONDS = 45;

export function createDailyTrainQueue(quizzes = []) {
  return Array.isArray(quizzes) ? quizzes.filter(Boolean).slice(0, DAILY_TRAIN_SESSION_SIZE) : [];
}

export function consumeDailyTrainQuestion(queue = [], index = 0) {
  if (!Array.isArray(queue) || !queue.length) return [];
  return queue.filter((_, itemIndex) => itemIndex !== index);
}
