import { curriculum, lessons, placementQuestions } from '../src/data/curriculum.js';
import { baseWords } from '../src/data/words.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(curriculum.length === 5, 'Expected five CEFR levels.');
assert(curriculum.every(level => level.modules.length === 5), 'Every level must have five modules.');
const modules = curriculum.flatMap(level => level.modules);
assert(modules.length === 25, 'Expected 25 modules.');
assert(modules.every(module => module.lessons.length === 4), 'Every module must have four lesson titles.');
assert(lessons.length === 100, 'Expected 100 lesson records.');
for (const lesson of lessons) {
  assert(lesson.examples.length === 10, `Expected ten examples in ${lesson.id}.`);
  assert(lesson.questions.length === 4, `Expected four quiz questions in ${lesson.id}.`);
  assert(Boolean(lesson.objective && lesson.rule && lesson.explanation), `Missing lesson content in ${lesson.id}.`);
}
assert(baseWords.length >= 50, 'Vocabulary seed should contain at least 50 entries.');
assert(placementQuestions.length >= 10, 'Placement test should contain at least ten questions.');
console.log(`IRENGlish content verified: ${curriculum.length} levels, ${modules.length} modules, ${lessons.length} lessons, ${baseWords.length} words, ${placementQuestions.length} placement questions.`);
