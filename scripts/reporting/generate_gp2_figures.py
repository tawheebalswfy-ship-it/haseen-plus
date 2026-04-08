"""Generate report-ready figure assets for the GP2 Word report.

This script creates PNG assets for two figure groups:
1. System/design diagrams sourced from docs/architecture/.
2. Methodology figures drawn programmatically from the project design docs.

The output images are written to artifacts/report-assets/ and are consumed by
generate_gp2_report.py.
"""

from __future__ import annotations

import html
import math
import re
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_DESIGN_DIR = REPO_ROOT / "docs" / "architecture"
OUT_DIR = REPO_ROOT / "artifacts" / "report-assets"
OUT_DIR.mkdir(parents=True, exist_ok=True)

WHITE = "#ffffff"
BLACK = "#111111"
GRAY_100 = "#f5f5f5"
GRAY_200 = "#e5e5e5"
GRAY_300 = "#d4d4d4"
GRAY_500 = "#737373"
GRAY_700 = "#404040"
GRAY_800 = "#262626"
SOFT_BLUE = "#edf4ff"
SOFT_GREEN = "#eef8f0"
SOFT_AMBER = "#fff6e5"
SOFT_ROSE = "#fff0ee"
SOFT_VIOLET = "#f4efff"
ACCENT_RED = "#b85450"
ACCENT_GREEN = "#82b366"
ACCENT_BLUE = "#6c8ebf"
ACCENT_AMBER = "#d6b656"
ACCENT_VIOLET = "#9673a6"


def font(size: int, *, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates: list[str]
    if mono:
        candidates = [
            "C:/Windows/Fonts/consola.ttf",
            "C:/Windows/Fonts/cour.ttf",
        ]
    elif bold:
        candidates = [
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/segoeuib.ttf",
            "C:/Windows/Fonts/calibrib.ttf",
        ]
    else:
        candidates = [
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/segoeui.ttf",
            "C:/Windows/Fonts/calibri.ttf",
        ]

    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)

    return ImageFont.load_default()


FONT_9 = font(9)
FONT_10 = font(10)
FONT_11 = font(11)
FONT_12 = font(12)
FONT_13 = font(13)
FONT_12_B = font(12, bold=True)
FONT_14_B = font(14, bold=True)
FONT_15_B = font(15, bold=True)
FONT_16_B = font(16, bold=True)
FONT_18_B = font(18, bold=True)
FONT_20_B = font(20, bold=True)
FONT_MONO_10 = font(10, mono=True)


def parse_style(style: str | None) -> dict[str, str]:
    result: dict[str, str] = {}
    if not style:
        return result
    for token in style.split(";"):
        if not token:
            continue
        if "=" in token:
            key, value = token.split("=", 1)
            result[key] = value
        else:
            result[token] = "1"
    return result


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    text = html.unescape(value)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</?(b|i|u|font|span|div|p)>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"\n{3,}", "\n\n", text)
    replacements = {
        "PolicyShield": "AICG",
        "Neon": "Supabase",
        "/classify": "/analyze",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text.strip()


def color(value: str | None, fallback: str) -> str:
    if not value or value == "none":
        return fallback
    return value


def fit_lines(draw: ImageDraw.ImageDraw, text: str, box_width: int, box_height: int, base_font: ImageFont.ImageFont) -> list[str]:
    if not text:
        return []

    lines: list[str] = []
    raw_lines = text.splitlines() or [text]

    for raw in raw_lines:
        words = raw.split()
        if not words:
            lines.append("")
            continue
        current = words[0]
        for word in words[1:]:
            trial = f"{current} {word}".strip()
            width = draw.textbbox((0, 0), trial, font=base_font)[2]
            if width <= max(box_width, 40):
                current = trial
            else:
                lines.append(current)
                current = word
        lines.append(current)

    line_height = draw.textbbox((0, 0), "Ag", font=base_font)[3] + 2
    max_lines = max(1, box_height // max(line_height, 1))
    if len(lines) <= max_lines:
        return lines

    trimmed = lines[: max_lines]
    if trimmed:
        last = trimmed[-1]
        while last and draw.textbbox((0, 0), last + "...", font=base_font)[2] > box_width:
            last = last[:-1]
        trimmed[-1] = (last + "...") if last else "..."
    return trimmed


def draw_multiline_text(
    draw: ImageDraw.ImageDraw,
    bbox: tuple[float, float, float, float],
    text: str,
    *,
    fill: str = BLACK,
    align: str = "center",
    font_obj: ImageFont.ImageFont = FONT_10,
) -> None:
    x1, y1, x2, y2 = bbox
    width = int(max(10, x2 - x1 - 8))
    height = int(max(10, y2 - y1 - 8))
    lines = fit_lines(draw, text, width, height, font_obj)
    if not lines:
        return

    line_height = draw.textbbox((0, 0), "Ag", font=font_obj)[3] + 2
    total_height = len(lines) * line_height
    y = y1 + max(4, ((y2 - y1) - total_height) / 2)

    for line in lines:
        text_width = draw.textbbox((0, 0), line, font=font_obj)[2]
        if align == "left":
            x = x1 + 6
        else:
            x = x1 + ((x2 - x1) - text_width) / 2
        draw.text((x, y), line, fill=fill, font=font_obj)
        y += line_height


def draw_arrow(draw: ImageDraw.ImageDraw, start: tuple[float, float], end: tuple[float, float], line_fill: str, *, width: int = 2, open_head: bool = False) -> None:
    draw.line([start, end], fill=line_fill, width=width)

    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    size = 10
    left = (
        end[0] - size * math.cos(angle - math.pi / 6),
        end[1] - size * math.sin(angle - math.pi / 6),
    )
    right = (
        end[0] - size * math.cos(angle + math.pi / 6),
        end[1] - size * math.sin(angle + math.pi / 6),
    )
    if open_head:
        draw.line([left, end, right], fill=line_fill, width=width)
    else:
        draw.polygon([end, left, right], fill=line_fill, outline=line_fill)


class DrawioRenderer:
    def __init__(self, file_path: Path):
        tree = ET.parse(file_path)
        root = tree.getroot()
        if root.tag == "mxGraphModel":
            model = root
        else:
            diagram = root.find("diagram")
            if diagram is None:
                raise ValueError(f"No diagram found in {file_path}")
            model = diagram.find("mxGraphModel")
            if model is None:
                raise ValueError(f"No graph model found in {file_path}")
        graph_root = model.find("root")
        if graph_root is None:
            raise ValueError(f"No graph root found in {file_path}")

        self.file_path = file_path
        self.page_width = int(float(model.attrib.get("pageWidth", "1400")))
        self.page_height = int(float(model.attrib.get("pageHeight", "1000")))
        self.cells = {cell.attrib["id"]: cell for cell in graph_root.findall("mxCell") if "id" in cell.attrib}
        self._bounds_cache: dict[str, tuple[float, float, float, float]] = {}

    def bounds(self, cell_id: str) -> tuple[float, float, float, float]:
        if cell_id in self._bounds_cache:
            return self._bounds_cache[cell_id]

        cell = self.cells[cell_id]
        geom = cell.find("mxGeometry")
        if geom is None:
            result = (0.0, 0.0, 0.0, 0.0)
            self._bounds_cache[cell_id] = result
            return result

        x = float(geom.attrib.get("x", "0"))
        y = float(geom.attrib.get("y", "0"))
        w = float(geom.attrib.get("width", "0"))
        h = float(geom.attrib.get("height", "0"))

        parent_id = cell.attrib.get("parent")
        if parent_id and parent_id not in {"0", "1"} and parent_id in self.cells:
            parent = self.cells[parent_id]
            if parent.attrib.get("vertex") == "1":
                px, py, _, _ = self.bounds(parent_id)
                x += px
                y += py

        result = (x, y, w, h)
        self._bounds_cache[cell_id] = result
        return result

    def point_from_child(self, geom: ET.Element | None, name: str) -> tuple[float, float] | None:
        if geom is None:
            return None
        for child in geom:
            if child.tag == "mxPoint" and child.attrib.get("as") == name:
                return (float(child.attrib.get("x", "0")), float(child.attrib.get("y", "0")))
        return None

    def edge_points(self, cell: ET.Element) -> list[tuple[float, float]]:
        geom = cell.find("mxGeometry")
        points: list[tuple[float, float]] = []

        source_id = cell.attrib.get("source")
        target_id = cell.attrib.get("target")
        if source_id and source_id in self.cells:
            sx, sy, sw, sh = self.bounds(source_id)
            points.append((sx + sw / 2, sy + sh / 2))
        else:
            source_point = self.point_from_child(geom, "sourcePoint")
            if source_point:
                points.append(source_point)

        if geom is not None:
            for child in geom:
                if child.tag == "Array" and child.attrib.get("as") == "points":
                    for point in child.findall("mxPoint"):
                        points.append((float(point.attrib.get("x", "0")), float(point.attrib.get("y", "0"))))

        if target_id and target_id in self.cells:
            tx, ty, tw, th = self.bounds(target_id)
            points.append((tx + tw / 2, ty + th / 2))
        else:
            target_point = self.point_from_child(geom, "targetPoint")
            if target_point:
                points.append(target_point)

        return points

    def render(self, output_name: str) -> Path:
        image = Image.new("RGB", (self.page_width, self.page_height), WHITE)
        draw = ImageDraw.Draw(image)

        vertex_cells = [cell for cell in self.cells.values() if cell.attrib.get("vertex") == "1"]
        edge_cells = [cell for cell in self.cells.values() if cell.attrib.get("edge") == "1"]

        shape_cells = []
        text_cells = []
        label_entries: list[tuple[tuple[float, float, float, float], str, str, str, bool]] = []

        for cell in vertex_cells:
            style = parse_style(cell.attrib.get("style"))
            if style.get("text") == "1":
                text_cells.append(cell)
            else:
                shape_cells.append(cell)

        shape_cells.sort(key=lambda cell: (self.bounds(cell.attrib["id"])[2] * self.bounds(cell.attrib["id"])[3]), reverse=True)

        for cell in shape_cells:
            x, y, w, h = self.bounds(cell.attrib["id"])
            x1, y1, x2, y2 = x, y, x + w, y + h
            style = parse_style(cell.attrib.get("style"))
            fill = color(style.get("fillColor"), GRAY_100)
            stroke = color(style.get("strokeColor"), GRAY_500)
            shape = style.get("shape", "rect")

            if shape in {"ellipse", "mxgraph.flowchart.start_2", "mxgraph.flowchart.terminate"} or "ellipse" in style:
                draw.ellipse((x1, y1, x2, y2), fill=fill, outline=stroke, width=2)
            elif shape == "rhombus":
                draw.polygon([(x1 + w / 2, y1), (x2, y1 + h / 2), (x1 + w / 2, y2), (x1, y1 + h / 2)], fill=fill, outline=stroke)
            elif shape == "mxgraph.basic.acute_triangle":
                draw.polygon([(x1 + w / 2, y1), (x2, y2), (x1, y2)], fill=fill, outline=stroke)
            elif shape == "umlActor":
                cx = x1 + w / 2
                head_r = min(w, h) * 0.12
                draw.ellipse((cx - head_r, y1 + 8, cx + head_r, y1 + 8 + 2 * head_r), outline=stroke, width=2)
                neck_y = y1 + 8 + 2 * head_r
                body_y = y1 + h * 0.6
                draw.line((cx, neck_y, cx, body_y), fill=stroke, width=2)
                draw.line((cx - w * 0.18, y1 + h * 0.36, cx + w * 0.18, y1 + h * 0.36), fill=stroke, width=2)
                draw.line((cx, body_y, cx - w * 0.18, y2 - 18), fill=stroke, width=2)
                draw.line((cx, body_y, cx + w * 0.18, y2 - 18), fill=stroke, width=2)
            elif shape == "shape=table" or shape == "table" or style.get("swimlane") == "1" or shape == "swimlane":
                start_size = float(style.get("startSize", "30"))
                draw.rounded_rectangle((x1, y1, x2, y2), radius=8, fill=fill, outline=stroke, width=2)
                draw.rectangle((x1, y1, x2, y1 + start_size), fill=fill, outline=stroke, width=2)
                draw.line((x1, y1 + start_size, x2, y1 + start_size), fill=stroke, width=2)
            elif shape == "folder" or shape == "mxgraph.sysml.package":
                tab_w = min(140, w * 0.35)
                tab_h = 26
                draw.rounded_rectangle((x1, y1 + tab_h, x2, y2), radius=8, fill=fill, outline=stroke, width=2)
                draw.rounded_rectangle((x1, y1, x1 + tab_w, y1 + tab_h + 6), radius=6, fill=fill, outline=stroke, width=2)
            elif shape == "note":
                fold = min(20, w * 0.12)
                draw.polygon([(x1, y1), (x2 - fold, y1), (x2, y1 + fold), (x2, y2), (x1, y2)], fill=fill, outline=stroke)
                draw.line((x2 - fold, y1, x2 - fold, y1 + fold), fill=stroke, width=2)
                draw.line((x2 - fold, y1 + fold, x2, y1 + fold), fill=stroke, width=2)
            elif shape == "cylinder3":
                cap = min(16, h * 0.18)
                draw.rectangle((x1, y1 + cap / 2, x2, y2 - cap / 2), fill=fill, outline=stroke, width=2)
                draw.ellipse((x1, y1, x2, y1 + cap), fill=fill, outline=stroke, width=2)
                draw.ellipse((x1, y2 - cap, x2, y2), outline=stroke, width=2)
            else:
                radius = 8 if style.get("rounded") == "1" else 0
                if radius:
                    draw.rounded_rectangle((x1, y1, x2, y2), radius=radius, fill=fill, outline=stroke, width=2)
                else:
                    draw.rectangle((x1, y1, x2, y2), fill=fill, outline=stroke, width=2)

            raw_text = clean_text(cell.attrib.get("value"))
            if raw_text:
                align = style.get("align", "center")
                text_fill = color(style.get("fontColor"), BLACK)
                font_size = int(float(style.get("fontSize", "10")))
                is_bold = "<b>" in (cell.attrib.get("value") or "") or style.get("fontStyle") == "1"
                font_obj = font(font_size, bold=is_bold)
                label_entries.append(((x1 + 4, y1 + 4, x2 - 4, y2 - 4), raw_text, text_fill, align, False))

        for cell in edge_cells:
            style = parse_style(cell.attrib.get("style"))
            points = self.edge_points(cell)
            if len(points) < 2:
                continue
            stroke = color(style.get("strokeColor"), GRAY_500)
            width = int(float(style.get("strokeWidth", "1.5")))
            open_arrow = style.get("endArrow") == "open"

            for start, end in zip(points, points[1:]):
                draw.line([start, end], fill=stroke, width=width)
            draw_arrow(draw, points[-2], points[-1], stroke, width=width, open_head=open_arrow)

            raw_text = clean_text(cell.attrib.get("value"))
            if raw_text:
                mx = sum(point[0] for point in points) / len(points)
                my = sum(point[1] for point in points) / len(points)
                label_entries.append(((mx - 90, my - 16, mx + 90, my + 16), raw_text, BLACK, "center", True))

        for cell in text_cells:
            x, y, w, h = self.bounds(cell.attrib["id"])
            style = parse_style(cell.attrib.get("style"))
            raw_text = clean_text(cell.attrib.get("value"))
            if not raw_text:
                continue
            label_entries.append(((x, y, x + w, y + h), raw_text, color(style.get("fontColor"), BLACK), style.get("align", "center"), False))

        for bbox, text, fill, align, edge_label in label_entries:
            font_obj = FONT_9 if edge_label else FONT_10
            draw_multiline_text(draw, bbox, text, fill=fill, align=align, font_obj=font_obj)

        output_path = OUT_DIR / output_name
        image.save(output_path)
        return output_path


def canvas(width: int = 1400, height: int = 900) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (width, height), WHITE)
    return img, ImageDraw.Draw(img)


def box(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], title: str, body: list[str], *, fill: str, outline: str, title_fill: str = BLACK) -> None:
    draw.rounded_rectangle(xy, radius=14, fill=fill, outline=outline, width=3)
    x1, y1, x2, y2 = xy
    draw_multiline_text(draw, (x1 + 8, y1 + 10, x2 - 8, y1 + 48), title, fill=title_fill, align="center", font_obj=FONT_14_B)
    draw.line((x1 + 16, y1 + 56, x2 - 16, y1 + 56), fill=outline, width=2)
    draw_multiline_text(draw, (x1 + 10, y1 + 64, x2 - 10, y2 - 10), "\n".join(body), fill=BLACK, align="center", font_obj=FONT_11)


