/**
 * Content Bank — Engineering, Level 3 (Task 5.14, Batch 1).
 * Blueprint §6.1 L3 (DD10 MT10 OR10 ST5 FC15 II15 PA5 ME5 SC20 NL5),
 * topics §7.3 L3, difficulty §5.3 L3 (D1 30 / D2 40 / D3 25 / D4 5).
 */
import { src, sorting, fillComplete, ordering, numberLogic, scenario } from './helpers.mjs'

const S = { level: 3, ...src('engineering') }

export default [
  sorting({ items: [{ id: 'i1', label: 'Rope holding a hanging weight' }, { id: 'i2', label: 'Column supporting a roof' }, { id: 'i3', label: 'Stretched spring' }, { id: 'i4', label: 'Squeezed cushion' }, { id: 'i5', label: 'Bridge cable under load' }, { id: 'i6', label: 'Bottom brick of a wall' }], categories: [{ id: 'c_t', label: 'Tension' }, { id: 'c_c', label: 'Compression' }], assignments: [{ itemId: 'i1', categoryId: 'c_t' }, { itemId: 'i2', categoryId: 'c_c' }, { itemId: 'i3', categoryId: 'c_t' }, { itemId: 'i4', categoryId: 'c_c' }, { itemId: 'i5', categoryId: 'c_t' }, { itemId: 'i6', categoryId: 'c_c' }], prompt: 'Sort each situation as tension or compression.', explanation: 'Tension pulls a material apart (ropes, springs, cables); compression pushes it together (columns, cushions, walls).', objective: 'Distinguish tension from compression.', topic: 'materials-structures', subtopic: 'forces-in-structures', difficulty: 3, gradeMin: 7, gradeMax: 9, hints: [{ level: 1, text: 'Is the material being stretched or squashed?' }], ...S }),

  fillComplete({ template: 'The steps a team follows from a problem to a final solution are called the ___ process.', blanks: [{ id: 'b1', type: 'text', label: 'process', maxLength: 18 }], answers: [{ blankId: 'b1', type: 'text', accepted: ['design', 'design process', 'engineering design'] }], prompt: 'The steps a team follows from a problem to a final solution are called the ___ process.', explanation: 'The design process covers defining, researching, designing, prototyping and testing.', objective: 'Name the engineering design process.', topic: 'design-process', subtopic: 'define-problem', difficulty: 2, gradeMin: 7, gradeMax: 9, hints: [{ level: 1, text: 'It starts with a problem and ends with a tested solution.' }], ...S }),

  ordering({ items: [{ id: 'o1', label: 'Build a prototype' }, { id: 'o2', label: 'Define the problem' }, { id: 'o3', label: 'Test and evaluate' }, { id: 'o4', label: 'Design a solution' }, { id: 'o5', label: 'Research ideas' }], order: ['o2', 'o5', 'o4', 'o1', 'o3'], prompt: 'Arrange the design process steps in order.', explanation: 'Define the problem → research → design → build a prototype → test and evaluate.', objective: 'Order the engineering design process.', topic: 'design-process', subtopic: 'define-problem', difficulty: 2, gradeMin: 7, gradeMax: 9, hints: [{ level: 1, text: 'Building comes after designing but before testing.' }], ...S }),

  numberLogic({ problem: 'A 20-tooth gear turns a 10-tooth gear. How many times does the 10-tooth gear turn for each turn of the 20-tooth gear?', answerFormat: 'integer', answer: { type: 'exact', value: 2 }, prompt: 'A 20-tooth gear turns a 10-tooth gear. How many times does the 10-tooth gear turn for each turn of the 20-tooth gear?', explanation: 'The smaller gear has half the teeth, so it turns twice as fast: 20 ÷ 10 = 2.', objective: 'Compute the gear ratio.', topic: 'mechanisms-machines', subtopic: 'levers-pulleys-gears', difficulty: 3, gradeMin: 7, gradeMax: 9, hints: [{ level: 1, text: 'Divide the teeth of the larger gear by the smaller.' }], ...S }),

  scenario({
    scenarioText: 'You must build a small footbridge across a stream. People will walk across it carrying light loads.',
    entryDecision: 'd1',
    decisions: [
      { id: 'd1', text: 'Which beam shape is strongest under load?', options: [
        { id: 'opt_i', text: 'An I-beam', nextDecision: null, outcomeText: 'An I-beam resists bending with little material — the best choice.' },
        { id: 'opt_flat', text: 'A thin flat plank', nextDecision: null, outcomeText: 'A flat plank can sag or crack under the load.' },
        { id: 'opt_rope', text: 'A single rope', nextDecision: null, outcomeText: 'A rope cannot support a walking surface.' },
      ] },
    ],
    optimalPath: [{ decisionId: 'd1', optionId: 'opt_i' }],
    prompt: 'Choose the strongest beam for the bridge.',
    explanation: 'An I-beam shapes the material to resist bending, making it strong and efficient for a bridge.',
    objective: 'Choose an efficient structural shape.',
    topic: 'materials-structures', subtopic: 'structures-stability', difficulty: 3, gradeMin: 7, gradeMax: 9,
    hints: [{ level: 1, text: 'The shape should resist bending under weight.' }], ...S,
  }),
]