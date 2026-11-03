from functools import lru_cache
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.utils import timezone


@lru_cache(maxsize=1)
def _register_certificate_fonts():
    from reportlab import __file__ as reportlab_file
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    font_dir = Path(reportlab_file).resolve().parent / "fonts"
    for name, filename in (
        ("OptimumVera", "Vera.ttf"),
        ("OptimumVeraBI", "VeraBI.ttf"),
        ("OptimumVeraBd", "VeraBd.ttf"),
    ):
        pdfmetrics.registerFont(TTFont(name, str(font_dir / filename)))


def _draw_centered_lines(pdf, lines, *, center_x, top_y, font, font_size, leading, color):
    pdf.setFillColor(color)
    pdf.setFont(font, font_size)
    for index, line in enumerate(lines):
        pdf.drawCentredString(center_x, top_y - index * leading, line)
    return top_y - max(0, len(lines) - 1) * leading


def _fit_lines(text, font, initial_size, minimum_size, max_width, max_lines):
    from reportlab.pdfbase import pdfmetrics
    from reportlab.lib.utils import simpleSplit

    def wrapped_lines(size):
        lines = []
        for line in simpleSplit(text, font, size, max_width):
            if pdfmetrics.stringWidth(line, font, size) <= max_width:
                lines.append(line)
                continue
            fragment = ""
            for character in line:
                candidate = fragment + character
                if fragment and pdfmetrics.stringWidth(candidate, font, size) > max_width:
                    lines.append(fragment)
                    fragment = character
                else:
                    fragment = candidate
            if fragment:
                lines.append(fragment)
        return lines

    size = initial_size
    while size > minimum_size:
        lines = wrapped_lines(size)
        if len(lines) <= max_lines:
            return lines, size
        size -= 1
    return wrapped_lines(minimum_size), minimum_size


def _draw_logo(pdf, x, y):
    from reportlab.lib.colors import HexColor, white

    pdf.saveState()
    pdf.setFillColor(HexColor("#2563EB"))
    pdf.circle(x + 29, y + 29, 29, stroke=0, fill=1)
    pdf.setStrokeColor(white)
    pdf.setFillColor(white)
    pdf.setLineWidth(2.2)
    cap = pdf.beginPath()
    cap.moveTo(x + 9, y + 34)
    cap.lineTo(x + 29, y + 43)
    cap.lineTo(x + 49, y + 34)
    cap.lineTo(x + 29, y + 26)
    cap.close()
    pdf.drawPath(cap, stroke=1, fill=1)
    pdf.circle(x + 29, y + 15, 9, stroke=1, fill=0)
    pdf.setLineWidth(1.5)
    pdf.line(x + 25, y + 15, x + 22, y + 18)
    pdf.line(x + 22, y + 18, x + 25, y + 21)
    pdf.line(x + 33, y + 15, x + 36, y + 18)
    pdf.line(x + 36, y + 18, x + 33, y + 21)
    pdf.restoreState()


def certificate_completion_date(certificate):
    return timezone.localtime(certificate.completed_at).date()


def _certificate_display_id(certificate):
    return f"OLMS-{certificate.issued_at.year}-{certificate.certificate_number.hex[:8].upper()}"