def save_manual(image: Image.Image, name: str) -> Path:
    path = OUT_DIR / name
    image.save(path)
    return path


def panel(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    title: str,
    *,
    fill: str,
    outline: str,
    header_fill: str | None = None,
) -> None:
    x1, y1, x2, y2 = xy
    header_height = 44
    draw.rounded_rectangle(xy, radius=20, fill=fill, outline=outline, width=4)
    draw.rectangle((x1 + 2, y1 + 2, x2 - 2, y1 + header_height), fill=header_fill or fill, outline=outline, width=3)
    draw.line((x1 + 8, y1 + header_height, x2 - 8, y1 + header_height), fill=outline, width=3)
    draw_multiline_text(draw, (x1 + 18, y1 + 6, x2 - 18, y1 + header_height - 4), title, fill=BLACK, align="left", font_obj=FONT_15_B)


def note_box(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    title: str,
    body: list[str],
    *,
    fill: str = WHITE,
    outline: str = GRAY_500,
) -> None:
    x1, y1, x2, y2 = xy
    fold = 18
    draw.polygon([(x1, y1), (x2 - fold, y1), (x2, y1 + fold), (x2, y2), (x1, y2)], fill=fill, outline=outline)
    draw.line((x2 - fold, y1, x2 - fold, y1 + fold), fill=outline, width=2)
    draw.line((x2 - fold, y1 + fold, x2, y1 + fold), fill=outline, width=2)
    draw_multiline_text(draw, (x1 + 10, y1 + 8, x2 - 10, y1 + 38), title, fill=BLACK, align="left", font_obj=FONT_12_B)
    draw_multiline_text(draw, (x1 + 10, y1 + 40, x2 - 10, y2 - 10), "\n".join(body), fill=BLACK, align="left", font_obj=FONT_11)


def draw_actor(
    draw: ImageDraw.ImageDraw,
    center_x: int,
    top_y: int,
    label: str,
    *,
    outline: str = GRAY_700,
) -> None:
    head_r = 16
    head_y = top_y + 4
    body_top = head_y + head_r * 2
    body_bottom = body_top + 34
    draw.ellipse((center_x - head_r, head_y, center_x + head_r, head_y + head_r * 2), outline=outline, width=3)
    draw.line((center_x, body_top, center_x, body_bottom), fill=outline, width=3)
    draw.line((center_x - 26, body_top + 10, center_x + 26, body_top + 10), fill=outline, width=3)
    draw.line((center_x, body_bottom, center_x - 20, body_bottom + 26), fill=outline, width=3)
    draw.line((center_x, body_bottom, center_x + 20, body_bottom + 26), fill=outline, width=3)
    draw_multiline_text(draw, (center_x - 70, body_bottom + 28, center_x + 70, body_bottom + 76), label, fill=BLACK, align="center", font_obj=FONT_12_B)


