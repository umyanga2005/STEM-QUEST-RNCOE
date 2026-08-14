"""STEM QUEST schema validation (Task 3.2).

Three layers:
  1. Meta-validation: every schema file validates against JSON Schema 2020-12.
  2. Example validation: every example validates against its activity schema.
     Files prefixed `invalid-` are expected to FAIL; all others must PASS.
  3. Semantic pair checks: correct-answer ids must reference ids that exist in
     a paired payload (cross-file reference integrity).

Usage:
    python3 schemas/validate.py
Exit code is non-zero if any check fails.
"""

from __future__ import annotations

import glob
import json
import os
import re
import sys
from collections import defaultdict

from jsonschema import Draft202012Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

ROOT = os.path.dirname(os.path.abspath(__file__))
COMMON = os.path.join(ROOT, "common")
ACTIVITIES = os.path.join(ROOT, "activities")
EXAMPLES = os.path.join(ROOT, "examples")

SCHEMA_ID_PREFIX = "https://stem-quest.dev/schemas/"


def load_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def schema_files() -> list[str]:
    return sorted(
        glob.glob(os.path.join(COMMON, "*.json"))
        + glob.glob(os.path.join(ACTIVITIES, "*", "*.json"))
    )


def build_registry() -> Registry:
    """Registry keyed by each schema's $id so external refs resolve locally."""
    resources = {}
    for path in schema_files():
        doc = load_json(path)
        sid = doc.get("$id")
        if not sid:
            raise ValueError(f"schema without $id: {path}")
        resources[sid] = Resource.from_contents(doc, default_specification=DRAFT202012)

    def retrieve(uri: str) -> Resource:
        try:
            return resources[uri]
        except KeyError:
            raise FileNotFoundError(f"cannot resolve {uri!r}") from None

    return Registry(retrieve=retrieve)


REGISTRY = build_registry()


def validator_for(schema: dict) -> Draft202012Validator:
    return Draft202012Validator(schema, registry=REGISTRY)


# ---------------------------------------------------------------------------
# Layer 1: meta-validation
# ---------------------------------------------------------------------------

def meta_validate() -> list[str]:
    problems: list[str] = []
    for path in schema_files():
        try:
            doc = load_json(path)
            Draft202012Validator.check_schema(doc)
        except Exception as exc:  # noqa: BLE001
            problems.append(f"META {path}: {exc}")
    return problems


# ---------------------------------------------------------------------------
# Layer 2: example validation
# ---------------------------------------------------------------------------

def example_files() -> list[str]:
    return sorted(glob.glob(os.path.join(EXAMPLES, "*", "*.json")))


def expected_valid(filename: str) -> bool:
    return not os.path.basename(filename).startswith("invalid-")


def example_validate() -> list[str]:
    problems: list[str] = []
    for ex in example_files():
        activity = os.path.basename(os.path.dirname(ex))
        base = os.path.basename(ex)
        kind = "correct-answer" if base.endswith("correct-answer.json") else "payload"
        if base in ("partial-credit.json",):
            kind = "correct-answer"
        schema_path = os.path.join(ACTIVITIES, activity, f"{kind}.schema.json")
        if not os.path.exists(schema_path):
            problems.append(f"NO SCHEMA for {ex}")
            continue
        schema = load_json(schema_path)
        try:
            doc = load_json(ex)
        except json.JSONDecodeError as exc:
            problems.append(f"JSON {ex}: {exc}")
            continue
        validator = validator_for(schema)
        errors = sorted(validator.iter_errors(doc), key=str)
        ok = not errors
        want = expected_valid(base)
        if ok != want:
            status = "VALID" if ok else "INVALID"
            problems.append(
                f"{ex}: {status} but expected {'valid' if want else 'invalid'}"
            )
            if errors and want:
                problems.append(f"    {errors[0].message}")
    return problems


# ---------------------------------------------------------------------------
# Layer 3: semantic cross-file pair checks
# ---------------------------------------------------------------------------

def id_set(*iterables) -> set[str]:
    out: set[str] = set()
    for it in iterables:
        out.update(it)
    return out


def find_example(activity: str, name: str) -> str:
    path = os.path.join(EXAMPLES, activity, name)
    if not os.path.exists(path):
        raise FileNotFoundError(f"missing paired example: {path}")
    return path


