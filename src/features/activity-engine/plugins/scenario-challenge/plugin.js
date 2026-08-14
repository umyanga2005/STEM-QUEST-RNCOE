/**
 * Activity Engine — scenario-challenge plugin (Task 4.12).
 *
 * The ninth production activity plugin. Implements the 7-method plugin
 * contract for the `scenario` activity type against the Task 3.2 schema
 * contract (payload.schema.json + correct-answer.schema.json).
 *
 * Domain model:
 *   - payload.scenarioText     — the mission the student reads
 *   - payload.entryDecision    — where the student starts
 *   - payload.decisions[]      — 1..8 decision nodes { id, text, options[] }
 *   - options[]                — 2..4 decision branches
 *                                { id, text, nextDecision|null, outcomeText }
 *   - correctAnswer.optimalPath[]    — the authored optimal
 *                                { decisionId, optionId } step sequence
 *   - correctAnswer.acceptableOptions — optional per-decision acceptable
 *                                option ids (in addition to the optimal one)
 *
 * Scenario Challenge is a BRANCHED DECISION TREE, not an MCQ: the student
 * reads the scenario, faces a decision, chooses a branch, sees its
 * consequence (`outcomeText`), follows `nextDecision`, and continues until a
 * terminal option ends the scenario. The submitted response is
 * `{ path: [{ decisionId, optionId }] }` — the ordered steps actually chosen,
 * mirroring the correct-answer `optimalPath` step shape.
 *
 * Security: `render` carries the PUBLIC tree only — every decision, option,
 * `nextDecision`, and `outcomeText` is student-facing navigation content from
 * the payload. `optimalPath` and `acceptableOptions` (the hidden answer)
 * never reach the render path; they flow only through `validateAnswer`
 * (server-only), where the semantic port of the catalog rule
 * `scenario.entry-decision-exists` also runs. `nextDecision` is public
 * navigation data — it is NOT the answer; the server decides whether the
 * selected path is optimal (§15 of the task).
 *
 * Answer units: one per decision step. Partial credit = correct steps ÷
 * submitted path length, where a step is correct iff its chosen option is
 * the optimal option for that decision OR an authored acceptable alternative
 * at that decision. Plugins never compute the final score (D-041).
 */

import { applySemanticRules, createSemanticRule } from '../../validation/semantic/index.js'
import { engineError } from '../../errors/index.js'
import { findDecision, findOption } from './scenario-challenge-controller.js'

/**
 * Payload-only semantic rules (authoring-time). The JSON Schema's
 * `uniqueItems` is pure deep-equality (two decisions sharing an id with
 * different text, or two options sharing an id inside one decision, pass it),
 * and the schema does not constrain `nextDecision` beyond a format string, so
 * dangling references and self-loops would otherwise go unnoticed.
 */
const semanticRules = [
  createSemanticRule('scenario.decision-ids-unique', (payload) => {
    const ids = payload.decisions.map((d) => d.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'decision ids must be unique', path: '/decisions' }
  }),
  createSemanticRule('scenario.option-ids-unique', (payload) => {
    for (const decision of payload.decisions) {
      const ids = decision.options.map((o) => o.id)
      if (new Set(ids).size !== ids.length) {
        return {
          message: `options of decision "${decision.id}" must be unique`,
          path: `/decisions/${payload.decisions.indexOf(decision)}/options`,
        }
      }
    }
    return true
  }),
  createSemanticRule('scenario.entry-decision-exists', (payload) => {
    const ids = new Set(payload.decisions.map((d) => d.id))
    return ids.has(payload.entryDecision)
      ? true
      : { message: `entryDecision "${payload.entryDecision}" is not a decision`, path: '/entryDecision' }
  }),
  createSemanticRule('scenario.next-decision-exists', (payload) => {
    const ids = new Set(payload.decisions.map((d) => d.id))
    for (const decision of payload.decisions) {
      for (const option of decision.options) {
        if (option.nextDecision !== null && !ids.has(option.nextDecision)) {
          return {
            message: `option "${option.id}" references unknown nextDecision "${option.nextDecision}"`,
            path: `/decisions/${payload.decisions.indexOf(decision)}/options/${decision.options.indexOf(option)}/nextDecision`,
          }
        }
      }
    }
    return true
  }),
  createSemanticRule('scenario.option-no-self-loop', (payload) => {
    for (const decision of payload.decisions) {
      for (const option of decision.options) {
        if (option.nextDecision === decision.id) {
          return {
            message: `option "${option.id}" of decision "${decision.id}" points back to itself (infinite loop)`,
            path: `/decisions/${payload.decisions.indexOf(decision)}/options/${decision.options.indexOf(option)}/nextDecision`,
          }
        }
      }
    }
    return true
  }),
]