def cylinder_box(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    title: str,
    body: list[str],
    *,
    fill: str,
    outline: str,
) -> None:
    x1, y1, x2, y2 = xy
    cap = 20
    draw.rectangle((x1, y1 + cap // 2, x2, y2 - cap // 2), fill=fill, outline=outline, width=3)
    draw.ellipse((x1, y1, x2, y1 + cap), fill=fill, outline=outline, width=3)
    draw.ellipse((x1, y2 - cap, x2, y2), outline=outline, width=3)
    draw_multiline_text(draw, (x1 + 12, y1 + 14, x2 - 12, y1 + 52), title, fill=BLACK, align="center", font_obj=FONT_14_B)
    draw_multiline_text(draw, (x1 + 12, y1 + 54, x2 - 12, y2 - 14), "\n".join(body), fill=BLACK, align="center", font_obj=FONT_11)


def uml_class(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    title: str,
    attributes: list[str],
    methods: list[str],
    *,
    fill: str,
    outline: str,
) -> None:
    x1, y1, x2, y2 = xy
    title_h = 46
    attr_h = max(80, int((y2 - y1) * 0.42))
    draw.rounded_rectangle(xy, radius=14, fill=fill, outline=outline, width=3)
    draw.rectangle((x1 + 2, y1 + 2, x2 - 2, y1 + title_h), fill=fill, outline=outline, width=2)
    draw.line((x1 + 6, y1 + title_h, x2 - 6, y1 + title_h), fill=outline, width=2)
    draw.line((x1 + 6, y1 + title_h + attr_h, x2 - 6, y1 + title_h + attr_h), fill=outline, width=2)
    draw_multiline_text(draw, (x1 + 10, y1 + 6, x2 - 10, y1 + title_h - 4), title, fill=BLACK, align="center", font_obj=FONT_12_B)
    draw_multiline_text(draw, (x1 + 10, y1 + title_h + 6, x2 - 10, y1 + title_h + attr_h - 6), "\n".join(attributes), fill=BLACK, align="left", font_obj=FONT_10)
    draw_multiline_text(draw, (x1 + 10, y1 + title_h + attr_h + 6, x2 - 10, y2 - 10), "\n".join(methods), fill=BLACK, align="left", font_obj=FONT_10)


def task_box(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    text: str,
    *,
    fill: str,
    outline: str,
) -> None:
    draw.rounded_rectangle(xy, radius=12, fill=fill, outline=outline, width=3)
    x1, y1, x2, y2 = xy
    draw_multiline_text(draw, (x1 + 10, y1 + 10, x2 - 10, y2 - 10), text, fill=BLACK, align="center", font_obj=FONT_11)


def process_node(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    title: str,
    body: list[str],
    *,
    fill: str,
    outline: str,
) -> None:
    draw.ellipse(xy, fill=fill, outline=outline, width=3)
    x1, y1, x2, y2 = xy
    draw_multiline_text(draw, (x1 + 12, y1 + 14, x2 - 12, y2 - 12), "\n".join([title, *body]), fill=BLACK, align="center", font_obj=FONT_11)


def use_case(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    text: str,
    *,
    fill: str,
    outline: str,
) -> None:
    draw.ellipse(xy, fill=fill, outline=outline, width=3)
    x1, y1, x2, y2 = xy
    draw_multiline_text(draw, (x1 + 10, y1 + 10, x2 - 10, y2 - 10), text, fill=BLACK, align="center", font_obj=FONT_11)


def data_store_box(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    title: str,
    body: list[str],
    *,
    fill: str,
    outline: str,
) -> None:
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=10, fill=fill, outline=outline, width=3)
    draw.rectangle((x1 + 2, y1 + 2, x1 + 28, y2 - 2), fill=outline)
    draw_multiline_text(draw, (x1 + 36, y1 + 8, x2 - 8, y1 + 40), title, fill=BLACK, align="left", font_obj=FONT_12_B)
    draw_multiline_text(draw, (x1 + 36, y1 + 42, x2 - 10, y2 - 10), "\n".join(body), fill=BLACK, align="left", font_obj=FONT_10)


def message_arrow(
    draw: ImageDraw.ImageDraw,
    y: int,
    x1: int,
    x2: int,
    text: str,
    *,
    color: str,
    open_head: bool = False,
) -> None:
    draw_arrow(draw, (x1, y), (x2, y), color, width=3, open_head=open_head)
    left = min(x1, x2) + 14
    right = max(x1, x2) - 14
    draw_multiline_text(draw, (left, y - 28, right, y - 6), text, fill=BLACK, align="center", font_obj=FONT_10)


def poly_arrow(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[int, int]],
    color: str,
    *,
    width: int = 3,
    label: str | None = None,
    label_box: tuple[int, int, int, int] | None = None,
    open_head: bool = False,
) -> None:
    if len(points) < 2:
        return

    for start, end in zip(points, points[1:-1]):
        draw.line([start, end], fill=color, width=width)
    draw_arrow(draw, points[-2], points[-1], color, width=width, open_head=open_head)

    if label:
        if label_box is None:
            avg_x = sum(point[0] for point in points) / len(points)
            avg_y = sum(point[1] for point in points) / len(points)
            label_box = (int(avg_x) - 90, int(avg_y) - 20, int(avg_x) + 90, int(avg_y) + 20)
        draw_multiline_text(draw, label_box, label, fill=BLACK, align="center", font_obj=FONT_10)


def lifeline(draw: ImageDraw.ImageDraw, x: int, title: str, subtitle: str, *, color_fill: str, color_outline: str) -> None:
    draw.rounded_rectangle((x - 95, 100, x + 95, 166), radius=12, fill=color_fill, outline=color_outline, width=3)
    draw_multiline_text(draw, (x - 88, 108, x + 88, 158), f"{title}\n{subtitle}", fill=BLACK, align="center", font_obj=FONT_12_B)
    draw.line((x, 166, x, 900), fill=GRAY_300, width=2)


def activation_bar(draw: ImageDraw.ImageDraw, x: int, y1: int, y2: int, *, color_fill: str, color_outline: str) -> None:
    draw.rounded_rectangle((x - 10, y1, x + 10, y2), radius=6, fill=color_fill, outline=color_outline, width=2)


def generate_ml_pipeline() -> None:
    image, draw = canvas(1600, 900)
    draw.text((420, 32), "Figure 3.2 - ML Pipeline Workflow", fill=BLACK, font=FONT_18_B)

    steps = [
        ((70, 230, 300, 470), "Dataset Generation", ["Google Gemini 2.5 Flash", "Bilingual policy excerpts", "Two-pass verification"], "#dae8fc", ACCENT_BLUE),
        ((365, 230, 595, 470), "Preprocessing", ["Label extraction", "Multi-hot vectors", "Train/validation split"], "#d5e8d4", ACCENT_GREEN),
        ((660, 230, 890, 470), "mDeBERTa-v3 Training", ["mdeberta-v3-base", "16-label sigmoid head", "AdamW + warmup"], "#fff2cc", ACCENT_AMBER),
        ((955, 230, 1185, 470), "Model Export", ["SafeTensors weights", "Tokenizer files", "Config artifacts"], "#f8cecc", ACCENT_RED),
        ((1250, 230, 1480, 470), "Deployment", ["FastAPI service", "Cloud Run (me-central1)", "GCS model loading"], "#e1d5e7", ACCENT_VIOLET),
    ]

    for xy, title, body, fill, outline in steps:
        box(draw, xy, title, body, fill=fill, outline=outline)

    for start_x in (300, 595, 890, 1185):
        draw_arrow(draw, (start_x + 10, 350), (start_x + 55, 350), GRAY_700, width=4)

    draw.rounded_rectangle((150, 560, 1430, 770), radius=18, fill=GRAY_100, outline=GRAY_300, width=2)
    draw.text((610, 585), "End-to-End Flow", fill=BLACK, font=FONT_16_B)
    flow_text = (
        "Generate synthetic compliance text -> encode 16 gap labels -> fine-tune mDeBERTa-v3 -> export artifacts -> serve inference API"
    )
    draw_multiline_text(draw, (190, 620, 1390, 735), flow_text, fill=GRAY_700, align="center", font_obj=FONT_14_B)
    save_manual(image, "fig_3_2_ml_pipeline.png")


def generate_classification_head() -> None:
    image, draw = canvas(1680, 980)
    draw.text((370, 32), "Figure 3.3 - Model Classification Head", fill=BLACK, font=FONT_18_B)

    box(draw, (90, 180, 410, 430), "mDeBERTa-v3 Backbone", ["12 transformer layers", "768 hidden size", "128k SentencePiece vocab"], fill="#dae8fc", outline=ACCENT_BLUE)
    box(draw, (470, 235, 690, 355), "Mean Pooling", ["Aggregate token embeddings", "Document vector (768-dim)"], fill="#d5e8d4", outline=ACCENT_GREEN)
    box(draw, (750, 170, 970, 290), "Linear 768 -> 512", ["Wide projection"], fill="#d5e8d4", outline=ACCENT_GREEN)
    box(draw, (1020, 170, 1240, 290), "BatchNorm + ReLU", ["Normalize and activate"], fill="#fff2cc", outline=ACCENT_AMBER)
    box(draw, (1290, 170, 1510, 290), "Dropout", ["p = 0.4"], fill="#fff2cc", outline=ACCENT_AMBER)
    box(draw, (540, 430, 790, 550), "Linear 512 -> 256", ["Compression layer"], fill="#d5e8d4", outline=ACCENT_GREEN)
    box(draw, (850, 430, 1110, 550), "ReLU + Dropout", ["p = 0.4"], fill="#fff2cc", outline=ACCENT_AMBER)
    box(draw, (1170, 430, 1410, 550), "Linear 256 -> 16", ["One logit per gap label"], fill="#f8cecc", outline=ACCENT_RED)
    box(draw, (550, 690, 1130, 860), "Sigmoid Outputs", ["GAP_PP_001 ... GAP_PP_008", "GAP_RA_001 ... GAP_RA_008", "Independent multi-label probabilities"], fill="#e1d5e7", outline=ACCENT_VIOLET)

    draw_arrow(draw, (410, 305), (470, 295), GRAY_700, width=4)
    draw_arrow(draw, (690, 295), (750, 230), GRAY_700, width=4)
    draw_arrow(draw, (970, 230), (1020, 230), GRAY_700, width=4)
    draw_arrow(draw, (1240, 230), (1290, 230), GRAY_700, width=4)
    draw_arrow(draw, (1400, 290), (790, 470), GRAY_700, width=4)
    draw_arrow(draw, (790, 490), (850, 490), GRAY_700, width=4)
    draw_arrow(draw, (1110, 490), (1170, 490), GRAY_700, width=4)
    draw_arrow(draw, (1290, 550), (970, 690), GRAY_700, width=4)

    save_manual(image, "fig_3_3_model_classification_head.png")


def generate_chunking_pipeline() -> None:
    image, draw = canvas(1600, 950)
    draw.text((300, 32), "Figure 3.4 - Document Chunking & Aggregation Pipeline", fill=BLACK, font=FONT_18_B)

    blocks = [
        ((70, 220, 300, 430), "Input Document", ["Policy text up to 50,000 chars", "PDF / DOCX / TXT extraction"], "#dae8fc", ACCENT_BLUE),
        ((360, 220, 590, 430), "Section Split", ["Headings and paragraphs", "~350 word chunks", "~50 word overlap"], "#d5e8d4", ACCENT_GREEN),
        ((650, 220, 880, 430), "Tokenizer", ["mDeBERTa-v3 SPM", "512 token max length", "Per-chunk tensors"], "#fff2cc", ACCENT_AMBER),
        ((940, 220, 1170, 430), "Chunk Inference", ["Forward pass per chunk", "16 sigmoid probabilities", "Domain evidence"], "#f8cecc", ACCENT_RED),
        ((1230, 220, 1530, 430), "Aggregation", ["Max-pool across chunks", "Severity-weighted scoring", "Overall compliance"], "#e1d5e7", ACCENT_VIOLET),
    ]

    for xy, title, body, fill, outline in blocks:
        box(draw, xy, title, body, fill=fill, outline=outline)

    for start_x in (300, 590, 880, 1170):
        draw_arrow(draw, (start_x + 10, 325), (start_x + 60, 325), GRAY_700, width=4)

    draw.rounded_rectangle((150, 560, 1450, 820), radius=18, fill=GRAY_100, outline=GRAY_300, width=2)
    draw.text((575, 590), "Chunk Example", fill=BLACK, font=FONT_16_B)
    box(draw, (220, 640, 470, 770), "Chunk 1", ["Password requirements", "MFA statements", "Rotation schedule"], fill=WHITE, outline=GRAY_300)
    box(draw, (540, 640, 790, 770), "Chunk 2", ["Privileged access", "Storage / encryption", "Administrative controls"], fill=WHITE, outline=GRAY_300)
    box(draw, (860, 640, 1110, 770), "Chunk 3", ["Risk triggers", "Methodology", "Review cadence"], fill=WHITE, outline=GRAY_300)
    box(draw, (1180, 640, 1380, 770), "Output", ["Detected gaps", "Domain scores", "Overall percentage"], fill=WHITE, outline=GRAY_300)
    save_manual(image, "fig_3_4_chunking_aggregation_pipeline.png")


