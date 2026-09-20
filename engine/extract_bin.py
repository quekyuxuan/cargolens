"""Turn PDF / DOCX / XLSX bytes into text, then reuse the text extractor."""
import io
from extract_txt import extract_text_fields


def attachment_to_text(name, data):
    lower = (name or "").lower()
    if lower.endswith(".txt"):
        return data.decode("utf-8", errors="replace")
    if lower.endswith(".pdf"):
        return _pdf(data)
    if lower.endswith(".docx"):
        return _docx(data)
    if lower.endswith(".xlsx"):
        return _xlsx(data)
    return data.decode("utf-8", errors="replace")


def extract_attachment(name, data):
    text = attachment_to_text(name, data)
    return text, extract_text_fields(text)


def _pdf(data):
    import pdfplumber

    pages = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text() or "")
    return "\n".join(pages)


def _docx(data):
    from docx import Document

    doc = Document(io.BytesIO(data))
    parts = [p.text for p in doc.paragraphs]
    for table in doc.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells]
            if len(cells) >= 2:
                parts.append(cells[0] + ": " + cells[1])
            else:
                parts.append(" | ".join(cells))
    return "\n".join(parts)


def _xlsx(data):
    import openpyxl

    wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
    lines = []
    for ws in wb.worksheets:
        for row in ws.iter_rows(values_only=True):
            cells = ["" if c is None else str(c) for c in row]
            if len(cells) >= 2 and cells[0]:
                lines.append(str(cells[0]) + ": " + str(cells[1]))
            elif any(cells):
                lines.append(" ".join(cells))
    return "\n".join(lines)
