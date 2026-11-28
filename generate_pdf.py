import os
import pypdf
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

PDF_PATH = "MCA_Weekly_Timetable_Mon_to_Sat.pdf"

def build_pdf():
    doc = SimpleDocTemplate(
        PDF_PATH,
        pagesize=landscape(A4),
        leftMargin=20,
        rightMargin=20,
        topMargin=15,
        bottomMargin=15,
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    style_college = ParagraphStyle(
        "CollegeTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=14,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0F2942"),
    )
    style_dept = ParagraphStyle(
        "DeptTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#1E3A8A"),
    )
    style_doc_title = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#065F46"),
    )
    style_sub = ParagraphStyle(
        "SubInfo",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#4B5563"),
    )

    # Cell styles
    style_cell_header = ParagraphStyle(
        "CellHeader",
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9,
        alignment=TA_CENTER,
        textColor=colors.white,
    )
    style_cell_day = ParagraphStyle(
        "CellDay",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#111827"),
    )
    style_cell_code = ParagraphStyle(
        "CellCode",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=9.5,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#1E3A8A"),
    )
    style_cell_fac = ParagraphStyle(
        "CellFac",
        fontName="Helvetica",
        fontSize=6.5,
        leading=8,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#374151"),
    )
    style_break = ParagraphStyle(
        "CellBreak",
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=8.5,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#92400E"),
    )

    # Reference styles
    ref_title = ParagraphStyle(
        "RefTitle",
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor("#1F2937"),
    )
    ref_body = ParagraphStyle(
        "RefBody",
        fontName="Helvetica",
        fontSize=6.5,
        leading=8,
        textColor=colors.HexColor("#374151"),
    )

    story = []

    # Header section
    story.append(Paragraph("GAYATRI VIDYA PARISHAD COLLEGE FOR DEGREE AND PG COURSES (A)", style_college))
    story.append(Spacer(1, 2))
    story.append(Paragraph("SCHOOL OF SCIENCE · DEPARTMENT OF COMPUTER APPLICATIONS", style_dept))
    story.append(Spacer(1, 2))
    story.append(Paragraph("MASTER OF COMPUTER APPLICATIONS (MCA) — 1ST YEAR (ACADEMIC YEAR 2026-27)", style_doc_title))
    story.append(Spacer(1, 2))
    story.append(Paragraph("CLASS TIMETABLE (MONDAY TO SATURDAY) · MCA GENERAL & MCA ARTIFICIAL INTELLIGENCE", style_sub))
    story.append(Spacer(1, 6))

    def cell(code, faculty="", is_lab=False):
        if not code:
            return Paragraph("—", style_cell_fac)
        c_style = ParagraphStyle(
            "C",
            parent=style_cell_code,
            textColor=colors.HexColor("#065F46") if is_lab else colors.HexColor("#1E3A8A"),
        )
        return [
            Paragraph(f"<b>{code}</b>", c_style),
            Paragraph(f"({faculty})" if faculty else "", style_cell_fac)
        ]

    header_row = [
        Paragraph("<b>DAY</b>", style_cell_header),
        Paragraph("<b>P1</b><br/><font size=6>09:00 - 10:00</font>", style_cell_header),
        Paragraph("<b>P2</b><br/><font size=6>10:00 - 11:00</font>", style_cell_header),
        Paragraph("<b>BREAK</b><br/><font size=5.5>11:00-11:15</font>", style_cell_header),
        Paragraph("<b>P3</b><br/><font size=6>11:15 - 12:15</font>", style_cell_header),
        Paragraph("<b>P4</b><br/><font size=6>12:15 - 01:15</font>", style_cell_header),
        Paragraph("<b>LUNCH BREAK</b><br/><font size=5.5>01:15 - 02:15</font>", style_cell_header),
        Paragraph("<b>P5</b><br/><font size=6>02:15 - 03:15</font>", style_cell_header),
        Paragraph("<b>P6</b><br/><font size=6>03:15 - 04:15</font>", style_cell_header),
    ]

    r_mon = [
        Paragraph("<b>MON</b>", style_cell_day),
        cell("PYL (Lab)", "PVRC / BD", is_lab=True),
        "",
        Paragraph("<b>B<br/>R<br/>E<br/>A<br/>K</b>", style_break),
        cell("FLAT", "BD"),
        cell("OR", "PSR"),
        Paragraph("<b>L<br/>U<br/>N<br/>C<br/>H</b>", style_break),
        cell("PE", "RK"),
        cell("AI", "PRP"),
    ]

    r_tue = [
        Paragraph("<b>TUE</b>", style_cell_day),
        cell("ADDSL (Lab)", "CHSSRP / VL", is_lab=True),
        "",
        Paragraph("<b>B<br/>R<br/>E<br/>A<br/>K</b>", style_break),
        cell("ADDS", "CHSSRP"),
        cell("PE", "RK"),
        Paragraph("<b>L<br/>U<br/>N<br/>C<br/>H</b>", style_break),
        cell("DS", "VL"),
        cell("OR", "PSR"),
    ]

    r_wed = [
        Paragraph("<b>WED</b>", style_cell_day),
        cell("AIL (Lab)", "PRP / YMG", is_lab=True),
        "",
        Paragraph("<b>B<br/>R<br/>E<br/>A<br/>K</b>", style_break),
        cell("FLAT", "BD"),
        cell("OR", "PSR"),
        Paragraph("<b>L<br/>U<br/>N<br/>C<br/>H</b>", style_break),
        cell("ADDS", "CHSSRP"),
        cell("AI", "PRP"),
    ]

    r_thu = [
        Paragraph("<b>THU</b>", style_cell_day),
        cell("PE", "RK"),
        cell("DS", "VL"),
        Paragraph("<b>B<br/>R<br/>E<br/>A<br/>K</b>", style_break),
        cell("ADDS", "CHSSRP"),
        cell("FLAT", "BD"),
        Paragraph("<b>L<br/>U<br/>N<br/>C<br/>H</b>", style_break),
        cell("CTV (Interactive)", "RK", is_lab=True),
        "",
    ]

    r_fri = [
        Paragraph("<b>FRI</b>", style_cell_day),
        cell("PY", "PVRC"),
        cell("AI", "PRP"),
        Paragraph("<b>B<br/>R<br/>E<br/>A<br/>K</b>", style_break),
        cell("ADDS", "CHSSRP"),
        cell("FLAT", "BD"),
        Paragraph("<b>L<br/>U<br/>N<br/>C<br/>H</b>", style_break),
        cell("DS", "VL"),
        cell("OR", "PSR"),
    ]

    r_sat = [
        Paragraph("<b>SAT</b>", style_cell_day),
        cell("AI", "PRP"),
        cell("OR", "PSR"),
        Paragraph("<b>B<br/>R<br/>E<br/>A<br/>K</b>", style_break),
        cell("ADDS", "CHSSRP"),
        cell("FLAT", "BD"),
        Paragraph("<b>L<br/>U<br/>N<br/>C<br/>H</b>", style_break),
        cell("DS", "VL"),
        cell("PE", "RK"),
    ]

    table_data = [header_row, r_mon, r_tue, r_wed, r_thu, r_fri, r_sat]
    col_widths = [44, 104, 104, 34, 106, 106, 40, 131, 131]

    tt_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F2942")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("BOX", (0, 0), (-1, -1), 1.2, colors.HexColor("#0F2942")),
        ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#F8FAFC")),
        ("BACKGROUND", (3, 1), (3, -1), colors.HexColor("#FEF3C7")),
        ("BACKGROUND", (6, 1), (6, -1), colors.HexColor("#FEF3C7")),

        # Spans:
        ("SPAN", (1, 1), (2, 1)),
        ("BACKGROUND", (1, 1), (2, 1), colors.HexColor("#ECFDF5")),
        
        ("SPAN", (1, 2), (2, 2)),
        ("BACKGROUND", (1, 2), (2, 2), colors.HexColor("#ECFDF5")),
        
        ("SPAN", (1, 3), (2, 3)),
        ("BACKGROUND", (1, 3), (2, 3), colors.HexColor("#ECFDF5")),

        ("SPAN", (7, 4), (8, 4)),
        ("BACKGROUND", (7, 4), (8, 4), colors.HexColor("#EFF6FF")),

        ("BACKGROUND", (0, 6), (0, 6), colors.HexColor("#FEF08A")),

        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
    ])

    t = Table(table_data, colWidths=col_widths, style=tt_style)
    story.append(t)
    story.append(Spacer(1, 8))

    # Reference Key section
    subj_data = [
        [Paragraph("<b>SUBJECT CODE & NAME</b>", ref_title), Paragraph("<b>FACULTY IN-CHARGE</b>", ref_title)],
        [Paragraph("<b>AI</b>: Artificial Intelligence for Problem Solving", ref_body), Paragraph("<b>PRP</b>: Mrs. P. Ratna Pavani", ref_body)],
        [Paragraph("<b>DS</b>: Data Science", ref_body), Paragraph("<b>VL</b>: Mrs. V. Lakshmi", ref_body)],
        [Paragraph("<b>ADDS</b>: Advanced Data Structures", ref_body), Paragraph("<b>CHSSRP</b>: Mr. Ch. S. S. Rajesh Patnaik", ref_body)],
        [Paragraph("<b>FLAT</b>: Formal Language & Automata Theory", ref_body), Paragraph("<b>BD</b>: Mr. B. Diwakar", ref_body)],
        [Paragraph("<b>OR</b>: Operational Research", ref_body), Paragraph("<b>PSR</b>: Dr. P. Srinivas Rao", ref_body)],
        [Paragraph("<b>PE</b>: Principles of Entrepreneurship", ref_body), Paragraph("<b>RK</b>: Dr. G. Rama Krishna", ref_body)],
        [Paragraph("<b>PY / PYL</b>: Python Programming & Lab", ref_body), Paragraph("<b>PVRC</b>: Mr. P. V. R. Chandrasekhar", ref_body)],
        [Paragraph("<b>AIL</b>: Artificial Intelligence Lab", ref_body), Paragraph("<b>YMG</b>: Mrs. Y. Mpunika Gayatri", ref_body)],
        [Paragraph("<b>CTV</b>: Interactive Program", ref_body), Paragraph("School of Science Faculty Team", ref_body)],
    ]
    
    ref_table = Table(subj_data, colWidths=[400, 400], style=[
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#94A3B8")),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ])

    story.append(ref_table)

    doc.build(story)
    
    reader = pypdf.PdfReader(PDF_PATH)
    pages = len(reader.pages)
    print(f"PDF built: {PDF_PATH} ({os.path.getsize(PDF_PATH)} bytes), Page Count: {pages}")

if __name__ == "__main__":
    build_pdf()