def generate_system_architecture() -> None:
    image, draw = canvas(1800, 1200)
    draw.text((560, 30), 'Figure 3.1 - High-Level System Architecture', fill=BLACK, font=FONT_20_B)

    panel(draw, (70, 90, 1730, 220), 'Users and Access Channels', fill=GRAY_100, outline=GRAY_700)
    panel(draw, (70, 260, 1730, 460), 'Presentation Layer', fill=SOFT_VIOLET, outline=ACCENT_VIOLET)
    panel(draw, (70, 500, 1050, 780), 'Application Layer', fill=SOFT_AMBER, outline=ACCENT_AMBER)
    panel(draw, (1110, 500, 1730, 780), 'External Services', fill=SOFT_ROSE, outline=ACCENT_RED)
    panel(draw, (70, 820, 1730, 1100), 'Data and Persistence Layer', fill=SOFT_BLUE, outline=ACCENT_BLUE)

    draw_actor(draw, 260, 110, 'Security\nAnalyst')
    draw_actor(draw, 900, 110, 'Compliance\nOfficer')
    draw_actor(draw, 1540, 110, 'IT\nAuditor')

    box(draw, (120, 320, 430, 410), 'Public Web App', ['Landing page and OTP auth', 'Single-policy analysis flow'], fill=WHITE, outline=ACCENT_VIOLET)
    box(draw, (500, 320, 880, 410), 'Compliance Workspace', ['Policies, assessments, tasks', 'Framework mapping and risk views'], fill=WHITE, outline=ACCENT_VIOLET)
    box(draw, (980, 320, 1320, 410), 'Bilingual UI', ['Arabic RTL and English UI', 'Accessible dashboard views'], fill=WHITE, outline=ACCENT_VIOLET)
    box(draw, (1400, 320, 1680, 410), 'Client Cache', ['Local storage for seeded data', 'Offline report demo state'], fill=WHITE, outline=ACCENT_VIOLET)

    box(draw, (120, 585, 390, 680), 'FastAPI Service', ['GET /health', 'POST /analyze', 'Request validation'], fill=WHITE, outline=ACCENT_AMBER)
    box(draw, (430, 585, 760, 680), 'mDeBERTa-v3 Inference Engine', ['Chunking and tokenization', '16-label multi-label scoring'], fill=WHITE, outline=ACCENT_AMBER)
    box(draw, (800, 585, 1000, 680), 'Result Aggregator', ['Aggregate scores', 'Return domain analysis'], fill=WHITE, outline=ACCENT_AMBER)

    box(draw, (1160, 560, 1370, 650), 'Google Cloud Run', ['Hosts FastAPI container'], fill=WHITE, outline=ACCENT_RED)
    box(draw, (1410, 560, 1680, 650), 'Supabase Auth', ['Email / password and JWT session'], fill=WHITE, outline=ACCENT_RED)
    box(draw, (1260, 685, 1580, 765), 'Gemini 2.5 Flash', ['Synthetic bilingual dataset support'], fill=WHITE, outline=ACCENT_RED)

    cylinder_box(draw, (120, 910, 420, 1015), 'Supabase PostgreSQL', ['policies', 'assessments', 'tasks', 'RLS with Supabase Auth'], fill=WHITE, outline=ACCENT_BLUE)
    cylinder_box(draw, (500, 910, 800, 1015), 'Cloud Storage', ['model.safetensors', 'tokenizer.json', 'config artifacts'], fill=WHITE, outline=ACCENT_BLUE)
    cylinder_box(draw, (910, 910, 1210, 1015), 'Browser localStorage', ['dashboard cache', 'policies, assessments, tasks'], fill=WHITE, outline=ACCENT_BLUE)
    cylinder_box(draw, (1300, 910, 1600, 1015), 'Training Dataset', ['CSV, JSON, JSONL samples', 'AR/EN compliance excerpts'], fill=WHITE, outline=ACCENT_BLUE)

    poly_arrow(draw, [(260, 206), (260, 320)], ACCENT_GREEN, label='HTTPS', label_box=(190, 235, 330, 270))
    poly_arrow(draw, [(900, 206), (900, 320)], ACCENT_GREEN, label='HTTPS', label_box=(830, 235, 970, 270))
    poly_arrow(draw, [(1540, 206), (1540, 320), (1130, 320)], ACCENT_GREEN, label='HTTPS', label_box=(1330, 235, 1540, 270))

    poly_arrow(draw, [(430, 365), (460, 365), (460, 470), (760, 470), (760, 585)], ACCENT_BLUE, label='POST /analyze', label_box=(490, 430, 710, 462))
    poly_arrow(draw, [(880, 365), (1060, 365), (1060, 965), (1210, 965)], ACCENT_VIOLET, label='persist workspace state', label_box=(980, 840, 1200, 875))
    poly_arrow(draw, [(1320, 365), (1410, 365), (1410, 605)], ACCENT_AMBER, label='email auth', label_box=(1360, 430, 1500, 462))
    poly_arrow(draw, [(390, 630), (430, 630)], ACCENT_RED, label='request', label_box=(385, 598, 465, 626))
    poly_arrow(draw, [(760, 630), (800, 630)], ACCENT_VIOLET, label='scores', label_box=(756, 600, 820, 626))
    poly_arrow(draw, [(900, 680), (900, 962), (420, 962)], ACCENT_GREEN, label='store analysis', label_box=(640, 858, 850, 892))
    poly_arrow(draw, [(595, 680), (595, 962), (650, 962)], ACCENT_AMBER, label='load model', label_box=(520, 858, 700, 892))
    poly_arrow(draw, [(1265, 650), (1265, 630), (390, 630)], GRAY_700, label='deploy container', label_box=(890, 564, 1110, 596))
    poly_arrow(draw, [(1420, 765), (1420, 962), (1450, 962)], ACCENT_RED, label='generate samples', label_box=(1300, 850, 1490, 885))

    draw.text((92, 1128), 'AICG combines a public classifier with a standalone compliance workspace and a cloud-hosted ML inference service.', fill=GRAY_700, font=FONT_12_B)
    save_manual(image, 'fig_3_1_system_architecture.png')


def generate_sequence_policy_classification() -> None:
    image, draw = canvas(1700, 1020)
    draw.text((470, 30), 'Figure 3.5 - Sequence Diagram: Policy Classification', fill=BLACK, font=FONT_20_B)

    x_user, x_app, x_api, x_model, x_db = 160, 500, 840, 1180, 1520
    lifeline(draw, x_user, 'User', '(Browser)', color_fill=SOFT_BLUE, color_outline=ACCENT_BLUE)
    lifeline(draw, x_app, 'React App', '(AICG Web UI)', color_fill=SOFT_GREEN, color_outline=ACCENT_GREEN)
    lifeline(draw, x_api, 'FastAPI', '(Cloud Run)', color_fill=SOFT_ROSE, color_outline=ACCENT_RED)
    lifeline(draw, x_model, 'mDeBERTa-v3', '(Inference)', color_fill=SOFT_AMBER, color_outline=ACCENT_AMBER)
    lifeline(draw, x_db, 'Supabase DB', '(PostgreSQL)', color_fill=SOFT_VIOLET, color_outline=ACCENT_VIOLET)

    activation_bar(draw, x_app, 220, 860, color_fill='#dff0df', color_outline=ACCENT_GREEN)
    activation_bar(draw, x_api, 360, 620, color_fill='#fee4e2', color_outline=ACCENT_RED)
    activation_bar(draw, x_model, 440, 540, color_fill='#fff1cc', color_outline=ACCENT_AMBER)
    activation_bar(draw, x_db, 680, 770, color_fill='#efe6fb', color_outline=ACCENT_VIOLET)

    message_arrow(draw, 220, x_user, x_app, '1. Upload or enter policy text', color=ACCENT_BLUE)
    task_box(draw, (405, 260, 595, 320), '2. Extract text from\ndocument (PDF/DOCX/TXT)', fill=WHITE, outline=ACCENT_GREEN)
    message_arrow(draw, 370, x_app, x_api, '3. POST /analyze {text, threshold?}', color=ACCENT_RED)
    task_box(draw, (745, 395, 935, 430), '4. Validate and chunk', fill=WHITE, outline=ACCENT_RED)
    message_arrow(draw, 450, x_api, x_model, '5. Tokenize chunks, build tensors', color=ACCENT_AMBER)
    message_arrow(draw, 530, x_model, x_api, '6. Return 16 gap probabilities per chunk', color=ACCENT_AMBER, open_head=True)
    task_box(draw, (745, 560, 935, 595), '7. Aggregate scores', fill=WHITE, outline=ACCENT_RED)
    message_arrow(draw, 630, x_api, x_app, '8. JSON: score, domains, gap details', color=ACCENT_RED, open_head=True)
    message_arrow(draw, 700, x_app, x_db, '9. UPDATE policies SET analysis_result', color=ACCENT_VIOLET)
    message_arrow(draw, 760, x_db, x_app, '10. Persisted successfully', color=ACCENT_VIOLET, open_head=True)
    message_arrow(draw, 850, x_app, x_user, '11. Render compliance badge, scores, and gaps', color=ACCENT_GREEN, open_head=True)

    note_box(draw, (80, 880, 420, 980), 'Runtime Notes', ['Inference: ~100-300 ms per chunk', 'End-to-end: ~500 ms to 1 s', 'Chunked at ~350 words with 50-word overlap'], fill=WHITE, outline=GRAY_500)
    note_box(draw, (1300, 830, 1640, 960), 'Compliance Levels', ['0 gaps: Compliant', '1-5 gaps: Partially compliant', '6+ gaps: Non-compliant'], fill=SOFT_AMBER, outline=ACCENT_AMBER)

    save_manual(image, 'fig_3_5_sequence_policy_classification.png')


