/**
 * Content Bank — Technology, Level 4 (Task 5.14, Batch 1).
 * Blueprint §6.1 L4 (DD5 MT5 OR10 ST5 FC15 II10 PA15 ME5 SC15 NL15),
 * topics §7.4 L4, difficulty §5.3 L4 (D2 25 / D3 45 / D4 30).
 */
import { src, matching, fillComplete, numberLogic, scenario } from './helpers.mjs'

const S = { level: 4, ...src('technology') }

export default [
  matching({ leftItems: [{ id: 'l1', text: 'Integer' }, { id: 'l2', text: 'String' }, { id: 'l3', text: 'Boolean' }, { id: 'l4', text: 'Float' }], rightItems: [{ id: 'r1', text: '42' }, { id: 'r2', text: '"hello"' }, { id: 'r3', text: 'true' }, { id: 'r4', text: '3.14' }], pairs: [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l2', rightId: 'r2' }, { leftId: 'l3', rightId: 'r3' }, { leftId: 'l4', rightId: 'r4' }], prompt: 'Match each data type to an example value.', explanation: 'An integer is a whole number, a string is text in quotes, a boolean is true/false and a float has a decimal.', objective: 'Match programming data types to examples.', topic: 'programming', subtopic: 'variables-data', difficulty: 2, gradeMin: 8, gradeMax: 11, hints: [{ level: 1, text: 'Look at the shape of each value.' }], ...S }),

  fillComplete({ template: 'A code block that repeats while a condition is true is called a ___ loop.', blanks: [{ id: 'b1', type: 'text', label: 'loop type', maxLength: 10 }], answers: [{ blankId: 'b1', type: 'text', accepted: ['while'] }], prompt: 'A code block that repeats while a condition is true is called a ___ loop.', explanation: 'A while loop keeps repeating as long as its condition stays true.', objective: 'Name the loop controlled by a condition.', topic: 'programming', subtopic: 'control-flow', difficulty: 3, gradeMin: 8, gradeMax: 11, hints: [{ level: 1, text: 'It checks its condition before each repeat.' }], ...S }),

  numberLogic({ problem: 'The binary number 1010 equals which decimal value?', answerFormat: 'integer', answer: { type: 'exact', value: 10 }, prompt: 'The binary number 1010 equals which decimal value?', explanation: '1010₂ = 8 + 0 + 2 + 0 = 10.', objective: 'Convert a binary number to decimal.', topic: 'data-ai', subtopic: 'data-representation', difficulty: 3, gradeMin: 8, gradeMax: 11, hints: [{ level: 1, text: 'The bits stand for 8, 4, 2 and 1 from left to right.' }], ...S }),

  scenario({
    scenarioText: 'You need to find one name in an alphabetical phone book with 1,000 pages.',
    entryDecision: 'd1',
    decisions: [
      { id: 'd1', text: 'Which search approach is fastest?', options: [
        { id: 'opt_mid', text: 'Open the middle, then narrow down each time', nextDecision: null, outcomeText: 'Binary search halves the pages each step — the fastest method.' },
        { id: 'opt_front', text: 'Start at page 1 and flip forward', nextDecision: null, outcomeText: 'Linear search may need many pages.' },
        { id: 'opt_rnd', text: 'Open a random page and search all around it', nextDecision: null, outcomeText: 'Unsystematic and slow.' },
      ] },
    ],
    optimalPath: [{ decisionId: 'd1', optionId: 'opt_mid' }],
    prompt: 'Choose the fastest way to find the name.',
    explanation: 'Binary search halves the remaining pages at every step, finding the name in about ten checks.',
    objective: 'Apply binary search reasoning.',
    topic: 'programming', subtopic: 'algorithms', difficulty: 3, gradeMin: 8, gradeMax: 11,
    hints: [{ level: 1, text: 'Can you remove half the options with each check?' }], ...S,
  }),
]