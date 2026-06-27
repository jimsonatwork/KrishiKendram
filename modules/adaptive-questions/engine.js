import { questionBank } from "./question-bank.js";
import { getNextQuestion } from "./rules.js";

export class AdaptiveQuestionEngine {
  constructor() {
    this.context = {};
    this.asked = [];
  }

  answer(questionKey, answer) {
    this.context[questionKey] = answer;
    this.asked.push(questionKey); // FIXED
  }

  next() {
    const nextKey = getNextQuestion(this.context, this.asked); // FIXED

    if (!nextKey) {
      return { done: true, context: this.context };
    }

    return {
      key: nextKey,
      ...questionBank[nextKey]
    };
  }

  debug() {
    return {
      context: this.context,
      asked: this.asked
    };
  }
}