def generate_class_diagram() -> None:
    image, draw = canvas(1900, 1200)
    draw.text((620, 30), 'Figure 3.6 - Simplified Class and Component Diagram', fill=BLACK, font=FONT_20_B)

    panel(draw, (60, 100, 900, 560), 'Frontend Components (React + TypeScript)', fill=SOFT_GREEN, outline=ACCENT_GREEN)
    panel(draw, (960, 100, 1840, 560), 'Backend and ML Service (FastAPI + mDeBERTa-v3)', fill=SOFT_ROSE, outline=ACCENT_RED)
    panel(draw, (60, 620, 1840, 1100), 'Data Entities (Supabase PostgreSQL + Auth)', fill=SOFT_AMBER, outline=ACCENT_AMBER)

    # -- Frontend --
    uml_class(draw, (100, 175, 330, 490), 'ComplianceDashboard', ['+ sidebarOpen: bool', '+ currentRoute: string', '+ locale: en | ar'], ['+ loadOverview()', '+ navigate(route)', '+ toggleLanguage()'], fill=WHITE, outline=ACCENT_GREEN)
    uml_class(draw, (370, 175, 600, 490), 'useComplianceStore', ['+ policies: Policy[]', '+ assessments: Assessment[]', '+ tasks: Task[]'], ['+ addPolicy()', '+ analyzePolicy(text)', '+ addAssessment()', '+ addTask()'], fill=WHITE, outline=ACCENT_GREEN)
    uml_class(draw, (640, 175, 860, 490), 'AuthContext', ['+ user: User | null', '+ session: Session | null'], ['+ signIn(email, pwd)', '+ signUp(email, pwd)', '+ signOut()', '+ requestPasswordReset()', '+ updatePassword()'], fill=WHITE, outline=ACCENT_GREEN)

    # -- Backend --
    uml_class(draw, (1000, 175, 1240, 490), 'FastAPIApp', ['- model: GapDetectionModel', '- api_key: str | None'], ['+ health()', '+ analyze(request)', '+ verify_api_key()'], fill=WHITE, outline=ACCENT_RED)
    uml_class(draw, (1290, 175, 1500, 330), 'AnalyzeRequest', ['+ text: str (1-50k chars)', '+ threshold: float = 0.6'], ['+ validate()'], fill=WHITE, outline=ACCENT_RED)
    uml_class(draw, (1290, 370, 1500, 530), 'AnalyzeResponse', ['+ overall_score: float', '+ domains_detected: list', '+ gap_count: int'], ['+ toJSON()'], fill=WHITE, outline=ACCENT_RED)
    uml_class(draw, (1560, 175, 1800, 490), 'GapDetectionModel', ['- tokenizer', '- classifier: nn.Sequential', '- labelMap[16]'], ['+ loadArtifacts()', '+ predict(text)', '+ aggregateChunks()'], fill=WHITE, outline=ACCENT_RED)

    # -- Data Entities --
    uml_class(draw, (100, 700, 380, 1020), 'auth.users', ['+ id: uuid (PK)', '+ email: text', '+ raw_user_meta_data: jsonb', '+ created_at: timestamptz'], ['Managed by Supabase Auth', 'JWT session tokens'], fill=WHITE, outline=ACCENT_AMBER)
    uml_class(draw, (430, 700, 720, 1020), 'Policy', ['+ id: uuid (PK)', '+ user_id: uuid (FK)', '+ title: text', '+ status: enum', '+ compliance_score: real', '+ analysis_result: jsonb'], ['RLS: auth.uid() = user_id'], fill=WHITE, outline=ACCENT_AMBER)
    uml_class(draw, (770, 700, 1110, 1020), 'ComplianceAssessment', ['+ id: uuid (PK)', '+ user_id: uuid (FK)', '+ name: text', '+ framework: text', '+ overall_score: real', '+ results: jsonb'], ['RLS: auth.uid() = user_id'], fill=WHITE, outline=ACCENT_AMBER)
    uml_class(draw, (1160, 700, 1500, 1020), 'RemediationTask', ['+ id: uuid (PK)', '+ user_id: uuid (FK)', '+ control_id: text', '+ priority: enum', '+ status: enum', '+ ai_guidance: jsonb'], ['RLS: auth.uid() = user_id'], fill=WHITE, outline=ACCENT_AMBER)
    # Storage buckets note
    note_box(draw, (1550, 750, 1800, 960), 'Storage Buckets', ['policy-files (10 MB)', 'evidence-files (10 MB)', 'Per-user folder isolation'], fill=WHITE, outline=GRAY_500)

    # -- Arrows --
    poly_arrow(draw, [(330, 330), (370, 330)], ACCENT_GREEN, label='delegates', label_box=(320, 296, 400, 322))
    poly_arrow(draw, [(600, 330), (600, 88), (1120, 88), (1120, 175)], ACCENT_RED, label='POST /analyze', label_box=(740, 60, 960, 86))
    poly_arrow(draw, [(1240, 250), (1290, 250)], ACCENT_RED, label='binds', label_box=(1238, 218, 1306, 244))
    poly_arrow(draw, [(1240, 450), (1290, 450)], ACCENT_RED, label='returns', label_box=(1234, 418, 1310, 444))
    poly_arrow(draw, [(1500, 250), (1560, 250)], ACCENT_AMBER, label='invokes', label_box=(1496, 218, 1576, 244))
    # Store CRUD -> entities
    poly_arrow(draw, [(485, 490), (485, 600), (575, 600), (575, 700)], ACCENT_BLUE, label='CRUD via Supabase', label_box=(420, 572, 620, 598))
    # Auth -> auth.users
    poly_arrow(draw, [(745, 490), (745, 600), (240, 600), (240, 700)], ACCENT_VIOLET, label='authenticate', label_box=(370, 572, 530, 598))
    # 1:N relationships
    draw_arrow(draw, (380, 860), (430, 860), GRAY_500, width=2)
    draw_arrow(draw, (380, 900), (770, 860), GRAY_500, width=2)
    draw_arrow(draw, (380, 940), (1160, 860), GRAY_500, width=2)
    draw_multiline_text(draw, (100, 1040, 800, 1070), '1:N from auth.users to each entity. All tables enforce RLS so users access only their own rows.', fill=GRAY_700, align='left', font_obj=FONT_11)

    draw.text((100, 1110), 'Classes reflect the implemented AICG runtime: React hooks, FastAPI inference service, and Supabase-managed data entities.', fill=GRAY_700, font=FONT_12_B)
    save_manual(image, 'fig_3_6_class_diagram.png')


def generate_dfd_level_1() -> None:
    image, draw = canvas(1900, 1280)
    draw.text((690, 30), 'Figure 3.8 - DFD Level 1 (Operational Processes)', fill=BLACK, font=FONT_20_B)

    box(draw, (70, 170, 280, 280), 'Security Analyst', ['Uploads policies', 'Reviews classifier output'], fill=WHITE, outline=ACCENT_BLUE)
    box(draw, (70, 520, 280, 630), 'Compliance Officer', ['Runs assessments', 'Tracks remediation'], fill=WHITE, outline=ACCENT_GREEN)
    box(draw, (70, 860, 280, 970), 'IT Auditor', ['Reviews dashboards', 'Checks audit evidence'], fill=WHITE, outline=ACCENT_VIOLET)

    box(draw, (1560, 110, 1820, 210), 'Supabase Auth', ['Email authentication', 'Session tokens'], fill=WHITE, outline=ACCENT_AMBER)
    box(draw, (1560, 1030, 1820, 1130), 'Gemini 2.5 Flash', ['Generates synthetic samples'], fill=WHITE, outline=ACCENT_RED)

    process_node(draw, (430, 140, 720, 250), '1.0 Authenticate User', ['email/password session'], fill=SOFT_GREEN, outline=ACCENT_GREEN)
    process_node(draw, (430, 300, 720, 410), '2.0 Analyze Policy', ['submit text or file'], fill=SOFT_GREEN, outline=ACCENT_GREEN)
    process_node(draw, (840, 300, 1150, 410), '3.0 Detect Gaps and Score', ['mDeBERTa-v3 inference'], fill=SOFT_ROSE, outline=ACCENT_RED)
    process_node(draw, (1250, 300, 1540, 410), '4.0 Store Analysis Result', ['save to policies table'], fill=SOFT_GREEN, outline=ACCENT_GREEN)
    process_node(draw, (430, 520, 720, 630), '5.0 Run Assessment', ['map policy to controls'], fill=SOFT_GREEN, outline=ACCENT_GREEN)
    process_node(draw, (840, 520, 1150, 630), '6.0 Generate Remediation Tasks', ['derive actions'], fill=SOFT_GREEN, outline=ACCENT_GREEN)
    process_node(draw, (1250, 520, 1540, 630), '7.0 Visualize Results', ['dashboard and risk views'], fill=SOFT_GREEN, outline=ACCENT_GREEN)
    process_node(draw, (430, 780, 720, 890), '8.0 Refresh Dashboard', ['reuse cached state'], fill=SOFT_GREEN, outline=ACCENT_GREEN)
    process_node(draw, (1250, 980, 1540, 1090), '9.0 Generate Training Dataset', ['prompt LLM and validate'], fill=SOFT_ROSE, outline=ACCENT_RED)

    data_store_box(draw, (1560, 250, 1820, 330), 'D1 Auth Metadata', ['Supabase user profile data'], fill=WHITE, outline=ACCENT_VIOLET)
    data_store_box(draw, (1560, 350, 1820, 430), 'D2 Policies', ['uploaded policy records'], fill=WHITE, outline=ACCENT_VIOLET)
    data_store_box(draw, (1560, 500, 1820, 580), 'D3 Assessments', ['framework results'], fill=WHITE, outline=ACCENT_VIOLET)
    data_store_box(draw, (1560, 600, 1820, 680), 'D4 Remediation Tasks', ['priority and status'], fill=WHITE, outline=ACCENT_VIOLET)
    data_store_box(draw, (1560, 700, 1820, 780), 'D5 Browser Cache', ['local dashboard state'], fill=WHITE, outline=ACCENT_VIOLET)
    data_store_box(draw, (1560, 800, 1820, 880), 'D6 Framework Mapping', ['static ECC and ISO data'], fill=WHITE, outline=ACCENT_VIOLET)
    data_store_box(draw, (920, 140, 1160, 220), 'D7 Model Artifacts', ['weights and tokenizer'], fill=WHITE, outline=ACCENT_VIOLET)
    data_store_box(draw, (1560, 900, 1820, 980), 'D8 Training Dataset', ['CSV, JSON, JSONL'], fill=WHITE, outline=ACCENT_VIOLET)

    poly_arrow(draw, [(280, 225), (430, 225)], ACCENT_BLUE, label='email + password', label_box=(290, 188, 430, 218))
    poly_arrow(draw, [(720, 195), (1560, 195)], ACCENT_AMBER, label='auth request', label_box=(1060, 162, 1210, 190))
    poly_arrow(draw, [(720, 225), (1560, 290)], ACCENT_VIOLET, label='session profile', label_box=(1030, 214, 1210, 242))
    poly_arrow(draw, [(280, 355), (430, 355)], ACCENT_BLUE, label='policy text or file', label_box=(288, 318, 420, 348))
    poly_arrow(draw, [(720, 355), (840, 355)], ACCENT_RED, label='normalized text', label_box=(730, 318, 842, 348))
    poly_arrow(draw, [(995, 300), (995, 220)], ACCENT_AMBER, label='load weights', label_box=(905, 246, 1088, 274))
    poly_arrow(draw, [(1150, 355), (1250, 355)], ACCENT_GREEN, label='label + score', label_box=(1144, 318, 1262, 348))
    poly_arrow(draw, [(1540, 355), (1560, 390)], ACCENT_VIOLET, label='update policy', label_box=(1460, 328, 1572, 356))
    poly_arrow(draw, [(1150, 390), (280, 390)], ACCENT_GREEN, label='classification output', label_box=(640, 392, 900, 424), open_head=True)
    poly_arrow(draw, [(280, 575), (430, 575)], ACCENT_GREEN, label='framework + policies', label_box=(290, 538, 430, 568))
    poly_arrow(draw, [(720, 575), (1560, 365)], ACCENT_VIOLET, label='stored policies', label_box=(1120, 440, 1290, 468))
    poly_arrow(draw, [(720, 610), (1560, 540)], ACCENT_VIOLET, label='assessment results', label_box=(1100, 555, 1290, 583))
    poly_arrow(draw, [(720, 575), (840, 575)], ACCENT_GREEN, label='gaps', label_box=(746, 542, 820, 568))
    poly_arrow(draw, [(1150, 575), (1560, 640)], ACCENT_VIOLET, label='new tasks', label_box=(1320, 618, 1440, 646))
    poly_arrow(draw, [(720, 610), (1250, 610)], ACCENT_GREEN, label='assessment context', label_box=(880, 616, 1070, 644))
    poly_arrow(draw, [(1540, 575), (1560, 740)], ACCENT_VIOLET, label='cache summary state', label_box=(1450, 635, 1590, 665))
    poly_arrow(draw, [(1540, 610), (280, 915)], ACCENT_VIOLET, label='dashboard insights', label_box=(760, 760, 960, 790), open_head=True)
    poly_arrow(draw, [(280, 915), (430, 835)], ACCENT_VIOLET, label='refresh request', label_box=(290, 838, 430, 868))
    poly_arrow(draw, [(720, 835), (1560, 840)], ACCENT_VIOLET, label='cached filters', label_box=(1040, 808, 1185, 838))
    poly_arrow(draw, [(1540, 1035), (1560, 1080)], ACCENT_RED, label='prompt', label_box=(1484, 1002, 1562, 1030))
    poly_arrow(draw, [(1690, 1030), (1690, 900)], ACCENT_RED)
    poly_arrow(draw, [(1820, 1080), (1540, 1080)], ACCENT_RED, label='generated samples', label_box=(1580, 1050, 1775, 1078), open_head=True)
    poly_arrow(draw, [(1540, 1080), (1560, 940)], ACCENT_VIOLET, label='validated dataset', label_box=(1460, 985, 1572, 1013))

    save_manual(image, 'fig_3_8_dfd_level_1.png')


