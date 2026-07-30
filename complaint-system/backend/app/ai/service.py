"""
Bridges the SQLAlchemy Complaint model and the LangGraph analysis pipeline.
"""
from app.ai.graph import complaint_analysis_graph, intake_extraction_graph
from app.ai.prompts import build_complaint_context
from app.models.complaint import Complaint


def _complaint_to_dict(complaint: Complaint) -> dict:
    return {
        "product_name": complaint.product_name,
        "batch_number": complaint.batch_number,
        "customer_name": complaint.customer_name,
        "customer_contact": complaint.customer_contact,
        "category": complaint.category.value if complaint.category else None,
        "severity": complaint.severity.value if complaint.severity else None,
        "description": complaint.description,
    }


def run_ai_analysis(complaint: Complaint) -> dict:
    """
    Runs the full LangGraph pipeline against a complaint and returns the
    combined result: summary, risk, category, root cause, CAPA recommendation,
    completeness check, plus any per-node errors that fell back gracefully.
    """
    complaint_data = _complaint_to_dict(complaint)
    initial_state = {
        "complaint_data": complaint_data,
        "context": build_complaint_context(complaint_data),
        "errors": [],
    }

    final_state = complaint_analysis_graph.invoke(initial_state)

    return {
        "summary": final_state.get("summary"),
        "risk": final_state.get("risk"),
        "category": final_state.get("category"),
        "root_cause": final_state.get("root_cause"),
        "capa": final_state.get("capa"),
        "completeness": final_state.get("completeness"),
        "errors": final_state.get("errors", []),
    }


def run_intake_extraction(raw_text: str) -> dict:
    """
    Runs the intake-extraction graph against raw complaint text (pasted
    email content, or text pulled from an uploaded PDF/image) and returns
    the extracted fields plus an error note if the LLM call fell back.
    """
    final_state = intake_extraction_graph.invoke({"raw_text": raw_text})
    return {
        "fields": final_state.get("fields") or {},
        "error": final_state.get("error"),
    }
