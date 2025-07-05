import os 
import re
import shutil


base_path = os.getcwd()

django_path_html = os.path.join(base_path, "docker/app/ivaprime/templates/ivaprime/")
django_path_resources = os.path.join(base_path, "docker/app/ivaprime/static/")

tauri_path_html = os.path.join(base_path, "tauri/iva-prime/src/")
tauri_path_resources = os.path.join(base_path, "tauri/iva-prime/src/static/")
tauri_js_path = os.path.join(base_path, "tauri/iva-prime/src/tauri_js/")


js_scripts = []
if os.path.exists(tauri_js_path):
    for js_file in os.listdir(tauri_js_path):
        if js_file.endswith(".js"):
            js_scripts.append(f'<script type="module" src="static/js/{js_file}"></script>\n')

# Copy and clean HTML files
remove_line_pattern = re.compile(r'^\s*{%\s*[^%]+?\s*%}\s*$', re.IGNORECASE)
static_path_pattern = re.compile(r"""{%\s*static\s+['"]([^'"]+)['"]\s*%}""")
block_start_pattern = re.compile(r'\s*<!--\s*([a-zA-Z0-9_-]+):django:start\s*-->')
block_end_pattern = lambda key: re.compile(rf'\s*<!--\s*{re.escape(key)}:django:end\s*-->')
tauri_block_pattern = lambda key: re.compile(rf'\s*<!--\s*{re.escape(key)}:tauri\b')
for filename in os.listdir(django_path_html):
    if filename.endswith(".html"):
        html_path = os.path.join(django_path_html, filename)
        with open(html_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        cleaned_lines = []
        i = 0
        while i < len(lines):
            line = lines[i]

            # Remove lines with pure django logic
            if remove_line_pattern.match(line):
                i += 1
                continue

            # Replace {% static '...' %} with just the path
            cleaned_line = static_path_pattern.sub(r"static/\1", line)

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
                    block_content.append(static_path_pattern.sub(r"static/\1", l))
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
                            replacement_lines.append(static_path_pattern.sub(r"static/\1", lines[k]))
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
        target_path = os.path.join(tauri_path_html, filename)
        with open(target_path, 'w', encoding='utf-8') as f:
            f.writelines(cleaned_lines)

# Remove everything in tauri_path_resources
for item in os.listdir(tauri_path_resources):
    item_path = os.path.join(tauri_path_resources, item)
    if os.path.isdir(item_path):
        shutil.rmtree(item_path)
    else:
        os.remove(item_path)

# Copy resource folders
for item in os.listdir(django_path_resources):
    src_path = os.path.join(django_path_resources, item)
    dst_path = os.path.join(tauri_path_resources, item)

    if os.path.isdir(src_path):
        if os.path.exists(dst_path):
            shutil.rmtree(dst_path)
        shutil.copytree(src_path, dst_path)