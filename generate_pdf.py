from fpdf import FPDF
import glob
import os

# Cherche tous les fichiers texte dans le dossier "heures"
txt_files = glob.glob("heures/*.txt")

if not txt_files:
    print("Aucun fichier d'heures trouvé dans le dossier 'heures/'.")
    raise SystemExit(1)

# On prend le fichier le plus récent (dernier ajouté/modifié)
latest_txt = max(txt_files, key=os.path.getmtime)
print(f"Generation du PDF à partir du fichier : {latest_txt}")

# Création du PDF
pdf = FPDF()
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=15)
pdf.add_font("Arial", "", "./.fonts/arial.ttf", uni=True) if False else pdf.set_font("Arial", size=12)

with open(latest_txt, "r", encoding="utf-8") as f:
    for line in f:
        pdf.multi_cell(0, 8, line.rstrip())

# Nom du fichier PDF de sortie
output_filename = "rapport-heures.pdf"
pdf.output(output_filename)

print(f"PDF généré : {output_filename}")
