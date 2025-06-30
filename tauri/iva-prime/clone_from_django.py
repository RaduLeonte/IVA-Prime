import os 
import re
import shutil


base_path = os.getcwd()

django_path_html = os.path.join(base_path, "app/ivaprime/templates/ivaprime/")
django_path_resources = os.path.join(base_path, "app/ivaprime/static/")

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
for filename in os.listdir(django_path_html):
    if filename.endswith(".html"):
        html_path = os.path.join(django_path_html, filename)
        with open(html_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        cleaned_lines = []
        for line in lines:
            # Remove lines with pure django logic
            if remove_line_pattern.match(line): continue
            
            # Replace {% static '...' %} with just the path
            cleaned_line = static_path_pattern.sub(r"static/\1", line)
            cleaned_lines.append(cleaned_line)
        
        # Inject tauri JS to index.html
        """ if filename == "index.html" and os.path.exists(tauri_js_path):
            # Find </head> line and extract its indentation
            insert_index = None
            indent = ""
            for i, line in enumerate(cleaned_lines):
                if "</head>" in line:
                    insert_index = i
                    indent = re.match(r"^(\s*)", line).group(1)
                    break

            # Create script tags with matched indentation
            if insert_index is not None:
                js_script_lines = []
                for js_file in os.listdir(tauri_js_path):
                    if js_file.endswith(".js"):
                        js_script_lines.append(f'{indent}\t<script type="module" src="tauri_js/{js_file}"></script>\n')
                cleaned_lines[insert_index:insert_index] = js_script_lines """


        # Write cleaned content
        target_path = os.path.join(tauri_path_html, filename)
        with open(target_path, 'w', encoding='utf-8') as f:
            f.writelines(cleaned_lines)


# Copy resource folders
for item in os.listdir(django_path_resources):
    src_path = os.path.join(django_path_resources, item)
    dst_path = os.path.join(tauri_path_resources, item)

    if os.path.isdir(src_path):
        if os.path.exists(dst_path):
            shutil.rmtree(dst_path)
        shutil.copytree(src_path, dst_path)