/**
 * Cross-document integrity checks ported from `schemas/validate.py`
 * `_check_pair` (scenario) — the catalog rule
 * `scenario.entry-decision-exists` — extended with the invariants that make
 * honest scoring possible: option ids unique within a decision, no
 * self-loops, and an optimalPath that is ACTUALLY traversable (starts at the
 * entry decision, each step follows the previous option's nextDecision, and
 * ends at a terminal option). Acceptable alternatives must exist at their
 * authored decision node. It needs both documents, so it runs server-side
 * (in `validateAnswer`) and is also exposed here for authoring tooling/tests.
 *
 * @param {object} payload - validated payload
 * @param {object} correctAnswer - server-only correct-answer document
 * @returns {Array<{ ruleId: string, message: string, path: string }>}
 */
export function validateScenarioAnswer(payload, correctAnswer) {
  const errors = []
  const decisions = Array.isArray(payload?.decisions) ? payload.decisions : []
  const decisionIds = decisions.map((d) => d.id)
  const decisionSet = new Set(decisionIds)

  // Payload references.
  if (!decisionSet.has(payload?.entryDecision)) {
    errors.push({
      ruleId: 'scenario.entry-decision-exists',
      message: `entryDecision "${payload?.entryDecision}" is not a decision`,
      path: '/entryDecision',
    })
  }
  for (const decision of decisions) {
    const optionIds = new Set()
    for (const option of decision.options ?? []) {
      if (option.nextDecision !== null && !decisionSet.has(option.nextDecision)) {
        errors.push({
          ruleId: 'scenario.next-decision-exists',
          message: `option "${option.id}" references unknown nextDecision "${option.nextDecision}"`,
          path: '/decisions',
        })
      }
      if (option.nextDecision === decision.id) {
        errors.push({
          ruleId: 'scenario.option-no-self-loop',
          message: `option "${option.id}" of decision "${decision.id}" points back to itself`,
          path: '/decisions',
        })
      }
      if (optionIds.has(option.id)) {
        errors.push({
          ruleId: 'scenario.option-ids-unique',
          message: `decision "${decision.id}" has duplicate option "${option.id}"`,
          path: '/decisions',
        })
      }
      optionIds.add(option.id)
    }
  }

  // Optimal path: must be present, then a real, traversable route to a
  // terminal option. The correct-answer schema already requires a non-empty
  // `optimalPath`; this keeps the standalone cross-doc check self-sufficient
  // (a document with only `acceptableOptions`, or a typo'd `path` field, is an
  // authoring bug that must never silently zero-score every student).
  const optimal = Array.isArray(correctAnswer?.optimalPath) ? correctAnswer.optimalPath : []
  if (optimal.length === 0) {
    errors.push({
      ruleId: 'scenario.optimal-path-missing',
      message: 'correctAnswer must define a non-empty optimalPath array',
      path: '/optimalPath',
    })
  }
  if (optimal.length > 0 && optimal[0].decisionId !== payload?.entryDecision) {
    errors.push({
      ruleId: 'scenario.optimal-path-traversable',
      message: `optimalPath must start at the entryDecision "${payload?.entryDecision}"`,
      path: '/optimalPath',
    })
  }
  const optimalSeen = new Set()
  for (const step of optimal) {
    const decision = findDecision(decisions, step?.decisionId)
    const option = findOption(decision, step?.optionId)
    if (!decision) {
      errors.push({
        ruleId: 'scenario.optimal-path-traversable',
        message: `optimalPath references unknown decision "${step?.decisionId}"`,
        path: '/optimalPath',
      })
    } else {
      if (!option) {
        errors.push({
          ruleId: 'scenario.optimal-path-traversable',
          message: `optimalPath option "${step?.optionId}" does not belong to decision "${step?.decisionId}"`,
          path: '/optimalPath',
        })
      }
      if (optimalSeen.has(step.decisionId)) {
        errors.push({
          ruleId: 'scenario.optimal-path-traversable',
          message: `optimalPath visits decision "${step.decisionId}" more than once`,
          path: '/optimalPath',
        })
      }
      optimalSeen.add(step.decisionId)
    }
  }
  for (let i = 1; i < optimal.length; i += 1) {
    const prevDecision = findDecision(decisions, optimal[i - 1].decisionId)
    const prevOption = findOption(prevDecision, optimal[i - 1].optionId)
    if (prevOption && prevOption.nextDecision !== optimal[i].decisionId) {
      errors.push({
        ruleId: 'scenario.optimal-path-traversable',
        message:
          `optimalPath jumps: option "${prevOption.id}" leads to "${prevOption.nextDecision}", ` +
          `not "${optimal[i].decisionId}"`,
        path: '/optimalPath',
      })
    }
  }
  const last = optimal[optimal.length - 1]
  const lastDecision = findDecision(decisions, last?.decisionId)
  const lastOption = findOption(lastDecision, last?.optionId)
  if (optimal.length > 0 && lastOption && lastOption.nextDecision !== null) {
    errors.push({
      ruleId: 'scenario.optimal-path-traversable',
      message: `optimalPath must end at a terminal option; "${lastOption.id}" continues to "${lastOption.nextDecision}"`,
      path: '/optimalPath',
    })
  }

  // Acceptable alternatives must exist at their authored decision node.
  for (const [decisionId, optionIds] of Object.entries(correctAnswer?.acceptableOptions ?? {})) {
    const decision = findDecision(decisions, decisionId)
    if (!decision) {
      errors.push({
        ruleId: 'scenario.acceptable-options-exist',
        message: `acceptableOptions references unknown decision "${decisionId}"`,
        path: '/acceptableOptions',
      })
      continue
    }
    const known = new Set(decision.options.map((o) => o.id))
    for (const optionId of optionIds) {
      if (!known.has(optionId)) {
        errors.push({
          ruleId: 'scenario.acceptable-options-exist',
          message: `acceptableOptions option "${optionId}" does not belong to decision "${decisionId}"`,
          path: `/acceptableOptions/${decisionId}`,
        })
      }
    }
  }

  return errors
}

