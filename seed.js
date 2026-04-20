// seed.js
import db from './src/db.js'

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

db.exec('DELETE FROM reviews')
db.exec('DELETE FROM contractors')
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('contractors','reviews')")

const SAMPLE = [
  { name:'Jorge Martínez',   trades:['Eléctrico','Plomero'],              zone:'Tlaxcala de Xicohténcatl', coverage_zones:['Apizaco','Chiautempan'],   whatsapp:'2461000001', years_exp:12, availability:'Lunes a sábado',  rate:'$400 – $700 / visita',       avatar_color:'#1F6B4E', plan:'free', verified:1, featured:0 },
  { name:'Ana Leyva',        trades:['Eléctrico'],                         zone:'Apizaco',                  coverage_zones:['Tlaxcala de Xicohténcatl'], whatsapp:'2461000002', years_exp:7,  availability:'Lunes a viernes', rate:'$400 – $700 / visita',       avatar_color:'#7C5CBF', plan:'free', verified:0, featured:0 },
  { name:'Roberto Cruz',     trades:['Eléctrico','Albañil'],              zone:'Chiautempan',               coverage_zones:[],                          whatsapp:'2461000003', years_exp:4,  availability:'Fines de semana', rate:'$200 – $400 / visita',       avatar_color:'#444441', plan:'free', verified:0, featured:0 },
  { name:'Patricia Soto',    trades:['Plomero','Herrero'],                zone:'Huamantla',                 coverage_zones:['Calpulalpan'],              whatsapp:'2461000004', years_exp:10, availability:'Todos los días',  rate:'$400 – $700 / visita',       avatar_color:'#993C1D', plan:'free', verified:1, featured:0 },
  { name:'Miguel Torres',    trades:['Tablaroca / Yesero'],               zone:'Tlaxcala de Xicohténcatl', coverage_zones:['Zacatelco'],                whatsapp:'2461000005', years_exp:15, availability:'Lunes a sábado',  rate:'$1,500 – $5,000 / proyecto', avatar_color:'#185FA5', plan:'free', verified:1, featured:0 },
  { name:'Luis Ramírez',     trades:['Albañil','Pintor / Impermeabilizador'], zone:'Zacatelco',            coverage_zones:['Chiautempan'],              whatsapp:'2461000006', years_exp:8,  availability:'Lunes a sábado',  rate:'$400 – $700 / visita',       avatar_color:'#3B6D11', plan:'free', verified:0, featured:0 },
  { name:'Carmen Flores',    trades:['Sastre'],                            zone:'Calpulalpan',               coverage_zones:[],                          whatsapp:'2461000007', years_exp:6,  availability:'Solo con cita previa', rate:'A convenir con el cliente',  avatar_color:'#993556', plan:'free', verified:0, featured:0 },
  { name:'Héctor Morales',   trades:['Herrero','Cerrajero'],              zone:'Apizaco',                   coverage_zones:['Huamantla'],                whatsapp:'2461000008', years_exp:20, availability:'Lunes a viernes', rate:'$500 – $1,500 / proyecto',   avatar_color:'#B8751A', plan:'free', verified:1, featured:0 },
  { name:'Rosa Mendoza',     trades:['Aluminios / Vidrios'],              zone:'Tlaxcala de Xicohténcatl', coverage_zones:[],                          whatsapp:'2461000009', years_exp:9,  availability:'Lunes a sábado',  rate:'A convenir con el cliente',  avatar_color:'#993C1D', plan:'free', verified:1, featured:0 },
  { name:'Felipe Castillo',  trades:['Mecánico'],                          zone:'Chiautempan',               coverage_zones:['Zacatelco'],                whatsapp:'2461000010', years_exp:5,  availability:'Todos los días',  rate:'$200 – $400 / hora',         avatar_color:'#444441', plan:'free', verified:0, featured:0 },
  { name:'Sofía Hernández',  trades:['Reparador línea blanca'],           zone:'Tlaxcala de Xicohténcatl', coverage_zones:['Apizaco'],                  whatsapp:'2461000011', years_exp:8,  availability:'Lunes a sábado',  rate:'$200 – $400 / visita',       avatar_color:'#185FA5', plan:'free', verified:0, featured:0 },
  { name:'Carlos Pérez',     trades:['Eléctrico','Cerrajero'],            zone:'Huamantla',                 coverage_zones:[],                          whatsapp:'2461000012', years_exp:11, availability:'Todos los días',  rate:'$200 – $400 / visita',       avatar_color:'#1F6B4E', plan:'free', verified:1, featured:0 },
]

