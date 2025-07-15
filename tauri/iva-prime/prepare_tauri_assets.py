import re
from pathlib import Path
import shutil


print(f"Preparing tauri assets...")

# Working dir is always inside tauri project folder
working_dir = Path.cwd()
project_path = working_dir.parent.parent

# Paths
DJANGO_TEMPLATES = project_path / "docker/app/ivaprime/templates/ivaprime/"
DJANGO_STATICS = project_path / "docker/app/ivaprime/static/"
TAURI_SRC = project_path / "tauri/iva-prime/src/"
TAURI_STATICS = TAURI_SRC / "static"

# Ensure src/ exists before cleaning or copying
TAURI_SRC.mkdir(parents=True, exist_ok=True)

# Delete everything in TAURI_SRC
for item in TAURI_SRC.iterdir():
    if item.is_dir():
        shutil.rmtree(item)
    else:
        item.unlink()


# Regex patterns
pure_django_logic_lines_pattern = re.compile(r'^\s*{%\s*[^%]+?\s*%}\s*$', re.IGNORECASE)
django_path_pattern = re.compile(r"""{%\s*static\s+['"]([^'"]+)['"]\s*%}""")
block_start_pattern = re.compile(r'\s*<!--\s*([a-zA-Z0-9_-]+):django:start\s*-->')
block_end_pattern = lambda key: re.compile(rf'\s*<!--\s*{re.escape(key)}:django:end\s*-->')
tauri_block_pattern = lambda key: re.compile(rf'\s*<!--\s*{re.escape(key)}:tauri\b')

for html_path in DJANGO_TEMPLATES.glob("*.html"):
    print(f'Cleaning HTML file -> {html_path}')
    
    with html_path.open('r', encoding='utf-8') as f:
        lines = f.readlines()
    
    cleaned_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]

        """Skip lines with pure django logic
        Example:
            {% if DEBUG %}
                {% load livereload_tags %}
                {% livereload_script %}
            {% endif %}
        """
        if pure_django_logic_lines_pattern.match(line):
            i += 1
            continue

        """Replace {% static '...' %} with just the path
        Example:
            "{% static 'assets/favicon.ico' %}" -> "static/assets/favicon.ico"
        """
        cleaned_line = django_path_pattern.sub(r"static/\1", line)

        """Replace django logic with the commented tauri logic
        Example:
            <!-- about-toolbar-button:django:start -->
                <div class="toolbar-button" title="Help" onclick="window.open('/about', '_blank').focus();">
                    <span class="toolbar-help-button"></span>
                </div>
            <!-- about-toolbar-button:django:end -->
            <!-- about-toolbar-button:tauri
                <div class="toolbar-button" title="Help" onclick="window.__TAURI__.core.invoke('open_about_window')">
                    <span class="toolbar-help-button"></span>
                </div>
            -->
        """
        # Look for ANY block-key:django:start
        block_start = block_start_pattern.match(cleaned_line)
        if block_start:
            block_key = block_start.group(1)
            # Collect Django block content (skip markers)
            block_content = []
            i += 1
            while i < len(lines):
                l = lines[i]
                if block_end_pattern(block_key).match(l):
                    break
                block_content.append(django_path_pattern.sub(r"static/\1", l))
                i += 1
            i += 1  # Move past the end marker

            # Now look for the tauri replacement block right after this block
            tauri_replacement = None
            j = i
            while j < len(lines):
                tauri_start = tauri_block_pattern(block_key).match(lines[j])
                if tauri_start:
                    # Grab all lines inside this comment until -->
                    replacement_lines = []
                    k = j + 1
                    while k < len(lines) and "-->" not in lines[k]:
                        replacement_lines.append(django_path_pattern.sub(r"static/\1", lines[k]))
                        k += 1
                    tauri_replacement = replacement_lines
                    i = k + 1  # skip past the end of comment for the main iterator
                    break
                # Stop searching after a few lines (or if a new block starts)
                if block_start_pattern.match(lines[j]) or j > i + 10:
                    break
                j += 1

            # If found, insert tauri block; otherwise, keep the original
            if tauri_replacement:
                cleaned_lines.extend(tauri_replacement)
            else:
                cleaned_lines.extend(block_content)
            continue

        # If not in a block, just append the cleaned line
        cleaned_lines.append(cleaned_line)
        i += 1

    # Write cleaned content
    target_path = TAURI_SRC / html_path.name
    with open(target_path, 'w', encoding='utf-8') as f:
        f.writelines(cleaned_lines)


# Copy the entire static folder over
print(f'Copying static folder from {DJANGO_STATICS} to {TAURI_STATICS}')
shutil.copytree(DJANGO_STATICS, TAURI_STATICS, dirs_exist_ok=True)
        
print("Done.")