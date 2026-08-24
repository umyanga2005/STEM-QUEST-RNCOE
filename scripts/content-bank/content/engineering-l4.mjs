/**
 * Content Bank — Engineering, Level 4 (Task 5.14, Batch 1).
 * Blueprint §6.1 L4 (DD5 MT5 OR10 ST5 FC15 II15 PA5 ME5 SC25 NL10),
 * topics §7.4 L4, difficulty §5.3 L4 (D2 25 / D3 45 / D4 30).
 */
import { src, matching, fillComplete, numberLogic, scenario } from './helpers.mjs'

const S = { level: 4, ...src('engineering') }

export default [
  matching({ leftItems: [{ id: 'l1', text: 'Resistor' }, { id: 'l2', text: 'Capacitor' }, { id: 'l3', text: 'LED' }, { id: 'l4', text: 'Switch' }], rightItems: [{ id: 'r1', text: 'Limits current' }, { id: 'r2', text: 'Stores charge' }, { id: 'r3', text: 'Emits light' }, { id: 'r4', text: 'Controls the flow' }], pairs: [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l2', rightId: 'r2' }, { leftId: 'l3', rightId: 'r3' }, { leftId: 'l4', rightId: 'r4' }], prompt: 'Match each electronic component to its function.', explanation: 'A resistor limits current, a capacitor stores charge, an LED emits light and a switch controls the flow.', objective: 'Match electronic components to functions.', topic: 'electronics-circuits', subtopic: 'components', difficulty: 2, gradeMin: 8, gradeMax: 11, hints: [{ level: 1, text: 'LED stands for light-emitting diode.' }], ...S }),

  fillComplete({ template: 'A device that turns electrical energy into motion is called a ___.', blanks: [{ id: 'b1', type: 'text', label: 'device', maxLength: 10 }], answers: [{ blankId: 'b1', type: 'text', accepted: ['motor'] }], prompt: 'A device that turns electrical energy into motion is called a ___.', explanation: 'A motor converts electrical energy into rotational motion.', objective: 'Name the device that converts electricity to motion.', topic: 'electronics-circuits', subtopic: 'sensors-actuators', difficulty: 3, gradeMin: 8, gradeMax: 11, hints: [{ level: 1, text: 'It spins when electricity flows through it.' }], ...S }),

  numberLogic({ problem: 'A robot travels 3 m in 6 seconds. What is its speed?', answerFormat: 'decimal', answer: { type: 'exact', value: 0.5 }, prompt: 'A robot travels 3 m in 6 seconds. What is its speed in m/s?', explanation: 'Speed = distance ÷ time = 3 ÷ 6 = 0.5 m/s.', objective: 'Calculate the speed of a moving mechanism.', topic: 'mechanisms-machines', subtopic: 'motion-mechanisms', difficulty: 2, gradeMin: 8, gradeMax: 11, hints: [{ level: 1, text: 'Divide the distance by the time.' }], ...S }),

  scenario({
    scenarioText: 'You are programming a robot that must stop before it falls off the edge of a table.',
    entryDecision: 'd1',
    decisions: [
      { id: 'd1', text: 'Which sensor should you add?', options: [
        { id: 'opt_ultra', text: 'An ultrasonic distance sensor', nextDecision: null, outcomeText: 'Ultrasonic sensors measure distance ahead — ideal for stopping at the edge.' },
        { id: 'opt_light', text: 'A light sensor', nextDecision: null, outcomeText: 'A light sensor does not reliably detect a table edge.' },
        { id: 'opt_mic', text: 'A microphone', nextDecision: null, outcomeText: 'A microphone cannot sense edges.' },
      ] },
    ],
    optimalPath: [{ decisionId: 'd1', optionId: 'opt_ultra' }],
    prompt: 'Choose the sensor that keeps the robot on the table.',
    explanation: 'An ultrasonic sensor sends sound and measures the echo, detecting the edge before the robot falls.',
    objective: 'Choose a sensor for edge detection.',
    topic: 'electronics-circuits', subtopic: 'sensors-actuators', difficulty: 3, gradeMin: 8, gradeMax: 11,
    hints: [{ level: 1, text: 'The sensor should measure how far away the floor is.' }], ...S,
  }),
]