def render_certificate(certificate):
    from reportlab.lib.colors import HexColor, white
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.graphics.barcode import qr
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics import renderPDF
    from reportlab.pdfgen import canvas

    _register_certificate_fonts()
    width, height = landscape(A4)
    certificate_number = str(certificate.certificate_number)
    verify_url = (
        f"{settings.FRONTEND_URL.rstrip('/')}/verify/{certificate_number}"
    )
    display_id = _certificate_display_id(certificate)
    student_name = certificate.student.get_full_name() or certificate.student.username
    course_title = certificate.course.title
    instructor = (
        certificate.course.instructor.get_full_name()
        or certificate.course.instructor.username
    )
    completed_on = certificate_completion_date(certificate)
    navy = HexColor("#0A1F5C")
    blue = HexColor("#2563EB")
    sky = HexColor("#DBEAFE")
    ink = HexColor("#0F172A")
    muted = HexColor("#64748B")
    gold = HexColor("#B8892B")
    regular = "OptimumVera"
    bold = "OptimumVeraBd"
    italic_bold = "OptimumVeraBI"

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(width, height))
    pdf.setTitle(f"Certificate of Completion - {student_name}")
    pdf.setAuthor("Optimum LMS")
    pdf.setSubject(verify_url)

    pdf.setFillColor(white)
    pdf.rect(0, 0, width, height, stroke=0, fill=1)
    pdf.setFillColor(navy)
    pdf.rect(0, height - 118, width, 118, stroke=0, fill=1)
    pdf.setFillColor(blue)
    pdf.rect(0, height - 124, width, 6, stroke=0, fill=1)

    pdf.setStrokeColor(sky)
    pdf.setLineWidth(1.2)
    pdf.rect(22, 22, width - 44, height - 44, stroke=1, fill=0)
    pdf.setStrokeColor(gold)
    pdf.setLineWidth(0.8)
    pdf.rect(30, 30, width - 60, height - 60, stroke=1, fill=0)
    pdf.setFillColor(gold)
    for x, y in ((30, 30), (width - 30, 30), (30, height - 30), (width - 30, height - 30)):
        pdf.circle(x, y, 3.2, stroke=0, fill=1)

    _draw_logo(pdf, 54, height - 100)
    pdf.setFillColor(white)
    pdf.setFont(bold, 24)
    pdf.drawString(124, height - 72, "Optimum")
    optimum_width = pdf.stringWidth("Optimum ", bold, 24)
    pdf.setFillColor(HexColor("#7DB3FF"))
    pdf.drawString(124 + optimum_width, height - 72, "LMS")
    pdf.setFillColor(HexColor("#C7DCFF"))
    pdf.setFont(regular, 8.5)
    pdf.drawString(125, height - 88, "L E A R N I N G   P L A T F O R M")
    pdf.setFillColor(white)
    pdf.setFont(regular, 9)
    pdf.drawRightString(width - 54, height - 62, "CERTIFICATE NO.")
    pdf.setFont(bold, 13)
    pdf.drawRightString(width - 54, height - 80, display_id)

    center_x = width / 2
    pdf.setFillColor(navy)
    pdf.setFont(bold, 31)
    pdf.drawCentredString(center_x, height - 190, "Certificate of Completion")
    pdf.setStrokeColor(gold)
    pdf.setLineWidth(1.2)
    pdf.line(center_x - 70, height - 204, center_x + 70, height - 204)
    pdf.setFillColor(muted)
    pdf.setFont(regular, 11)
    pdf.drawCentredString(center_x, height - 236, "This is to certify that")

    name_lines, name_size = _fit_lines(
        student_name, italic_bold, 36, 10, width - 180, 3
    )
    name_bottom = _draw_centered_lines(
        pdf,
        name_lines,
        center_x=center_x,
        top_y=height - 282,
        font=italic_bold,
        font_size=name_size,
        leading=name_size + 5,
        color=ink,
    )
    underline_width = min(
        pdf.stringWidth(name_lines[0], italic_bold, name_size) + 40,
        width - 160,
    )
    pdf.setStrokeColor(blue)
    pdf.setLineWidth(0.8)
    pdf.line(
        center_x - underline_width / 2,
        name_bottom - 10,
        center_x + underline_width / 2,
        name_bottom - 10,
    )

    completion_text_y = name_bottom - 40
    pdf.setFillColor(muted)
    pdf.setFont(regular, 11)
    pdf.drawCentredString(
        center_x,
        completion_text_y,
        "has successfully completed all requirements of the course",
    )

    course_lines, course_size = _fit_lines(
        course_title, bold, 23, 10, width - 180, 3
    )
    course_bottom = _draw_centered_lines(
        pdf,
        course_lines,
        center_x=center_x,
        top_y=completion_text_y - 34,
        font=bold,
        font_size=course_size,
        leading=course_size + 4,
        color=blue,
    )
    pdf.setFillColor(ink)
    pdf.setFont(regular, 10)
    pdf.drawCentredString(
        center_x,
        course_bottom - 26,
        f"Completed on {completed_on.strftime('%d %B %Y')}",
    )

    signature_y = 118
    pdf.setStrokeColor(ink)
    pdf.setLineWidth(0.7)
    pdf.line(96, signature_y, 286, signature_y)
    pdf.line(width - 286, signature_y, width - 96, signature_y)
    pdf.setFillColor(ink)
    pdf.setFont(italic_bold, 15)
    pdf.drawCentredString(191, signature_y + 8, instructor)
    pdf.setFont(bold, 9)
    pdf.drawCentredString(191, signature_y - 14, instructor)
    pdf.setFillColor(muted)
    pdf.setFont(regular, 8)
    pdf.drawCentredString(191, signature_y - 27, "Course Instructor")
    pdf.setFillColor(ink)
    pdf.setFont(italic_bold, 15)
    pdf.drawCentredString(width - 191, signature_y + 8, "Optimum LMS")
    pdf.setFont(bold, 9)
    pdf.drawCentredString(width - 191, signature_y - 14, "Academic Office")
    pdf.setFillColor(muted)
    pdf.setFont(regular, 8)
    pdf.drawCentredString(width - 191, signature_y - 27, "Authorised Issuer")

    seal_x, seal_y = center_x, 112
    pdf.setFillColor(gold)
    pdf.circle(seal_x, seal_y, 36, stroke=0, fill=1)
    pdf.setFillColor(HexColor("#D9B25C"))
    pdf.circle(seal_x, seal_y, 31, stroke=0, fill=1)
    pdf.setStrokeColor(white)
    pdf.setLineWidth(1)
    pdf.circle(seal_x, seal_y, 26, stroke=1, fill=0)
    pdf.setFillColor(white)
    pdf.setFont(bold, 7)
    pdf.drawCentredString(seal_x, seal_y + 9, "CERTIFIED")
    pdf.setFont(bold, 13)
    pdf.drawCentredString(seal_x, seal_y - 5, "OLMS")
    pdf.setFont(regular, 6)
    pdf.drawCentredString(seal_x, seal_y - 17, str(completed_on.year))

    qr_widget = qr.QrCodeWidget(verify_url)
    bounds = qr_widget.getBounds()
    qr_size = 62
    drawing = Drawing(
        qr_size,
        qr_size,
        transform=[
            qr_size / (bounds[2] - bounds[0]),
            0,
            0,
            qr_size / (bounds[3] - bounds[1]),
            0,
            0,
        ],
    )
    drawing.add(qr_widget)
    renderPDF.draw(drawing, pdf, 52, 40)
    pdf.setFillColor(muted)
    pdf.setFont(regular, 7)
    pdf.drawString(120, 76, "Verify this certificate")
    pdf.setFillColor(ink)
    pdf.drawString(120, 65, verify_url)
    pdf.setFillColor(muted)
    pdf.drawString(120, 54, f"Certificate ID: {certificate_number}")
    pdf.drawRightString(
        width - 54,
        54,
        "Issued by Optimum LMS. Verify authenticity using the QR code or certificate ID.",
    )
    pdf.showPage()
    pdf.save()
    return buffer.getvalue()