# (payload_file, correct_answer_file) pairs expected to be consistent
PAIRED_EXAMPLES = [
    ("drag-drop", "valid-payload-grade6-7.json", "valid-correct-answer.json"),
    ("matching", "valid-payload-grade6-7.json", "valid-correct-answer.json"),
    ("matching", "valid-payload-grade9-11.json", "grade9-11-correct-answer.json"),
    ("fill-complete", "valid-payload-grade6-7.json", "valid-correct-answer.json"),
    ("image-interaction", "valid-payload-grade6-7.json", "valid-correct-answer.json"),
    ("memory", "valid-payload-grade9-11.json", "valid-correct-answer.json"),
    ("ordering", "valid-payload-grade6-7.json", "valid-correct-answer.json"),
    ("ordering", "valid-payload-grade9-11.json", "grade9-11-correct-answer.json"),
    ("pattern", "minimal-valid-payload.json", "valid-correct-answer.json"),
    ("sorting", "valid-payload-grade6-7.json", "valid-correct-answer.json"),
    ("scenario", "valid-payload-grade9-11.json", "valid-correct-answer.json"),
    ("number-logic", "valid-payload-grade6-7.json", "valid-correct-answer.json"),
]


def semantic_checks() -> list[str]:
    problems: list[str] = []

    for activity, payload_name, answer_name in PAIRED_EXAMPLES:
        try:
            payload = load_json(find_example(activity, payload_name))
            answer = load_json(find_example(activity, answer_name))
        except FileNotFoundError as exc:
            problems.append(f"PAIR {activity}: {exc}")
            continue

        try:
            _check_pair(activity, payload, answer)
        except ValueError as exc:
            problems.append(f"PAIR {activity}: {exc}")

    return problems


