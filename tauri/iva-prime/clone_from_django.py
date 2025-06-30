import os 
import re
import shutil


base_path = os.getcwd()

django_path_html = os.path.join(base_path, "app/ivaprime/templates/ivaprime/")
django_path_resources = os.path.join(base_path, "app/ivaprime/static/")

tauri_path_html = os.path.join(base_path, "tauri/iva-prime/src/")
tauri_path_resources = os.path.join(base_path, "tauri/iva-prime/src/static/")


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