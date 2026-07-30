"""
LangGraph workflow for AI-assisted complaint analysis.

Linear pipeline: summarize -> classify risk -> categorize -> root cause
-> CAPA recommendation -> completeness check.

Each node calls the LLM for its piece of structured output and writes it
into shared graph state. If a node's LLM call fails (bad/missing API key,
malformed response after retries, etc.), that node writes a fallback
result with an `error` note instead of raising — so one failing node
never blocks the rest of the pipeline or the API response.

Note: node identifiers registered with the graph (e.g. "summary_node")
are deliberately distinct from the state dict keys they write (e.g.
"summary") to avoid a LangGraph name collision between node names and
state keys.
"""
from typing import TypedDict

from langgraph.graph import StateGraph, END

from app.ai.llm_client import LLMError, get_structured_completion
from app.ai.prompts import (
    CAPA_SYSTEM_PROMPT,
    CATEGORY_SYSTEM_PROMPT,
    COMPLETENESS_SYSTEM_PROMPT,
    INTAKE_EXTRACTION_SYSTEM_PROMPT,
    RISK_SYSTEM_PROMPT,
    ROOT_CAUSE_SYSTEM_PROMPT,
    SUMMARY_SYSTEM_PROMPT,
    build_complaint_context,
    build_intake_prompt,
)
from app.ai.schemas import (
    CapaResult,
    CategoryResult,
    CompletenessResult,
    IntakeExtractionResult,
    RiskClassificationResult,
    RootCauseResult,
    SummaryResult,
)


class ComplaintAnalysisState(TypedDict, total=False):
    complaint_data: dict
    context: str

    summary: dict
    risk: dict
    category: dict
    root_cause: dict
    capa: dict
    completeness: dict

    errors: list[str]


def _fallback(state: ComplaintAnalysisState, node_label: str, exc: Exception) -> dict:
    errors = list(state.get("errors", []))
    errors.append(f"{node_label}: {exc}")
    return {"errors": errors}


def run_summary_node(state: ComplaintAnalysisState) -> dict:
    try:
        result: SummaryResult = get_structured_completion(
            SUMMARY_SYSTEM_PROMPT, state["context"], SummaryResult
        )
        return {"summary": result.model_dump()}
    except (LLMError, Exception) as exc:  # noqa: BLE001 - deliberate: any failure -> fallback
        fallback_update = _fallback(state, "summary", exc)
        fallback_update["summary"] = {"summary": "AI summary unavailable.", "error": str(exc)}
        return fallback_update


def run_risk_node(state: ComplaintAnalysisState) -> dict:
    try:
        result: RiskClassificationResult = get_structured_completion(
            RISK_SYSTEM_PROMPT, state["context"], RiskClassificationResult
        )
        return {"risk": result.model_dump()}
    except Exception as exc:  # noqa: BLE001
        fallback_update = _fallback(state, "risk", exc)
        fallback_update["risk"] = {
            "risk_level": "unknown",
            "rationale": "AI risk classification unavailable.",
            "error": str(exc),
        }
        return fallback_update


def run_category_node(state: ComplaintAnalysisState) -> dict:
    try:
        result: CategoryResult = get_structured_completion(
            CATEGORY_SYSTEM_PROMPT, state["context"], CategoryResult
        )
        return {"category": result.model_dump()}
    except Exception as exc:  # noqa: BLE001
        fallback_update = _fallback(state, "category", exc)
        fallback_update["category"] = {
            "category": "other",
            "confidence": 0.0,
            "error": str(exc),
        }
        return fallback_update


def run_root_cause_node(state: ComplaintAnalysisState) -> dict:
    try:
        result: RootCauseResult = get_structured_completion(
            ROOT_CAUSE_SYSTEM_PROMPT, state["context"], RootCauseResult
        )
        return {"root_cause": result.model_dump()}
    except Exception as exc:  # noqa: BLE001
        fallback_update = _fallback(state, "root_cause", exc)
        fallback_update["root_cause"] = {
            "likely_root_causes": [],
            "reasoning": "AI root cause analysis unavailable.",
            "error": str(exc),
        }
        return fallback_update


def run_capa_node(state: ComplaintAnalysisState) -> dict:
    try:
        result: CapaResult = get_structured_completion(
            CAPA_SYSTEM_PROMPT, state["context"], CapaResult
        )
        return {"capa": result.model_dump()}
    except Exception as exc:  # noqa: BLE001
        fallback_update = _fallback(state, "capa", exc)
        fallback_update["capa"] = {
            "corrective_actions": [],
            "preventive_actions": [],
            "error": str(exc),
        }
        return fallback_update


def run_completeness_node(state: ComplaintAnalysisState) -> dict:
    try:
        result: CompletenessResult = get_structured_completion(
            COMPLETENESS_SYSTEM_PROMPT, state["context"], CompletenessResult
        )
        return {"completeness": result.model_dump()}
    except Exception as exc:  # noqa: BLE001
        fallback_update = _fallback(state, "completeness", exc)
        fallback_update["completeness"] = {
            "is_complete": True,
            "missing_fields": [],
            "notes": "AI completeness check unavailable.",
            "error": str(exc),
        }
        return fallback_update


def build_graph():
    graph = StateGraph(ComplaintAnalysisState)

    graph.add_node("summary_node", run_summary_node)
    graph.add_node("risk_node", run_risk_node)
    graph.add_node("category_node", run_category_node)
    graph.add_node("root_cause_node", run_root_cause_node)
    graph.add_node("capa_node", run_capa_node)
    graph.add_node("completeness_node", run_completeness_node)

    graph.set_entry_point("summary_node")
    graph.add_edge("summary_node", "risk_node")
    graph.add_edge("risk_node", "category_node")
    graph.add_edge("category_node", "root_cause_node")
    graph.add_edge("root_cause_node", "capa_node")
    graph.add_edge("capa_node", "completeness_node")
    graph.add_edge("completeness_node", END)

    return graph.compile()


# Compiled once at import time; the graph itself is stateless (all state
# flows through the state dict passed to .invoke()), so it's safe to reuse.
complaint_analysis_graph = build_graph()


# ---------------------------------------------------------------------------
# Intake extraction graph: a single-node LangGraph pipeline that turns raw
# intake text (pasted email, or text pulled from an uploaded PDF/image) into
# structured fields for the Log Complaint form. Kept as its own small graph
# (rather than a bare function call) so it participates in the same
# LangGraph-based AI architecture as the analysis pipeline, and so it's easy
# to extend later (e.g. adding a duplicate-detection node here too).
# ---------------------------------------------------------------------------
class IntakeExtractionState(TypedDict, total=False):
    raw_text: str
    fields: dict
    error: str | None


def run_intake_extraction_node(state: IntakeExtractionState) -> dict:
    try:
        result: IntakeExtractionResult = get_structured_completion(
            INTAKE_EXTRACTION_SYSTEM_PROMPT, build_intake_prompt(state["raw_text"]), IntakeExtractionResult
        )
        return {"fields": result.model_dump()}
    except Exception as exc:  # noqa: BLE001 - deliberate: any failure -> fallback
        return {
            "fields": {
                "product_name": "",
                "batch_number": "",
                "customer_name": "",
                "customer_contact": "",
                "description": "",
                "category": "other",
                "severity": "medium",
            },
            "error": str(exc),
        }


def build_intake_graph():
    graph = StateGraph(IntakeExtractionState)
    graph.add_node("extract_node", run_intake_extraction_node)
    graph.set_entry_point("extract_node")
    graph.add_edge("extract_node", END)
    return graph.compile()


intake_extraction_graph = build_intake_graph()