def _check_pair(activity: str, payload: dict, answer: dict) -> None:
    if activity == "drag-drop":
        items = {i["id"] for i in payload["items"]}
        zones = {z["id"] for z in payload["zones"]}
        mapped = {m["itemId"] for m in answer["mappings"]}
        if mapped != items:
            raise ValueError(f"mappings must cover every item exactly once: {mapped} vs {items}")
        if {m["zoneId"] for m in answer["mappings"]} - zones:
            raise ValueError("mapping references a zone not in payload")

    elif activity == "matching":
        left = {i["id"] for i in payload["leftItems"]}
        right = {i["id"] for i in payload["rightItems"]}
        if {p["leftId"] for p in answer["pairs"]} != left:
            raise ValueError("pairs must cover every left item exactly once")
        if {p["rightId"] for p in answer["pairs"]} - right:
            raise ValueError("pairs reference a right item not in payload")

    elif activity == "fill-complete":
        blank_ids = {b["id"] for b in payload["blanks"]}
        for group in ("answers", "numeric", "expression"):
            for entry in answer.get(group, []):
                if entry["blankId"] not in blank_ids:
                    raise ValueError(f"{group} references unknown blank {entry['blankId']}")

    elif activity == "image-interaction":
        hotspot_ids = {h["id"] for h in payload["hotspots"]}
        if answer["mode"] == "tap":
            if set(answer.get("requiredHotspots", [])) - hotspot_ids:
                raise ValueError("requiredHotspots reference unknown hotspot")
        else:
            label_ids = {l["id"] for l in payload.get("labels", [])}
            for p in answer.get("placements", []):
                if p["hotspotId"] not in hotspot_ids:
                    raise ValueError("placement references unknown hotspot")
                if p["labelId"] not in label_ids:
                    raise ValueError("placement references unknown label")

    elif activity == "memory":
        card_ids = {c["id"] for c in payload["cards"]}
        grouped = [cid for g in answer["groups"] for cid in g["cardIds"]]
        if len(grouped) != len(set(grouped)):
            raise ValueError("a card appears in more than one group")
        if set(grouped) != card_ids:
            raise ValueError(f"groups must cover every card exactly once: {set(grouped)} vs {card_ids}")

    elif activity == "ordering":
        item_ids = {i["id"] for i in payload["items"]}
        if len(answer["order"]) != len(set(answer["order"])):
            raise ValueError("order has duplicates")
        if set(answer["order"]) != item_ids:
            raise ValueError("order must be a permutation of item ids")
        for anchor in payload.get("anchors", []):
            if answer["order"][anchor["position"]] != anchor["itemId"]:
                raise ValueError("anchored position does not match expected item")

    elif activity == "pattern":
        candidate_ids = {c["id"] for c in payload.get("candidates", [])}
        if answer["type"] == "candidate":
            if set(answer["acceptableIds"]) - candidate_ids:
                raise ValueError("acceptableIds reference unknown candidate")
        if payload["interaction"] == "fill-missing":
            if not (0 <= payload["missingAt"] < len(payload["sequence"])):
                raise ValueError("missingAt out of range")

    elif activity == "sorting":
        items = {i["id"] for i in payload["items"]}
        categories = {c["id"] for c in payload["categories"]}
        assigned = {a["itemId"] for a in answer["assignments"]}
        if assigned != items:
            raise ValueError("assignments must cover every item exactly once")
        if {a["categoryId"] for a in answer["assignments"]} - categories:
            raise ValueError("assignment references unknown category")

    elif activity == "scenario":
        decisions = {d["id"] for d in payload["decisions"]}
        if payload["entryDecision"] not in decisions:
            raise ValueError("entryDecision not in decisions")
        option_ids: dict[str, set[str]] = {}
        for d in payload["decisions"]:
            option_ids[d["id"]] = {o["id"] for o in d["options"]}
            for o in d["options"]:
                nxt = o.get("nextDecision")
                if nxt is not None and nxt not in decisions:
                    raise ValueError(f"option {o['id']} references unknown decision {nxt}")
        for step in answer["optimalPath"]:
            if step["decisionId"] not in decisions:
                raise ValueError("optimalPath references unknown decision")
            if step["optionId"] not in option_ids[step["decisionId"]]:
                raise ValueError("optimalPath option does not belong to its decision")
        for decision_id, opts in answer.get("acceptableOptions", {}).items():
            if decision_id not in decisions:
                raise ValueError("acceptableOptions references unknown decision")
            if set(opts) - option_ids.get(decision_id, set()):
                raise ValueError("acceptableOptions option does not belong to its decision")

    elif activity == "number-logic":
        if payload.get("parts") and not answer.get("parts"):
            raise ValueError("multi-part payload requires per-part correct answer")
        if not payload.get("parts") and answer.get("parts"):
            raise ValueError("parts in correct-answer but payload is single-part")
        if payload.get("parts"):
            part_ids = {p["id"] for p in payload["parts"]}
            if {p["partId"] for p in answer["parts"]} != part_ids:
                raise ValueError("correct-answer parts must match payload parts")
        t = answer["type"]
        if t in ("exact", "percent") and "value" not in answer:
            raise ValueError(f"type {t} requires value")
        if t == "tolerance" and ("value" not in answer or "tolerance" not in answer):
            raise ValueError("type tolerance requires value and tolerance")
        if t == "range" and ("min" not in answer or "max" not in answer):
            raise ValueError("type range requires min and max")
        if t == "fraction" and ("numerator" not in answer or "denominator" not in answer):
            raise ValueError("type fraction requires numerator and denominator")
        if t == "sequence" and "values" not in answer:
            raise ValueError("type sequence requires values")
        if t == "accepted-set" and "accepted" not in answer:
            raise ValueError("type accepted-set requires accepted")


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main() -> int:
    print("== Layer 1: schema meta-validation ==")
    meta = meta_validate()
    for p in meta:
        print("FAIL", p)
    print(f"  {len(schema_files())} schemas, {len(meta)} problem(s)")

    print("== Layer 2: example validation ==")
    ex = example_validate()
    for p in ex:
        print("FAIL", p)
    print(f"  {len(example_files())} examples, {len(ex)} problem(s)")

    print("== Layer 3: semantic pair checks ==")
    sem = semantic_checks()
    for p in sem:
        print("FAIL", p)
    total_pairs = len(PAIRED_EXAMPLES)
    print(f"  {total_pairs - len(sem)}/{total_pairs} pairs consistent")

    failed = len(meta) + len(ex) + len(sem)
    if failed:
        print(f"\nRESULT: FAIL ({failed} problem(s))")
        return 1
    print("\nRESULT: PASS — all schemas and examples valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
