/**
 * Activity Engine — semantic rules infrastructure (Task 4.1, report §4).
 *
 * Schema validation catches structure; semantic rules catch meaning that a
 * JSON Schema cannot express (cross-field / cross-document invariants).
 *
 * The reusable infra here is `applySemanticRules` / `SemanticRuleSet`. The
 * catalog below documents every semantic rule currently implemented in
 * `schemas/validate.py` (Task 3.2) and gives each a stable rule id + owning
 * activity type, so the first real activity plugin has a concrete checklist
 * to port into its `validatePayload` implementation. No per-activity rules
 * are implemented in this task — only the infrastructure and the catalog.
 */

/** All semantic rules, keyed by rule id. Used for docs + stable ids. */
export const SEMANTIC_RULES_CATALOG = Object.freeze({
  // drag-drop (schemas/validate.py -> _check_pair drag-drop)
  'drag-drop.mappings-cover-items': {
    activityType: 'drag-drop',
    source: 'validate.py:_check_pair (drag-drop)',
    description:
      'correct-answer mappings must reference every payload item exactly once.',
    stage: 'schema-independent',
    implementedIn: 'validate.py only — engine plugin TBD',
  },
  'drag-drop.mappings-zone-exists': {
    activityType: 'drag-drop',
    source: 'validate.py:_check_pair (drag-drop)',
    description: 'mapped zoneId must exist among payload zones.',
    stage: 'schema-independent',
    implementedIn: 'validate.py only — engine plugin TBD',
  },
  // matching
  'matching.pairs-cover-left': {
    activityType: 'matching',
    source: 'validate.py:_check_pair (matching)',
    description: 'pairs must cover every left item exactly once.',
    stage: 'schema-independent',
    implementedIn: 'validate.py only — engine plugin TBD',
  },
  'matching.right-exists': {
    activityType: 'matching',
    source: 'validate.py:_check_pair (matching)',
    description: 'paired rightId must exist among payload rightItems.',
    stage: 'schema-independent',
    implementedIn: 'validate.py only — engine plugin TBD',
  },
  // fill-complete
  'fill-complete.blanks-referenced': {
    activityType: 'fill-complete',
    source: 'validate.py:_check_pair (fill-complete)',
    description: 'every answer/numeric/expression entry must reference a known blankId.',
    stage: 'schema-independent',
    implementedIn: 'validate.py only — engine plugin TBD',
  },
  // image-interaction
  'image-interaction.hotspots-exist': {
    activityType: 'image-interaction',
    source: 'validate.py:_check_pair (image-interaction)',
    description: 'requiredHotspots/placements must reference known hotspot/label ids.',
    stage: 'schema-independent',
    implementedIn: 'validate.py only — engine plugin TBD',
  },
  // memory
  'memory.groups-cover-cards': {
    activityType: 'memory',
    source: 'validate.py:_check_pair (memory)',
    description: 'groups must cover every card exactly once with no duplicates.',
    stage: 'schema-independent',
    implementedIn: 'validate.py only — engine plugin TBD',
  },
  // ordering
  'ordering.order-permutation': {
    activityType: 'ordering',
    source: 'validate.py:_check_pair (ordering)',
    description: 'order must be a permutation of item ids, honouring anchors.',
    stage: 'schema-independent',
    implementedIn: 'validate.py only — engine plugin TBD',
  },
  // pattern
  'pattern.acceptable-ids-exist': {
    activityType: 'pattern',
    source: 'validate.py:_check_pair (pattern)',
    description: 'acceptableIds must reference known candidates; missingAt in range.',
    stage: 'schema-independent',
    implementedIn: 'validate.py only — engine plugin TBD',
  },
  // sorting
  'sorting.assignments-cover-items': {
    activityType: 'sorting',
    source: 'validate.py:_check_pair (sorting)',
    description: 'assignments must cover every item exactly once; categories must exist.',
    stage: 'schema-independent',
    implementedIn: 'validate.py only — engine plugin TBD',
  },
  // scenario
  'scenario.entry-decision-exists': {
    activityType: 'scenario',
    source: 'validate.py:_check_pair (scenario)',
    description: 'entryDecision and every nextDecision/optimalPath/acceptedOption must exist.',
    stage: 'schema-independent',
    implementedIn: 'validate.py only — engine plugin TBD',
  },
  // number-logic
  'number-logic.parts-match': {
    activityType: 'number-logic',
    source: 'validate.py:_check_pair (number-logic)',
    description: 'multi-part payload requires per-part correct answer; parts ids must match.',
    stage: 'schema-independent',
    implementedIn: 'validate.py only — engine plugin TBD',
  },
  'number-logic.type-fields': {
    activityType: 'number-logic',
    source: 'validate.py:_check_pair (number-logic)',
    description: 'each answer type (exact/tolerance/range/fraction/…) requires its fields.',
    stage: 'schema-independent',
    implementedIn: 'validate.py only — engine plugin TBD',
  },
})

/**
 * Applies an array of semantic rule checks to a payload.
 *
 * @param {Array<{ id: string, check: (payload) => boolean|{valid,errors}|string }>} rules
 * @param {object} payload
 * @returns {{ valid: boolean, errors: Array<{ code, ruleId, message, path }> }}
 */
export function applySemanticRules(rules, payload) {
  const errors = []
  for (const rule of rules ?? []) {
    let outcome
    try {
      outcome = rule.check(payload)
    } catch (err) {
      outcome = { valid: false, message: err.message }
    }
    if (outcome === true) continue
    if (outcome && outcome.valid === true) continue

    const message = typeof outcome === 'string' ? outcome : outcome?.message
    errors.push({
      code: 'ACTIVITY_PAYLOAD_SEMANTIC_INVALID',
      ruleId: rule.id,
      message: message ?? `semantic rule "${rule.id}" failed`,
      path: outcome?.path ?? null,
    })
  }
  return { valid: errors.length === 0, errors }
}

/** Convenience builder for a semantic rule object. */
export function createSemanticRule(id, check) {
  return Object.freeze({ id, check })
}

/** Small rule-set collection helper for plugins. */
export class SemanticRuleSet {
  #rules = []
  add(id, check) {
    this.#rules.push(createSemanticRule(id, check))
    return this
  }
  get rules() {
    return this.#rules
  }
  run(payload) {
    return applySemanticRules(this.#rules, payload)
  }
}
