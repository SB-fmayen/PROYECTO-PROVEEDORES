"""Genera PDF vectorial desde los SVG y agrega catalogo de FK legible en A4.
Dependencia opcional: pip install reportlab. Ejecutar desde la raiz.
"""
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import toColor

def draw_svg(pdf, node):
    """Subconjunto vectorial emitido por Graphviz: g, path, polygon, ellipse y text.
    Falla ante geometrias no soportadas para no producir un PDF incompleto.
    """
    tag = node.tag.rsplit('}', 1)[-1]
    if tag in ('title', 'desc', 'defs'):
        return
    pdf.saveState()
    for action, raw in re.findall(r'(scale|rotate|translate)\(([^)]+)\)', node.get('transform', '')):
        nums = [float(x) for x in re.findall(r'-?\d+(?:\.\d+)?', raw)]
        if action == 'scale': pdf.scale(nums[0], nums[-1])
        elif action == 'translate': pdf.translate(nums[0], nums[1] if len(nums) > 1 else 0)
        else: pdf.rotate(nums[0])
    fill, stroke = node.get('fill', 'black'), node.get('stroke', 'none')
    if fill != 'none': pdf.setFillColor(toColor(fill))
    if stroke != 'none': pdf.setStrokeColor(toColor(stroke))
    pdf.setLineWidth(float(node.get('stroke-width', '1')))
    if tag in ('svg', 'g', 'a'):
        for child in node: draw_svg(pdf, child)
    elif tag in ('polygon', 'polyline'):
        coords = [float(x) for x in re.findall(r'-?\d+(?:\.\d+)?', node.get('points', ''))]
        p = pdf.beginPath(); p.moveTo(*coords[:2])
        for i in range(2, len(coords), 2): p.lineTo(*coords[i:i+2])
        if tag == 'polygon': p.close()
        pdf.drawPath(p, fill=int(fill != 'none'), stroke=int(stroke != 'none'))
    elif tag == 'ellipse':
        x, y, rx, ry = [float(node.get(k, '0')) for k in ('cx', 'cy', 'rx', 'ry')]
        pdf.ellipse(x-rx, y-ry, x+rx, y+ry, fill=int(fill != 'none'), stroke=int(stroke != 'none'))
    elif tag == 'path':
        tokens = re.findall(r'[A-Za-z]|-?\d+(?:\.\d+)?(?:e[-+]?\d+)?', node.get('d', ''))
        p = pdf.beginPath(); i = 0; command = None
        while i < len(tokens):
            if tokens[i].isalpha(): command = tokens[i]; i += 1
            if command in ('Z', 'z'): p.close(); command = None; continue
            count = {'M': 2, 'L': 2, 'C': 6}.get(command)
            if count is None: raise ValueError(f'Unsupported SVG path: {command}')
            vals = list(map(float, tokens[i:i+count])); i += count
            if command == 'M': p.moveTo(*vals); command = 'L'
            elif command == 'L': p.lineTo(*vals)
            else: p.curveTo(*vals)
        pdf.drawPath(p, fill=int(fill != 'none'), stroke=int(stroke != 'none'))
    elif tag == 'text':
        x, y = float(node.get('x', '0')), float(node.get('y', '0'))
        pdf.translate(x, y); pdf.scale(1, -1)
        pdf.setFont('Helvetica-Bold' if node.get('font-weight') == 'bold' else 'Helvetica', float(node.get('font-size', '14')))
        text = ''.join(node.itertext()); anchor = node.get('text-anchor', 'start')
        if anchor == 'middle': pdf.drawCentredString(0, 0, text)
        elif anchor == 'end': pdf.drawRightString(0, 0, text)
        else: pdf.drawString(0, 0, text)
    else:
        raise ValueError(f'Unsupported SVG element: {tag}')
    pdf.restoreState()

root = Path('docs/mer/final')
for engine in ('oracle', 'sqlserver'):
    schema = json.loads((root / f'{engine}-schema.json').read_text(encoding='utf-8'))
    drawing = ET.parse(root / f'{engine}.svg').getroot()
    # Primera pagina en tamano nativo para conservar legibilidad al ampliar/imprimir.
    sw, sh = [float(drawing.get(k).removesuffix('pt')) for k in ('width', 'height')]
    w, h = sw + 48, sh + 72
    pdf = canvas.Canvas(str(root / f'MER-{engine}-final.pdf'), pagesize=(w, h))
    pdf.setTitle(f'MER final - {engine} - 2026-11-07')
    pdf.saveState(); pdf.transform(1, 0, 0, -1, 24, h - 24)
    draw_svg(pdf, drawing); pdf.restoreState()
    pdf.setFont('Helvetica', 11)
    pdf.drawString(24, 24, '1 / 2 | Modelo fisico. Circulo: opcional; barra: uno; pata de cuervo: muchos. Sin FK entre motores.')
    pdf.showPage()
    pdf.setPageSize(landscape(A4))
    w, h = landscape(A4)
    pdf.setFillColorRGB(.08, .18, .3)
    pdf.setFont('Helvetica-Bold', 20)
    pdf.drawString(32, h - 42, f'Catalogo de relaciones - {engine}')
    pdf.setFont('Helvetica', 10)
    pdf.drawString(32, h - 62, 'Metadatos verificados el 07-11-2026. Los nombres y las relaciones corresponden al esquema consultado.')
    y = h - 94
    for index, rel in enumerate(schema['relations'], 1):
        pdf.setFont('Helvetica-Bold', 10)
        pdf.drawString(32, y, f"{index:02d}  {rel['name']}")
        pdf.setFont('Helvetica', 10)
        pdf.drawString(48, y - 15, f"{rel['child']}.{rel['childCol']}  ->  {rel['parent']}.{rel['parentCol']}")
        y -= 38
    pdf.setFont('Helvetica', 9)
    pdf.drawString(32, 24, '2 / 2 | Fuente editable: DOT y Mermaid. SVG y PDF no contienen registros de negocio ni hashes de usuarios.')
    pdf.save()
    print(f'MER-{engine}-final.pdf: dos paginas vectoriales generadas.')