def generate_activity_policy_assessment() -> None:
    image, draw = canvas(1800, 1220)
    draw.text((600, 30), 'Figure 3.9 - Activity Diagram: Policy Assessment Workflow', fill=BLACK, font=FONT_20_B)

    lanes = [
        ((80, 100, 460, 1160), 'User', SOFT_BLUE, ACCENT_BLUE),
        ((460, 100, 880, 1160), 'Frontend', SOFT_GREEN, ACCENT_GREEN),
        ((880, 100, 1300, 1160), 'Backend / ML', SOFT_ROSE, ACCENT_RED),
        ((1300, 100, 1720, 1160), 'Database', SOFT_VIOLET, ACCENT_VIOLET),
    ]
    for xy, title, fill, outline in lanes:
        panel(draw, xy, title, fill=fill, outline=outline)

    draw.ellipse((240, 150, 280, 190), fill=BLACK, outline=BLACK)
    task_box(draw, (150, 220, 370, 280), 'Open policy analysis page', fill=WHITE, outline=ACCENT_BLUE)
    task_box(draw, (150, 320, 370, 380), 'Provide policy text\nor upload document', fill=WHITE, outline=ACCENT_BLUE)
    task_box(draw, (150, 430, 370, 490), 'Select policy category', fill=WHITE, outline=ACCENT_BLUE)

    task_box(draw, (560, 530, 780, 590), 'Validate input and file type', fill=WHITE, outline=ACCENT_GREEN)
    task_box(draw, (560, 650, 780, 710), 'Send POST /analyze request', fill=WHITE, outline=ACCENT_GREEN)
    task_box(draw, (560, 910, 780, 970), 'Display score, gaps, and evidence', fill=WHITE, outline=ACCENT_GREEN)

    task_box(draw, (980, 650, 1200, 710), 'Tokenize and chunk document', fill=WHITE, outline=ACCENT_RED)
    task_box(draw, (980, 770, 1200, 830), 'Run mDeBERTa-v3 inference', fill=WHITE, outline=ACCENT_RED)
    task_box(draw, (980, 890, 1200, 950), 'Aggregate domain scores', fill=WHITE, outline=ACCENT_RED)

    task_box(draw, (1400, 920, 1620, 980), 'Persist analysis result', fill=WHITE, outline=ACCENT_VIOLET)
    task_box(draw, (150, 1040, 370, 1100), 'Review result and next actions', fill=WHITE, outline=ACCENT_BLUE)
    draw.ellipse((240, 1115, 280, 1155), fill=BLACK, outline=BLACK)
    draw.ellipse((248, 1123, 272, 1147), fill=WHITE, outline=BLACK)

    poly_arrow(draw, [(260, 190), (260, 220)], GRAY_700)
    poly_arrow(draw, [(260, 280), (260, 320)], GRAY_700)
    poly_arrow(draw, [(260, 380), (260, 430)], GRAY_700)
    poly_arrow(draw, [(370, 460), (460, 460), (460, 560), (560, 560)], GRAY_700, label='submitted input', label_box=(390, 470, 550, 500))
    poly_arrow(draw, [(670, 590), (670, 650)], GRAY_700)
    poly_arrow(draw, [(780, 680), (980, 680)], GRAY_700, label='validated request', label_box=(792, 646, 956, 674))
    poly_arrow(draw, [(1090, 710), (1090, 770)], GRAY_700)
    poly_arrow(draw, [(1090, 830), (1090, 890)], GRAY_700)
    poly_arrow(draw, [(1200, 920), (1400, 950)], GRAY_700, label='final result', label_box=(1230, 912, 1382, 940))
    poly_arrow(draw, [(1200, 920), (780, 940)], GRAY_700, label='response payload', label_box=(850, 900, 1000, 928), open_head=True)
    poly_arrow(draw, [(670, 970), (670, 1070), (370, 1070)], GRAY_700, label='view results', label_box=(500, 1006, 650, 1034), open_head=True)
    poly_arrow(draw, [(260, 1100), (260, 1115)], GRAY_700)

    save_manual(image, 'fig_3_9_activity_policy_assessment.png')


def generate_deployment_architecture() -> None:
    image, draw = canvas(1900, 1140)
    draw.text((650, 30), 'Figure 3.10 - Deployment Architecture', fill=BLACK, font=FONT_20_B)

    panel(draw, (70, 120, 560, 610), 'Client Environment', fill=SOFT_BLUE, outline=ACCENT_BLUE)
    panel(draw, (650, 120, 1280, 610), 'Google Cloud Runtime', fill=SOFT_AMBER, outline=ACCENT_AMBER)
    panel(draw, (1370, 120, 1820, 510), 'Research and Training Workspace', fill=GRAY_100, outline=GRAY_700)
    panel(draw, (650, 720, 1280, 1030), 'Supabase Cloud', fill=SOFT_VIOLET, outline=ACCENT_VIOLET)
    panel(draw, (1370, 720, 1820, 1030), 'External API', fill=SOFT_ROSE, outline=ACCENT_RED)

    box(draw, (120, 210, 340, 320), 'Web Browser', ['Chrome / Edge / Firefox', 'Responsive desktop UI'], fill=WHITE, outline=ACCENT_BLUE)
    box(draw, (120, 360, 340, 470), 'React + Vite SPA', ['Public portal and dashboard', 'RTL and English support'], fill=WHITE, outline=ACCENT_BLUE)
    box(draw, (370, 360, 520, 470), 'Local Storage', ['seeded demo state', 'policies, assessments, tasks'], fill=WHITE, outline=ACCENT_BLUE)

    box(draw, (730, 230, 980, 360), 'Cloud Run Service', ['FastAPI container', '/health and /analyze'], fill=WHITE, outline=ACCENT_AMBER)
    box(draw, (1030, 230, 1210, 360), 'Model Bucket', ['GCS artifacts', 'weights and tokenizer'], fill=WHITE, outline=ACCENT_AMBER)
    box(draw, (730, 410, 1210, 520), 'mDeBERTa-v3 Runtime', ['document chunking', 'multi-label inference', 'score aggregation'], fill=WHITE, outline=ACCENT_AMBER)

    box(draw, (1440, 200, 1750, 300), 'Model Notebook', ['fine-tuning experiments', 'evaluation notebooks'], fill=WHITE, outline=GRAY_700)
    box(draw, (1440, 350, 1750, 450), 'Dataset Scripts', ['generate_compliance_dataset.py', 'dataset_utils.py'], fill=WHITE, outline=GRAY_700)

    cylinder_box(draw, (730, 800, 980, 910), 'PostgreSQL', ['policies', 'assessments', 'tasks', 'auth metadata via Supabase Auth'], fill=WHITE, outline=ACCENT_VIOLET)
    box(draw, (1030, 800, 1210, 910), 'Supabase Auth', ['Email auth and JWT issuer'], fill=WHITE, outline=ACCENT_VIOLET)
    box(draw, (1470, 820, 1750, 920), 'Gemini 2.5 Flash API', ['prompted dataset generation'], fill=WHITE, outline=ACCENT_RED)

    poly_arrow(draw, [(340, 265), (730, 265)], ACCENT_BLUE, label='HTTPS', label_box=(460, 230, 610, 258))
    poly_arrow(draw, [(340, 415), (1030, 855)], ACCENT_VIOLET, label='email auth', label_box=(610, 620, 770, 648))
    poly_arrow(draw, [(340, 415), (730, 465)], ACCENT_AMBER, label='REST requests', label_box=(450, 404, 620, 432))
    poly_arrow(draw, [(980, 865), (730, 465)], ACCENT_VIOLET, label='read and write', label_box=(820, 680, 980, 708))
    poly_arrow(draw, [(1030, 295), (980, 295)], ACCENT_AMBER, label='load artifacts', label_box=(932, 260, 1070, 288), open_head=True)
    poly_arrow(draw, [(1595, 300), (1120, 230)], ACCENT_AMBER, label='deploy model files', label_box=(1260, 220, 1450, 248))
    poly_arrow(draw, [(1595, 450), (1610, 820)], ACCENT_RED, label='API prompts', label_box=(1615, 600, 1710, 628))

    draw.text((720, 1070), 'Production traffic flows from the browser to the Cloud Run API, while research scripts maintain datasets and model artifacts.', fill=GRAY_700, font=FONT_12_B)
    save_manual(image, 'fig_3_10_deployment_architecture.png')