function optionView(option) {
  return Object.freeze({
    id: option.id,
    text: typeof option.text === 'string' ? option.text : '',
    nextDecision:
      typeof option.nextDecision === 'string' ? option.nextDecision : null,
    outcomeText: typeof option.outcomeText === 'string' ? option.outcomeText : '',
  })
}

function decisionView(decision) {
  return Object.freeze({
    id: decision.id,
    text: typeof decision.text === 'string' ? decision.text : '',
    options: Object.freeze(decision.options.map(optionView)),
  })
}

function mediaView(media) {
  return media.map((item) =>
    Object.freeze({
      ref: typeof item.ref === 'string' ? item.ref : '',
      alt: typeof item.alt === 'string' ? item.alt : '',
      role: typeof item.role === 'string' ? item.role : 'illustration',
    })
  )
}

export const scenarioChallengePlugin = {
  type: 'scenario-challenge',
  name: 'Scenario Challenge',
  version: '1.0.0',
  schemaVersion: '1.0',

  /**
   * Client-safe render descriptor. Carries the PUBLIC tree only: the mission
   * text, optional media, the entry decision, and every decision with its
   * options (including the public `nextDecision` navigation reference and the
   * public `outcomeText` consequence). The hidden answer — `optimalPath` and
   * `acceptableOptions` — is never read here.
   * @returns {object} frozen descriptor consumed by the React renderer
   */
  render(ctx) {
    const question = ctx.question ?? {}
    const payload = question.payload ?? {}
    const decisions = Array.isArray(payload.decisions) ? payload.decisions : []
    const media = Array.isArray(payload.media) ? mediaView(payload.media) : null

    return Object.freeze({
      kind: 'scenario-challenge',
      prompt: typeof question.prompt === 'string' ? question.prompt : '',
      instructions: typeof question.instructions === 'string' ? question.instructions : '',
      scenarioText: typeof payload.scenarioText === 'string' ? payload.scenarioText : '',
      media,
      entryDecision: typeof payload.entryDecision === 'string' ? payload.entryDecision : null,
      decisions: Object.freeze(decisions.map(decisionView)),
    })
  },

  /**
   * Authoring-time payload validation (schema layer runs first in the engine).
   * @returns {{ valid: boolean, errors: Array<object> }}
   */
  validatePayload(payload) {
    return applySemanticRules(semanticRules, payload)
  },

  /**
   * Server-only answer validation. Authoring-integrity failures
   * (`validateScenarioAnswer`) throw `ACTIVITY_PAYLOAD_SEMANTIC_INVALID` —
   * those are author bugs, never student mistakes. The submission must be a
   * real navigated path: `{ path: [{ decisionId, optionId }] }` starting at
   * the entry decision, following the public-tree transitions exactly
   * (each next step must be the previous option's `nextDecision`), visiting
   * no decision twice, and ending at a terminal option. Unknown ids, wrong
   * options, impossible jumps, duplicate decisions, incomplete paths,
   * malformed arrays, and unexpected fields are rejected with
   * `ACTIVITY_ANSWER_INVALID` — a forged path can never inflate credit.
   *
   * Correctness is decided ONLY by the authored answer model: a step is
   * correct iff its option is the optimal option for that decision or an
   * authored acceptable alternative at that decision.
   *
   * @returns {{ correct: boolean, detail: object }}
   * @throws {ActivityEngineError}
   */
  validateAnswer({ submission, payload, correctAnswer }) {
    const integrity = validateScenarioAnswer(payload, correctAnswer)
    if (integrity.length > 0) {
      throw engineError.payloadSemanticInvalid('scenario-challenge', integrity)
    }

    const steps = parseResponse(submission.response)
    const decisions = payload.decisions
    const byId = new Map(decisions.map((d) => [d.id, d]))

    // Start: the path must begin at the entry decision.
    if (steps[0].decisionId !== payload.entryDecision) {
      throw engineError.answerInvalid(
        'scenario-challenge',
        `the path must start at the entryDecision "${payload.entryDecision}"`
      )
    }

    // Reference integrity + continuity + completion.
    const seen = new Set()
    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i]
      const decision = byId.get(step.decisionId)
      if (!decision) {
        throw engineError.answerInvalid('scenario-challenge', `unknown decision id "${step.decisionId}"`)
      }
      if (seen.has(step.decisionId)) {
        throw engineError.answerInvalid(
          'scenario-challenge',
          `decision "${step.decisionId}" appears more than once in the path`
        )
      }
      seen.add(step.decisionId)

      const option = findOption(decision, step.optionId)
      if (!option) {
        throw engineError.answerInvalid(
          'scenario-challenge',
          `option "${step.optionId}" does not belong to decision "${step.decisionId}"`
        )
      }

      // Continuity: the next step must be this option's actual nextDecision.
      const nextStep = steps[i + 1]
      if (nextStep && option.nextDecision !== nextStep.decisionId) {
        throw engineError.answerInvalid(
          'scenario-challenge',
          `option "${step.optionId}" leads to "${option.nextDecision}", not "${nextStep.decisionId}"`
        )
      }

      // Completion: the last step must be a terminal option.
      if (!nextStep && option.nextDecision !== null) {
        throw engineError.answerInvalid(
          'scenario-challenge',
          `the path is incomplete: option "${step.optionId}" continues to "${option.nextDecision}"`
        )
      }
    }

    // Scoring facts — decided exclusively by the authored answer model.
    const optimalOptionByDecision = new Map()
    for (const step of correctAnswer.optimalPath) {
      optimalOptionByDecision.set(step.decisionId, step.optionId)
    }
    const acceptableByDecision = new Map()
    for (const [decisionId, optionIds] of Object.entries(correctAnswer.acceptableOptions ?? {})) {
      acceptableByDecision.set(decisionId, new Set(optionIds))
    }

    const submitted = steps.map((step) => {
      const optimal = optimalOptionByDecision.get(step.decisionId)
      const acceptable = acceptableByDecision.get(step.decisionId)
      const correct =
        step.optionId === optimal || (acceptable !== undefined && acceptable.has(step.optionId))
      return Object.freeze({ decisionId: step.decisionId, optionId: step.optionId, correct })
    })
    const correctCount = submitted.filter((s) => s.correct).length

    return {
      correct: correctCount === steps.length && steps.length > 0,
      detail: Object.freeze({
        total: steps.length,
        correctCount,
        submitted: Object.freeze(submitted),
      }),
    }
  },

  /**
   * Raw scoring inputs. Partial credit = correct steps ÷ submitted path
   * length (D-041). The engine guards the fraction; the central scoring
   * service does the arithmetic. The evidence (submitted steps with a
   * per-step correctness flag) never carries the optimal option for wrong
   * steps.
   */
  scoringInputs(ctx, validation) {
    const detail = validation.detail
    const total = detail?.total ?? 0
    const correctCount = detail?.correctCount ?? 0
    const metrics = ctx.submission.interactionMetrics
    return {
      correctnessFraction: total > 0 ? correctCount / total : 0,
      scorableUnits: total,
      correctUnits: correctCount,
      attemptsUsed: metrics.attemptsUsed,
      hintsUsed: metrics.hintsUsed,
      interactionMetrics: metrics,
      evidence: detail?.submitted ?? null,
    }
  },

  /** Authored, progressive hints — never derived from the answer path. */
  buildHints(question) {
    const hints = Array.isArray(question?.hints) ? question.hints : []
    return hints.map((hint, index) => ({
      id: `hint-${index + 1}`,
      level: typeof hint.level === 'number' && hint.level >= 1 ? hint.level : index + 1,
      text: typeof hint.text === 'string' ? hint.text : '',
    }))
  },

  /** Learning-oriented feedback; never reveals the optimal path. */
  feedback(ctx, validation, state) {
    const total = validation.detail?.total ?? 1
    const correctCount = validation.detail?.correctCount ?? 0
    const fraction = total > 0 ? correctCount / total : 0
    const unit = total === 1 ? 'decision' : 'decisions'

    if (ctx.submission?.state === 'timeout' || state === 'timeout') {
      return {
        state: 'timeout',
        title: 'Time is up',
        message: 'The clock ran out before you finished the scenario.',
        explanation: 'Decision scenarios reward careful reasoning under pressure.',
        guidance: 'Read the mission, then weigh the consequence of each choice.',
      }
    }
    if (fraction === 1) {
      return {
        state: state ?? 'correct',
        title: 'Strong decisions',
        message: `You chose the best approach at every one of your ${total} ${unit}.`,
        explanation: 'Every decision you made matched the best path for the scenario.',
        guidance: 'Great critical thinking — move on to the next challenge.',
      }
    }
    if (fraction > 0) {
      return {
        state: state ?? 'partial',
        title: 'Good reasoning, room to grow',
        message: `${correctCount} of your ${total} ${unit} matched the best approach.`,
        explanation: 'Some decisions were strong; others led away from the best outcome.',
        guidance: 'Think about the consequence each option causes before you choose.',
      }
    }
    return {
      state: state ?? 'incorrect',
      title: 'Rethink the scenario',
      message: 'None of your decisions matched the best approach.',
      explanation: 'Your choices led to consequences the best approach would avoid.',
      guidance: 'Consider the evidence in the mission and the effect of each option.',
    }
  },

  /**
   * Availability decision. The activity is available by default; callers can
   * opt out per deployment via `featureFlags['scenario-challenge'] = false`.
   * The tree is navigated with real buttons and is fully keyboard-reachable,
   * so a broad range of devices and input methods can play it.
   */
  availableOn(ctx) {
    const flags = ctx.featureFlags ?? {}
    if (flags['scenario-challenge'] === false) return false
    return true
  },
}

