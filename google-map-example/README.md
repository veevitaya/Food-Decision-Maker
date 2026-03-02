# Low-Cost Restaurant Map (OSM + Aggressive Cache)

โครงการตัวอย่าง Node.js/TypeScript สำหรับค้นหาร้านอาหารด้วย OpenStreetMap/Overpass + แคชไฟล์ และ fallback Google Places แบบเลือกเปิดได้

## การตั้งค่า
1) ติดตั้ง dependency (ต้องมีอินเทอร์เน็ต)
```
npm install
```
2) ตั้งค่า Environment (ค่าดีฟอลต์เน้นต้นทุนต่ำ)
```
PORT=4000
PROVIDER_FALLBACK=none        # หรือ google ถ้ามีคีย์
GOOGLE_PLACES_API_KEY=...     # ใส่เมื่อเปิด fallback
CACHE_TTL_PLACES=604800000    # 7 วัน (มิลลิวินาที)
PREFETCH_BBOXES=[{"lat":13.7563,"lon":100.5018,"radius":1500,"query":"restaurant"}]
```

## รัน
```
npm run dev    # ใช้ ts-node
# หรือ build + start
npm run build && npm start
```

### รันด้วย Docker (แนะนำสำหรับโปรดักชัน / ต้องการ SQLite persist)
```
docker-compose up --build
```
- SQLite จะถูกเก็บในโฟลเดอร์ `./data/app.db` (แมป volume ออกจากคอนเทนเนอร์)
- เปิดเบราว์เซอร์ที่ http://localhost:4000
```
เปิดเบราว์เซอร์ที่ http://localhost:4000 เพื่อดู MapLibre UI
*ค่าเริ่มต้นของแผนที่* ใช้สไตล์ถนนจริง Carto Positron GL (`https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`) จึงไม่เห็นฉากหลังเขียวอีกต่อไป; สามารถเปลี่ยน URL นี้ใน `public/index.html` ตามผู้ให้บริการที่ต้องการ

### UI หมุดรูป/ไม่มีรูป
- หมุดมีรูป: แสดง thumbnail กลมบนแผนที่
- หมุดไม่มีรูป: วงกลมฟ้าขนาดเล็กกว่า
- มี toggle “แสดงเฉพาะที่มีรูป” ใน sidebar

## API
- `GET /places?lat=..&lon=..&radius=..&q=restaurant`
- `GET /place/:id`
- `GET /health`
- Admin view: `public/admin.html` + API `GET /admin/places?limit=200&source=osm|google&hasPhoto=true|false`
- Logs view: `public/logs.html` + API `GET /admin/logs?limit=200&source=&cacheHit=&force=`

## โครงสร้าง
- `src/index.ts` เซิร์ฟเวอร์ HTTP + routing + prefetch loop
- `src/service.ts` จัดการแคช/เรียก provider/normalize
- `src/providers/overpass.ts` ดึง OSM ผ่าน Overpass
- `src/providers/google.ts` fallback Google (ปิดเป็นดีฟอลต์)
- `src/cache/sqliteCache.ts` แคช SQLite (ดีฟอลต์)
- `src/cache/fileCache.ts` แคชไฟล์แบบ JSON (สำรอง/ออฟไลน์)
- `public/index.html` ตัวอย่าง UI MapLibre
- `public/admin.html` หน้าแอดมินดูรายการสถานที่จาก DB แคช + map preview

## หมายเหตุต้นทุน
- ดีฟอลต์ใช้ OSM/Overpass ฟรี + แคช TTL ยาว (ตั้ง `CACHE_TTL_PLACES=never` ได้หากต้องการไม่หมดอายุ)
- Fallback Google ถูกปิด (ตั้ง `PROVIDER_FALLBACK=google` เมื่อจำเป็น พร้อมตั้ง budget ที่ layer แอป)

## โฮสต์ Vector Tiles เอง (ใช้ไฟล์ MBTiles)
ตัวเลือกประหยัดต้นทุนและควบคุมได้เต็มที่:
1) เตรียมไฟล์ MBTiles (เช่นจาก OpenMapTiles หรือ extract พื้นที่เป้าหมาย)
2) รัน TileServer ด้วย Docker (ง่ายที่สุด):
```
docker run -d --name tileserver -p 8080:8080 \
  -v $(pwd)/tiles:/data \
  maptiler/tileserver-gl
```
   - วางไฟล์ `your.mbtiles` ไว้ที่ `./tiles/`
   - เซิร์ฟเวอร์จะเสิร์ฟ style และ tiles ที่ `http://localhost:8080`
3) ชี้ MapLibre ไปยัง style ของเซิร์ฟเวอร์นี้ (แก้ `public/index.html`):
```js
const map = new maplibregl.Map({
  container: "map",
  style: "http://localhost:8080/styles/bright/style.json", // หรือสไตล์ที่ tileserver สร้าง
  center: [100.5018, 13.7563],
  zoom: 13,
});
```
4) ถ้าต้องการสไตล์เฉพาะ ให้แก้ไฟล์ style JSON บน tileserver (หรือสร้างเองด้วย openmaptiles-tools) แล้วชี้ URL นั้นแทน

หมายเหตุ: tileserver-gl คาด schema OpenMapTiles; ถ้าใช้ MBTiles จากแหล่งอื่น ตรวจสอบให้รองรับ vector tile schema ตามสไตล์ที่เลือก

## ตั้งค่าฟีดข้อมูลเน้นประเทศไทย (แคชอัตโนมัติ)
- ค่าเริ่มต้น (ถ้าไม่ตั้ง env) จะ prefetch ไทย: กทม. (13.7563,100.5018), เชียงใหม่ (18.7883,98.9853), ภูเก็ต (7.9519,98.3381) รัศมี 2 กม.
- หากใช้ไฟล์ `.env` ให้ใส่:
```
PREFETCH_BBOXES=[{"lat":13.7563,"lon":100.5018,"radius":2000,"query":"restaurant"},{"lat":18.7883,"lon":98.9853,"radius":2000,"query":"restaurant"},{"lat":7.9519,"lon":98.3381,"radius":2000,"query":"restaurant"}]
```
- Nominatim ถูกตั้ง `Accept-Language: th-TH` เพื่อดึงที่อยู่/ชื่อสถานที่เป็นภาษาไทยเมื่อมีข้อมูล
- รูปภาพ: ถ้ามี `GOOGLE_PLACES_API_KEY` และตั้ง `GOOGLE_PHOTO_ENRICH=true` ระบบจะ enrich รูป (สูงสุด `PHOTO_ENRICH_LIMIT` รายการต่อคำค้น, ดีฟอลต์ 50) แม้ผลหลักมาจาก OSM
- ถ้าผลใน cache น้อยกว่า `MIN_RESULTS_BEFORE_CACHE` (ดีฟอลต์ 5) ระบบจะข้าม cache แล้วดึงใหม่อัตโนมัติ