def generate_use_case_diagram() -> None:
    image, draw = canvas(1900, 1280)
    draw.text((720, 30), 'Figure 3.12 - Use Case Diagram', fill=BLACK, font=FONT_20_B)

    panel(draw, (330, 110, 1570, 1180), 'AICG System Boundary', fill=GRAY_100, outline=GRAY_700)

    draw_actor(draw, 210, 340, 'Security\nAnalyst')
    draw_actor(draw, 210, 760, 'Compliance\nOfficer')
    draw_actor(draw, 1685, 690, 'IT\nAuditor')
    draw_actor(draw, 1685, 190, 'Supabase\nAuth')
    draw_actor(draw, 1685, 440, 'ML API\n(Cloud Run)')

    draw.text((420, 170), 'Access and Profile', fill=GRAY_700, font=FONT_14_B)
    draw.text((420, 390), 'Policy Analysis', fill=GRAY_700, font=FONT_14_B)
    draw.text((420, 650), 'Compliance Management', fill=GRAY_700, font=FONT_14_B)
    draw.text((420, 915), 'Oversight and Collaboration', fill=GRAY_700, font=FONT_14_B)

    use_case(draw, (450, 200, 700, 280), 'Sign In (Email)', fill=SOFT_BLUE, outline=ACCENT_BLUE)
    use_case(draw, (760, 200, 1010, 280), 'Manage Account', fill=SOFT_BLUE, outline=ACCENT_BLUE)
    use_case(draw, (1070, 200, 1320, 280), 'Switch Language\n(AR / EN)', fill=SOFT_BLUE, outline=ACCENT_BLUE)

    use_case(draw, (450, 420, 700, 500), 'Submit Policy Text', fill=SOFT_GREEN, outline=ACCENT_GREEN)
    use_case(draw, (760, 420, 1010, 500), 'Upload Document', fill=SOFT_GREEN, outline=ACCENT_GREEN)
    use_case(draw, (1070, 420, 1320, 500), 'Analyze Policy', fill=SOFT_GREEN, outline=ACCENT_GREEN)
    use_case(draw, (1380, 420, 1530, 500), 'Review Results', fill=SOFT_GREEN, outline=ACCENT_GREEN)
    use_case(draw, (760, 530, 1010, 610), 'View Results and Evidence', fill=SOFT_GREEN, outline=ACCENT_GREEN)

    use_case(draw, (450, 680, 700, 760), 'Manage Policies', fill=SOFT_VIOLET, outline=ACCENT_VIOLET)
    use_case(draw, (760, 680, 1010, 760), 'Run Assessment', fill=SOFT_VIOLET, outline=ACCENT_VIOLET)
    use_case(draw, (1070, 680, 1320, 760), 'Track Remediation', fill=SOFT_VIOLET, outline=ACCENT_VIOLET)
    use_case(draw, (1380, 680, 1530, 760), 'View Framework Mapping', fill=SOFT_VIOLET, outline=ACCENT_VIOLET)

    use_case(draw, (450, 940, 700, 1020), 'View Dashboard', fill=SOFT_AMBER, outline=ACCENT_AMBER)
    use_case(draw, (760, 940, 1010, 1020), 'Review Assessments', fill=SOFT_AMBER, outline=ACCENT_AMBER)
    use_case(draw, (1070, 940, 1320, 1020), 'View Risk Dashboard', fill=SOFT_AMBER, outline=ACCENT_AMBER)

    poly_arrow(draw, [(280, 420), (450, 240)], ACCENT_BLUE, open_head=True)
    poly_arrow(draw, [(280, 440), (760, 240)], ACCENT_BLUE, open_head=True)
    poly_arrow(draw, [(280, 460), (1070, 240)], ACCENT_BLUE, open_head=True)

    poly_arrow(draw, [(280, 520), (450, 460)], ACCENT_GREEN, open_head=True)
    poly_arrow(draw, [(280, 540), (760, 460)], ACCENT_GREEN, open_head=True)
    poly_arrow(draw, [(280, 560), (760, 570)], ACCENT_GREEN, open_head=True)
    # Route "Review Results" line above system boundary to avoid crossing through ellipses
    poly_arrow(draw, [(280, 400), (310, 400), (310, 90), (1455, 90), (1455, 420)], ACCENT_GREEN, open_head=True)

    poly_arrow(draw, [(280, 900), (450, 720)], ACCENT_VIOLET, open_head=True)
    poly_arrow(draw, [(280, 920), (760, 720)], ACCENT_VIOLET, open_head=True)
    # Route "Track Remediation" line below compliance row to avoid crossing through ellipses
    poly_arrow(draw, [(280, 960), (380, 960), (380, 800), (1195, 800), (1195, 760)], ACCENT_VIOLET, open_head=True)
    # Route "View Framework Mapping" line below compliance row
    poly_arrow(draw, [(280, 980), (400, 980), (400, 810), (1455, 810), (1455, 760)], ACCENT_VIOLET, open_head=True)
    poly_arrow(draw, [(280, 990), (450, 980)], ACCENT_AMBER, open_head=True)
    poly_arrow(draw, [(280, 1010), (1070, 980)], ACCENT_AMBER, open_head=True)

    poly_arrow(draw, [(1620, 800), (1380, 720)], ACCENT_VIOLET, open_head=True)
    poly_arrow(draw, [(1620, 820), (760, 980)], ACCENT_AMBER, open_head=True)
    poly_arrow(draw, [(1620, 240), (1620, 170), (575, 170), (575, 200)], ACCENT_BLUE, open_head=True)
    poly_arrow(draw, [(1620, 490), (1320, 460)], ACCENT_RED, open_head=True)

    poly_arrow(draw, [(700, 435), (700, 395), (1070, 395), (1070, 420)], GRAY_500, label='includes', label_box=(812, 370, 950, 394), open_head=True)
    poly_arrow(draw, [(1010, 470), (1040, 470), (1040, 460), (1070, 460)], GRAY_500, label='includes', label_box=(1016, 436, 1132, 458), open_head=True)
    poly_arrow(draw, [(1195, 500), (885, 530)], GRAY_500, label='produces', label_box=(930, 496, 1045, 524), open_head=True)
    poly_arrow(draw, [(1010, 720), (1010, 790), (1380, 790), (1380, 760)], GRAY_500, label='feeds', label_box=(1130, 792, 1260, 818), open_head=True)

    save_manual(image, 'fig_3_12_use_case_diagram.png')


def generate_dfd_level_0() -> None:
    image, draw = canvas(1400, 900)
    draw.text((360, 32), "AICG — Data Flow Diagram (Context)", fill=BLACK, font=FONT_18_B)

    box(draw, (470, 250, 930, 560), "AICG Compliance Platform", ["Policy upload and analysis", "Gap detection with mDeBERTa-v3", "Assessments and remediation tasks"], fill="#d5e8d4", outline=ACCENT_GREEN)
    box(draw, (90, 190, 320, 330), "Security Analyst", ["Uploads policies", "Reviews results"], fill="#dae8fc", outline=ACCENT_BLUE)
    box(draw, (90, 430, 320, 570), "Compliance Officer", ["Runs assessments", "Tracks remediation"], fill="#dae8fc", outline=ACCENT_BLUE)
    box(draw, (1080, 140, 1310, 300), "Supabase / PostgreSQL", ["Auth metadata", "Policies", "Assessments", "Tasks"], fill="#e1d5e7", outline=ACCENT_VIOLET)
    box(draw, (1080, 360, 1310, 520), "FastAPI + mDeBERTa-v3", ["/analyze endpoint", "Document chunking", "16-label inference"], fill="#f8cecc", outline=ACCENT_RED)
    box(draw, (1080, 580, 1310, 740), "Google Cloud Storage", ["Model artifacts", "Tokenizer files"], fill="#fff2cc", outline=ACCENT_AMBER)

    draw_arrow(draw, (320, 260), (470, 320), GRAY_700, width=4)
    draw_arrow(draw, (470, 370), (320, 500), GRAY_700, width=4)
    draw_arrow(draw, (930, 300), (1080, 220), GRAY_700, width=4)
    draw_arrow(draw, (930, 390), (1080, 430), GRAY_700, width=4)
    draw_arrow(draw, (930, 470), (1080, 660), GRAY_700, width=4)
    save_manual(image, "fig_3_7_dfd.png")


