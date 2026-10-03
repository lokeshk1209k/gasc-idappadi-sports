import os
from PIL import Image

user_dir = r'C:\Users\ELCOT\.gemini\antigravity-ide\brain\3c75f128-f237-441e-a405-973e8ee3b68a\.user_uploaded'
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
pictures_dir = r'C:\Users\ELCOT\Pictures\website photo'

dest_dirs = [
    pictures_dir,
    os.path.join(project_root, 'client/public/images/sports'),
    os.path.join(project_root, 'student-client/public/images/sports'),
    os.path.join(project_root, 'student-client/dist/images/sports'),
    r'C:\Users\ELCOT\Downloads\GASC Sports Admin Portal\resources\app\client\public\images\sports',
    r'C:\Users\ELCOT\Downloads\GASC Sports Admin Portal\resources\app\student-client\dist\images\sports'
]

for d in dest_dirs:
    if not os.path.exists(d):
        os.makedirs(d, exist_ok=True)

photo_mappings = [
    {'file': 'media_1790430647494.jpg', 'sport': 'boxing', 'aliases': ['boxing.png', 'Boxing.png']},
    {'file': 'media_1790430682211.jpg', 'sport': 'badminton', 'aliases': ['badminton.png', 'Badminton.png']},
    {'file': 'media_1790428677059.jpg', 'sport': 'chess', 'aliases': ['chess.png', 'chess_2.png', 'chess (2).png']},
    {'file': 'media_1790428576157.jpg', 'sport': 'cricket', 'aliases': ['cricket.png', 'Cricket.png']},
    {'file': 'media_1790428605087.jpg', 'sport': 'kabaddi', 'aliases': ['kabaddi.png', 'Kabaddi.png']}
]

print("[IMPORTING] Converting and copying user photos into genuine PNG format...")

for item in photo_mappings:
    src_path = os.path.join(user_dir, item['file'])
    if not os.path.exists(src_path):
        print(f"  [MISSING] {item['file']}")
        continue

    try:
        with Image.open(src_path) as img:
            rgb_img = img.convert('RGB')
            for alias in item['aliases']:
                for dest_dir in dest_dirs:
                    dest_file = os.path.join(dest_dir, alias)
                    rgb_img.save(dest_file, 'PNG', optimize=True)
            print(f"  [OK] Saved {item['sport']} -> {item['aliases']}")
    except Exception as e:
        print(f"  [ERROR] Failed {item['sport']}: {e}")

print("[DONE] All sports photos converted and deployed!")