/**
 * Response shape gate. The schema-compatible submission is a single object
 * `{ path: [{ decisionId, optionId }] }` — a non-empty ordered array of
 * (decision, option) steps, each with exactly the two string fields and no
 * unexpected fields anywhere. Malformed or forged responses (including
 * embedded correctness/score/optimal data) are rejected, never silently
 * coerced.
 */
function parseResponse(response) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw engineError.answerInvalid('scenario-challenge', '`response` must be an object')
  }
  const keys = Object.keys(response)
  if (keys.length !== 1 || keys[0] !== 'path') {
    throw engineError.answerInvalid('scenario-challenge', '`response` must contain exactly the `path` field')
  }
  if (!Array.isArray(response.path) || response.path.length === 0) {
    throw engineError.answerInvalid('scenario-challenge', '`response.path` must be a non-empty array')
  }
  return response.path.map((step, index) => {
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      throw engineError.answerInvalid('scenario-challenge', `path step ${index + 1} must be an object`)
    }
    const stepKeys = Object.keys(step)
    if (stepKeys.length !== 2 || !stepKeys.includes('decisionId') || !stepKeys.includes('optionId')) {
      throw engineError.answerInvalid(
        'scenario-challenge',
        `path step ${index + 1} must contain exactly "decisionId" and "optionId"`
      )
    }
    if (typeof step.decisionId !== 'string' || step.decisionId.length === 0) {
      throw engineError.answerInvalid('scenario-challenge', 'each decisionId must be a non-empty string')
    }
    if (typeof step.optionId !== 'string' || step.optionId.length === 0) {
      throw engineError.answerInvalid('scenario-challenge', 'each optionId must be a non-empty string')
    }
    return { decisionId: step.decisionId, optionId: step.optionId }
  })
}

/**
 * Registers the scenario-challenge plugin on an engine facade.
 * @param {object} engine - engine from `createClientActivityEngine()` /
 *                          `createServerActivityEngine()`
 * @returns {object} the same engine (chainable)
 */
export function registerScenarioChallenge(engine) {
  return engine.register(scenarioChallengePlugin)
}

export default scenarioChallengePlugin