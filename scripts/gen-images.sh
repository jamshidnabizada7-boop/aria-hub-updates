#!/bin/bash
# Generate premium images one at a time with pacing
cd /home/z/my-project
OUT=public/images

gen() {
  local file="$1"; local size="$2"; local prompt="$3"
  if [ -f "$OUT/$file" ] && [ $(stat -c%s "$OUT/$file") -gt 10000 ]; then
    echo "[skip] $file"; return
  fi
  echo "[gen] $file"
  z-ai image -p "$prompt" -o "$OUT/$file" -s "$size" 2>&1 | tail -1
  sleep 6
}

gen "logo-mark.png" "1024x1024" "Minimalist geometric letter A logo mark, gradient blue to cyan, premium tech brand, glassmorphism, on transparent dark background, ultra clean, no extra text"
gen "services/legal.png" "1024x1024" "Elegant 3D illustration of legal services, golden scales of justice with blue gradient backdrop, glassmorphism, premium corporate, soft studio lighting, no text"
gen "services/travel.png" "1024x1024" "Premium 3D illustration of travel and passport services, stylized passport with boarding pass and airplane, corporate blue gradient, glassmorphism, luxury minimal, no text"
gen "services/translation.png" "1024x1024" "Premium 3D illustration of translation services, floating language characters and speech bubbles, corporate blue gradient, glassmorphism, luxury minimal, no text"
gen "services/consulting.png" "1024x1024" "Premium 3D illustration of strategic consulting, chess king piece with growth chart, corporate blue gradient, glassmorphism, luxury minimal, no text"
gen "services/finance.png" "1024x1024" "Premium 3D illustration of financial services, golden coins and growth arrow with bank building, corporate blue gradient, glassmorphism, luxury minimal, no text"
gen "visas/usa.png" "1344x768" "Iconic New York skyline with Statue of Liberty silhouette at golden hour, premium cinematic travel photography, warm tones, ultra detailed, no text"
gen "visas/canada.png" "1344x768" "Canadian rocky mountains with turquoise lake and autumn forest, premium cinematic travel photography, ultra detailed, no text"
gen "visas/uk.png" "1344x768" "London skyline with Big Ben and Tower Bridge at blue hour, premium cinematic travel photography, ultra detailed, no text"
gen "visas/australia.png" "1344x768" "Sydney opera house and harbour bridge at sunset, premium cinematic travel photography, ultra detailed, no text"
gen "visas/germany.png" "1344x768" "Neuschwanstein castle in Bavarian alps with autumn forest, premium cinematic travel photography, ultra detailed, no text"
gen "visas/uae.png" "1344x768" "Dubai marina skyline with Burj Khalifa at dusk, premium cinematic travel photography, ultra detailed, no text"
gen "gallery/g1.png" "1344x768" "Modern corporate office interior with glass walls and city view, premium architectural photography, warm natural light, ultra detailed"
gen "gallery/g2.png" "1344x768" "Diverse professional business team meeting around glass table, premium corporate photography, natural light, candid, ultra detailed"
gen "gallery/g3.png" "1344x768" "Business handshake close-up with soft bokeh background, premium corporate photography, warm tones, ultra detailed"
gen "gallery/g4.png" "1344x768" "Graduation ceremony celebration with diverse students, premium photography, joyful, natural light, ultra detailed"
gen "gallery/g5.png" "1344x768" "Modern airport departure hall with travelers, premium architectural photography, blue hour light, ultra detailed"
gen "gallery/g6.png" "1344x768" "International conference keynote stage with large screen and audience, premium event photography, dramatic lighting, ultra detailed"
gen "news/n1.png" "1344x768" "Abstract data visualization with glowing blue network connections and charts, premium tech illustration, dark background, ultra detailed"
gen "news/n2.png" "1344x768" "Premium illustration of global mobility and immigration concept, passport stamps and world map, blue gradient, ultra detailed"
gen "news/n3.png" "1344x768" "Premium illustration of education scholarship concept, graduation cap on stack of books with soft glow, blue gradient, ultra detailed"
gen "avatars/a1.png" "1024x1024" "Professional headshot portrait of confident middle eastern businessman in navy suit, neutral studio background, premium photography, ultra detailed"
gen "avatars/a2.png" "1024x1024" "Professional headshot portrait of confident south asian businesswoman in elegant blazer, neutral studio background, premium photography, ultra detailed"
gen "avatars/a3.png" "1024x1024" "Professional headshot portrait of confident european businessman with glasses, navy blazer, neutral studio background, premium photography, ultra detailed"
gen "avatars/a4.png" "1024x1024" "Professional headshot portrait of confident middle eastern businesswoman in elegant hijab, neutral studio background, premium photography, ultra detailed"
echo "ALL DONE"
