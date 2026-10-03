import os
from PIL import Image

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))

directories = [
    os.path.join(project_root, 'client/public/images/sports'),
    os.path.join(project_root, 'student-client/public/images/sports'),
    os.path.join(project_root, 'student-client/dist/images/sports'),
    r'C:\Users\ELCOT\Downloads\GASC Sports Admin Portal\resources\app\client\public\images\sports',
    r'C:\Users\ELCOT\Downloads\GASC Sports Admin Portal\resources\app\student-client\dist\images\sports'
]

print("[CONVERTING] Converting all sports images to 100% genuine PNG format...")

converted_count = 0

for target_dir in directories:
    if not os.path.exists(target_dir):
        continue

    for file_name in os.listdir(target_dir):
        if not file_name.endswith('.png'):
            continue

        file_path = os.path.join(target_dir, file_name)
        try:
            with Image.open(file_path) as img:
                # Check if it needs conversion to true PNG
                if img.format != 'PNG':
                    rgb_img = img.convert('RGB')
                    rgb_img.save(file_path, 'PNG', optimize=True)
                    converted_count += 1
                    print(f"  [OK] Converted {file_name} from {img.format} to true PNG")
        except Exception as e:
            print(f"  [ERROR] Failed {file_name}: {e}")

print(f"[DONE] Successfully verified and converted {converted_count} images into clean PNG format!")
