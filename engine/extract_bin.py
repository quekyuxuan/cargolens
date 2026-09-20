"""Turn PDF / DOCX / XLSX bytes into text, then reuse the text extractor."""
import io
import zipfile
from xml.etree import ElementTree

from extract_txt import extract_text_fields

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


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
    # Stdlib only: python-docx needs lxml, which Windows Application Control can block.
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        xml = zf.read("word/document.xml")
    body = ElementTree.fromstring(xml).find(W + "body")
    if body is None:
        return ""

    parts = [_para_text(p) for p in body.findall(W + "p")]
    for table in body.findall(W + "tbl"):
        for row in table.findall(W + "tr"):
            cells = [_cell_text(tc).strip() for tc in row.findall(W + "tc")]
            if len(cells) >= 2:
                parts.append(cells[0] + ": " + cells[1])
            else:
                parts.append(" | ".join(cells))
    return "\n".join(parts)


def _para_text(p):
    out = []
    for run in p.iter(W + "r"):
        for node in run:
            if node.tag == W + "t":
                out.append(node.text or "")
            elif node.tag in (W + "br", W + "cr"):
                # A soft break separates company name from address; keep the line split.
                out.append("\n")
            elif node.tag == W + "tab":
                out.append("\t")
    return "".join(out)


def _cell_text(tc):
    return "\n".join(_para_text(p) for p in tc.findall(W + "p"))


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