def generate_sequence_authentication() -> None:
    image, draw = canvas(1700, 1020)
    draw.text((400, 30), 'Sequence — Authentication (Sign Up & Sign In)', fill=BLACK, font=FONT_20_B)

    x_user, x_page, x_ctx, x_auth, x_meta = 160, 420, 680, 1020, 1400
    lifeline(draw, x_user, 'User', '(Browser)', color_fill=SOFT_BLUE, color_outline=ACCENT_BLUE)
    lifeline(draw, x_page, ':AuthPage', '(React)', color_fill=SOFT_AMBER, color_outline=ACCENT_AMBER)
    lifeline(draw, x_ctx, ':AuthContext', '(Provider)', color_fill=SOFT_GREEN, color_outline=ACCENT_GREEN)
    lifeline(draw, x_auth, ':Supabase Auth', '(Cloud)', color_fill=SOFT_VIOLET, color_outline=ACCENT_VIOLET)
    lifeline(draw, x_meta, ':Auth Metadata', '(PostgreSQL)', color_fill=SOFT_ROSE, color_outline=ACCENT_RED)

    # Sign Up frame
    draw.rounded_rectangle((100, 200, 1580, 530), radius=12, fill=None, outline=ACCENT_RED, width=3)
    draw.rounded_rectangle((100, 200, 260, 226), radius=8, fill=SOFT_ROSE, outline=ACCENT_RED, width=2)
    draw_multiline_text(draw, (108, 204, 256, 224), 'Sign Up Flow', fill=BLACK, align='center', font_obj=FONT_12_B)

    activation_bar(draw, x_page, 240, 510, color_fill='#fff6e5', color_outline=ACCENT_AMBER)
    activation_bar(draw, x_ctx, 270, 440, color_fill='#eef8f0', color_outline=ACCENT_GREEN)
    activation_bar(draw, x_auth, 300, 420, color_fill='#f4efff', color_outline=ACCENT_VIOLET)
    activation_bar(draw, x_meta, 330, 370, color_fill='#fff0ee', color_outline=ACCENT_RED)

    message_arrow(draw, 240, x_user, x_page, '1. enter email, password, name', color=ACCENT_BLUE)
    message_arrow(draw, 280, x_page, x_ctx, '2. signUp(email, password)', color=ACCENT_GREEN)
    message_arrow(draw, 310, x_ctx, x_auth, '3. supabase.auth.signUp({email, password, name})', color=ACCENT_VIOLET)
    message_arrow(draw, 340, x_auth, x_meta, '4. Store user metadata', color=ACCENT_RED)
    message_arrow(draw, 370, x_meta, x_auth, 'user record ready', color=ACCENT_RED, open_head=True)
    message_arrow(draw, 410, x_auth, x_ctx, '5. onAuthStateChange → session', color=ACCENT_VIOLET, open_head=True)
    message_arrow(draw, 450, x_ctx, x_page, '6. navigate(\'/dashboard\')', color=ACCENT_GREEN, open_head=True)
    message_arrow(draw, 500, x_page, x_user, 'redirect to dashboard', color=ACCENT_AMBER, open_head=True)

    # Sign In frame
    draw.rounded_rectangle((100, 570, 1200, 860), radius=12, fill=None, outline=ACCENT_GREEN, width=3)
    draw.rounded_rectangle((100, 570, 240, 596), radius=8, fill=SOFT_GREEN, outline=ACCENT_GREEN, width=2)
    draw_multiline_text(draw, (108, 574, 236, 594), 'Sign In Flow', fill=BLACK, align='center', font_obj=FONT_12_B)

    activation_bar(draw, x_page, 600, 840, color_fill='#fff6e5', color_outline=ACCENT_AMBER)
    activation_bar(draw, x_ctx, 630, 770, color_fill='#eef8f0', color_outline=ACCENT_GREEN)
    activation_bar(draw, x_auth, 660, 730, color_fill='#f4efff', color_outline=ACCENT_VIOLET)

    message_arrow(draw, 610, x_user, x_page, '1. enter email, password', color=ACCENT_BLUE)
    message_arrow(draw, 650, x_page, x_ctx, '2. signIn(email, password)', color=ACCENT_GREEN)
    message_arrow(draw, 690, x_ctx, x_auth, '3. supabase.auth.signInWithPassword({...})', color=ACCENT_VIOLET)
    message_arrow(draw, 730, x_auth, x_ctx, 'JWT session token', color=ACCENT_VIOLET, open_head=True)
    message_arrow(draw, 770, x_ctx, x_page, '4. navigate(\'/dashboard\')', color=ACCENT_GREEN, open_head=True)
    message_arrow(draw, 830, x_page, x_user, 'redirect to dashboard', color=ACCENT_AMBER, open_head=True)

    save_manual(image, 'fig_3_5b_sequence_authentication.png')


def generate_sequence_assessment() -> None:
    image, draw = canvas(1700, 1060)
    draw.text((400, 30), 'Sequence — Assessment & Gap Analysis', fill=BLACK, font=FONT_20_B)

    x_user, x_page, x_store, x_db, x_stor, x_rem = 120, 340, 560, 780, 1060, 1400
    lifeline(draw, x_user, 'User', '(Browser)', color_fill=SOFT_BLUE, color_outline=ACCENT_BLUE)
    lifeline(draw, x_page, ':AssessmentsPage', '(React)', color_fill=SOFT_AMBER, color_outline=ACCENT_AMBER)
    lifeline(draw, x_store, ':ComplianceStore', '(State)', color_fill=SOFT_GREEN, color_outline=ACCENT_GREEN)
    lifeline(draw, x_db, ':Supabase DB', '(PostgreSQL)', color_fill=SOFT_VIOLET, color_outline=ACCENT_VIOLET)
    lifeline(draw, x_stor, ':Supabase Storage', '(Buckets)', color_fill=SOFT_VIOLET, color_outline=ACCENT_VIOLET)
    lifeline(draw, x_rem, ':RemediationPage', '(React)', color_fill=SOFT_AMBER, color_outline=ACCENT_AMBER)

    activation_bar(draw, x_page, 210, 940, color_fill='#fff6e5', color_outline=ACCENT_AMBER)
    activation_bar(draw, x_store, 250, 320, color_fill='#eef8f0', color_outline=ACCENT_GREEN)
    activation_bar(draw, x_db, 270, 310, color_fill='#f4efff', color_outline=ACCENT_VIOLET)

    message_arrow(draw, 210, x_user, x_page, '1. Click \'New Assessment\' (select policy + framework)', color=ACCENT_BLUE)
    message_arrow(draw, 250, x_page, x_store, '2. addAssessment({policyId, framework, controls})', color=ACCENT_GREEN)
    message_arrow(draw, 280, x_store, x_db, 'INSERT assessments', color=ACCENT_VIOLET)
    message_arrow(draw, 320, x_db, x_page, 'assessmentId', color=ACCENT_VIOLET, open_head=True)

    # Loop frame
    draw.rounded_rectangle((90, 370, 1180, 610), radius=12, fill=None, outline=ACCENT_RED, width=3)
    draw.rounded_rectangle((90, 370, 280, 396), radius=8, fill=SOFT_ROSE, outline=ACCENT_RED, width=2)
    draw_multiline_text(draw, (98, 374, 276, 394), 'loop [for each control]', fill=BLACK, align='center', font_obj=FONT_12_B)

    activation_bar(draw, x_stor, 440, 490, color_fill='#f4efff', color_outline=ACCENT_VIOLET)

    message_arrow(draw, 400, x_user, x_page, '4. Mark control (compliant / partial / non-compliant)', color=ACCENT_BLUE)
    message_arrow(draw, 440, x_page, x_stor, '5. Upload evidence file', color=ACCENT_VIOLET)
    message_arrow(draw, 480, x_stor, x_page, 'file URL', color=ACCENT_VIOLET, open_head=True)
    message_arrow(draw, 520, x_user, x_page, '6. Add comment to control', color=ACCENT_BLUE)
    message_arrow(draw, 570, x_page, x_store, 'updateAssessment(id, {controls})', color=ACCENT_GREEN)

    # Self-call: calculate score
    task_box(draw, (270, 640, 420, 680), '7. Calculate\ncompliance score', fill=WHITE, outline=ACCENT_AMBER)

    activation_bar(draw, x_store, 710, 780, color_fill='#eef8f0', color_outline=ACCENT_GREEN)
    activation_bar(draw, x_db, 730, 770, color_fill='#f4efff', color_outline=ACCENT_VIOLET)

    message_arrow(draw, 720, x_page, x_store, '8. updateAssessment(id, {status: \'completed\', score})', color=ACCENT_GREEN)
    message_arrow(draw, 750, x_store, x_db, 'UPDATE assessments', color=ACCENT_VIOLET)

    activation_bar(draw, x_rem, 820, 880, color_fill='#fff6e5', color_outline=ACCENT_AMBER)
    activation_bar(draw, x_store, 860, 890, color_fill='#eef8f0', color_outline=ACCENT_GREEN)

    message_arrow(draw, 820, x_page, x_rem, '9. Generate remediation tasks for non-compliant controls', color=ACCENT_RED)
    message_arrow(draw, 870, x_rem, x_store, 'addTask() per gap → Supabase', color=ACCENT_GREEN)

    message_arrow(draw, 930, x_page, x_user, 'assessment complete', color=ACCENT_AMBER, open_head=True)

    save_manual(image, 'fig_3_5c_sequence_assessment_gap.png')


def generate_database_erd() -> None:
    image, draw = canvas(1800, 1100)
    draw.text((410, 28), "Figure 3.11 - Database Entity-Relationship Diagram", fill=BLACK, font=FONT_18_B)

    tables = [
        ((110, 140, 420, 380), "auth.users", ["PK id", "email", "raw_user_meta_data", "created_at", "managed by Supabase Auth"]),
        ((500, 120, 850, 430), "policies", ["PK id", "FK user_id -> auth.users.id", "title", "status", "compliance_score", "analysis_result"]),
        ((910, 120, 1260, 430), "assessments", ["PK id", "FK user_id -> auth.users.id", "name", "framework", "overall_score", "results"]),
        ((500, 540, 850, 900), "tasks", ["PK id", "FK user_id -> auth.users.id", "assessment_id", "control_id", "priority", "ai_guidance"]),
    ]

    for xy, title, body in tables:
        box(draw, xy, title, body, fill=WHITE, outline=GRAY_700)

    draw_arrow(draw, (420, 230), (500, 230), GRAY_700, width=3)
    draw_arrow(draw, (420, 285), (910, 260), GRAY_700, width=3)
    draw_arrow(draw, (420, 320), (500, 700), GRAY_700, width=3)
    draw_arrow(draw, (910, 305), (850, 690), GRAY_700, width=3)

    draw.text((420, 980), "Core relationships: each auth user owns many policies, assessments, and remediation tasks.", fill=GRAY_700, font=FONT_12_B)
    save_manual(image, "fig_3_11_database_erd.png")


def render_drawio(source_name: str, output_name: str) -> None:
    DrawioRenderer(SYSTEM_DESIGN_DIR / source_name).render(output_name)


def main() -> None:
    generate_system_architecture()
    generate_ml_pipeline()
    generate_classification_head()
    generate_chunking_pipeline()
    generate_sequence_policy_classification()
    generate_sequence_authentication()
    generate_sequence_assessment()
    generate_class_diagram()
    generate_dfd_level_0()
    generate_dfd_level_1()
    generate_activity_policy_assessment()
    generate_deployment_architecture()
    generate_database_erd()
    generate_use_case_diagram()

    print(f"Generated figure assets in: {OUT_DIR}")


if __name__ == "__main__":
    main()