const insertC = db.prepare(`
  INSERT INTO contractors
    (name,trades,zone,coverage_zones,whatsapp,years_exp,availability,rate,avatar_color,plan,verified,featured)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
`)

for (const c of SAMPLE) {
  insertC.run(c.name, JSON.stringify(c.trades), c.zone, JSON.stringify(c.coverage_zones),
    c.whatsapp, c.years_exp, c.availability, c.rate, c.avatar_color, c.plan, c.verified, c.featured)
}

const REVIEWS = [
  { cid:1, name:'María G.',  email:'maria@test.com',  stars:5, body:'Excelente trabajo, llegó puntual y dejó todo limpio. Muy recomendable.', days:3  },
  { cid:1, name:'Luis R.',   email:'luis@test.com',   stars:5, body:'Resolvió un problema que nadie había podido en días. Precio justo y rápido.', days:7 },
  { cid:2, name:'Pedro M.',  email:'pedro@test.com',  stars:5, body:'Muy buen trabajo con la iluminación de mi local. Quedó perfecto.', days:5 },
  { cid:2, name:'Carmen L.', email:'carmen@test.com', stars:4, body:'Bien, aunque tardó un poco más de lo esperado. El resultado fue muy bueno.', days:14 },
  { cid:4, name:'Ramón E.',  email:'ramon@test.com',  stars:5, body:'Llegó en menos de una hora para la urgencia. Excelente servicio.', days:2 },
  { cid:5, name:'Diana F.',  email:'diana@test.com',  stars:5, body:'Hizo el closet exactamente como lo pedí. Calidad excepcional.', days:4 },
]

const insertR = db.prepare(`
  INSERT INTO reviews (contractor_id,author_name,author_email,stars,body,status,approved_at)
  VALUES (?,?,?,?,?,'approved',?)
`)
for (const r of REVIEWS) {
  insertR.run(r.cid, r.name, r.email, r.stars, r.body, daysAgo(r.days))
}

// Limpiar y re-crear banners de prueba
db.exec('DELETE FROM ads')

const ADS_SAMPLE = [
  {
    title:      'Ferretería El Clavo — Tlaxcala',
    image_url:  'https://placehold.co/720x180/C0442A/FFFFFF?text=Ferretería+El+Clavo+•+Tlaxcala',
    link_url:   'https://ejemplo.com/ferreteria',
    advertiser: 'Ferretería El Clavo',
    active:     1,
  },
  {
    title:      'Materiales La Pirámide — Apizaco',
    image_url:  'https://placehold.co/720x180/1F8080/FFFFFF?text=Materiales+La+Pirámide+•+Apizaco',
    link_url:   'https://ejemplo.com/materiales',
    advertiser: 'Materiales La Pirámide',
    active:     1,
  },
  {
    title:      'Pinturas Tlaxco — Distribuidor oficial',
    image_url:  'https://placehold.co/720x180/3B6D11/FFFFFF?text=Pinturas+Tlaxco+•+Distribuidor+Oficial',
    link_url:   'https://ejemplo.com/pinturas',
    advertiser: 'Pinturas Tlaxco',
    active:     1,
  },
]

const insertAd = db.prepare(`
  INSERT INTO ads (title, image_url, link_url, advertiser, active)
  VALUES (?,?,?,?,?)
`)
for (const a of ADS_SAMPLE) {
  insertAd.run(a.title, a.image_url, a.link_url, a.advertiser, a.active)
}

console.log(`✓ ${SAMPLE.length} contratistas`)
console.log(`✓ ${REVIEWS.length} reseñas`)
console.log(`✓ ${ADS_SAMPLE.length} banners de prueba`)
