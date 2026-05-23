// seed.js — datos de prueba para OficioMX
import db from './src/db.js'

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

// Limpiar tablas
db.exec('DELETE FROM reviews')
db.exec('DELETE FROM contractors')
db.exec('DELETE FROM ads')
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('contractors','reviews','ads')")

// ── Contratistas — 3-4 por oficio ────────────────────────────
const CONTRACTORS = [
  // ELÉCTRICO
  { name:'Jorge Martínez',    trades:['Eléctrico','Plomero'],           zone:'Tlaxcala de Xicohténcatl', coverage_zones:['Apizaco','Chiautempan'],    whatsapp:'2461000001', years_exp:12, availability:'Lunes a sábado',     rate:'$400 – $700 / visita',        avatar_color:'#1F6B4E', verified:1 },
  { name:'Ana Leyva',         trades:['Eléctrico'],                      zone:'Apizaco',                  coverage_zones:['Tlaxcala de Xicohténcatl'], whatsapp:'2461000002', years_exp:7,  availability:'Lunes a viernes',    rate:'$400 – $700 / visita',        avatar_color:'#7C5CBF', verified:0 },
  { name:'Roberto Cruz',      trades:['Eléctrico','Albañil'],           zone:'Chiautempan',               coverage_zones:[],                           whatsapp:'2461000003', years_exp:4,  availability:'Fines de semana',    rate:'$200 – $400 / visita',        avatar_color:'#444441', verified:0 },
  { name:'Carlos Pérez',      trades:['Eléctrico','Cerrajero'],         zone:'Huamantla',                 coverage_zones:[],                           whatsapp:'2461000012', years_exp:11, availability:'Todos los días',     rate:'$200 – $400 / visita',        avatar_color:'#1F6B4E', verified:1 },
  // PLOMERO
  { name:'Patricia Soto',     trades:['Plomero','Herrero'],              zone:'Huamantla',                 coverage_zones:['Calpulalpan'],              whatsapp:'2461000004', years_exp:10, availability:'Todos los días',     rate:'$400 – $700 / visita',        avatar_color:'#993C1D', verified:1 },
  { name:'Felipe Castillo',   trades:['Plomero'],                        zone:'Chiautempan',               coverage_zones:['Zacatelco'],                whatsapp:'2461000010', years_exp:5,  availability:'Todos los días',     rate:'$200 – $400 / visita',        avatar_color:'#444441', verified:0 },
  { name:'Mario Álvarez',     trades:['Plomero','Eléctrico'],            zone:'Apizaco',                   coverage_zones:['Tlaxcala de Xicohténcatl'], whatsapp:'2461000013', years_exp:8,  availability:'Lunes a sábado',     rate:'$400 – $700 / visita',        avatar_color:'#185FA5', verified:0 },
  { name:'Laura Jiménez',     trades:['Plomero'],                        zone:'Tlaxcala de Xicohténcatl', coverage_zones:[],                           whatsapp:'2461000014', years_exp:6,  availability:'Lunes a viernes',    rate:'$200 – $400 / visita',        avatar_color:'#993556', verified:1 },
  // ALBAÑIL
  { name:'Luis Ramírez',      trades:['Albañil','Pintor / Impermeabilizador'], zone:'Zacatelco',          coverage_zones:['Chiautempan'],              whatsapp:'2461000006', years_exp:8,  availability:'Lunes a sábado',     rate:'$400 – $700 / visita',        avatar_color:'#3B6D11', verified:0 },
  { name:'Antonio Reyes',     trades:['Albañil'],                        zone:'Tlaxcala de Xicohténcatl', coverage_zones:['Apizaco'],                  whatsapp:'2461000015', years_exp:15, availability:'Lunes a sábado',     rate:'$700 – $1,000 / visita',      avatar_color:'#B8751A', verified:1 },
  { name:'Pedro Hernández',   trades:['Albañil','Tablaroca / Yesero'],  zone:'Calpulalpan',               coverage_zones:[],                           whatsapp:'2461000016', years_exp:9,  availability:'Lunes a viernes',    rate:'$400 – $700 / visita',        avatar_color:'#444441', verified:0 },
  { name:'Ramón Espinoza',    trades:['Albañil'],                        zone:'Apizaco',                   coverage_zones:['Huamantla'],                whatsapp:'2461000017', years_exp:20, availability:'Lunes a sábado',     rate:'$1,500 – $5,000 / proyecto',  avatar_color:'#1F6B4E', verified:1 },
  // HERRERO
  { name:'Héctor Morales',    trades:['Herrero','Cerrajero'],            zone:'Apizaco',                   coverage_zones:['Huamantla'],                whatsapp:'2461000008', years_exp:20, availability:'Lunes a viernes',    rate:'$500 – $1,500 / proyecto',    avatar_color:'#B8751A', verified:1 },
  { name:'Ernesto Vargas',    trades:['Herrero'],                        zone:'Tlaxcala de Xicohténcatl', coverage_zones:['Zacatelco'],                whatsapp:'2461000018', years_exp:14, availability:'Lunes a sábado',     rate:'$1,500 – $5,000 / proyecto',  avatar_color:'#993C1D', verified:0 },
  { name:'Juan Blanco',       trades:['Herrero','Eléctrico'],            zone:'Chiautempan',               coverage_zones:[],                           whatsapp:'2461000019', years_exp:7,  availability:'Fines de semana',    rate:'$500 – $1,500 / proyecto',    avatar_color:'#185FA5', verified:0 },
  // PINTOR / IMPERMEABILIZADOR
  { name:'Carmen Flores',     trades:['Pintor / Impermeabilizador'],     zone:'Calpulalpan',               coverage_zones:[],                           whatsapp:'2461000007', years_exp:6,  availability:'Solo con cita previa', rate:'$400 – $700 / visita',      avatar_color:'#993556', verified:0 },
  { name:'Isabel Torres',     trades:['Pintor / Impermeabilizador','Albañil'], zone:'Tlaxcala de Xicohténcatl', coverage_zones:['Apizaco'],             whatsapp:'2461000020', years_exp:10, availability:'Lunes a sábado',     rate:'$700 – $1,000 / visita',      avatar_color:'#7C5CBF', verified:1 },
  { name:'Oscar Gutiérrez',   trades:['Pintor / Impermeabilizador'],     zone:'Huamantla',                 coverage_zones:['Calpulalpan'],              whatsapp:'2461000021', years_exp:5,  availability:'Lunes a viernes',    rate:'$400 – $700 / visita',        avatar_color:'#3B6D11', verified:0 },
  // ALUMINIOS / VIDRIOS
  { name:'Rosa Mendoza',      trades:['Aluminios / Vidrios'],            zone:'Tlaxcala de Xicohténcatl', coverage_zones:[],                           whatsapp:'2461000009', years_exp:9,  availability:'Lunes a sábado',     rate:'A convenir con el cliente',   avatar_color:'#993C1D', verified:1 },
  { name:'Daniel Núñez',      trades:['Aluminios / Vidrios','Herrero'],  zone:'Apizaco',                   coverage_zones:['Chiautempan'],              whatsapp:'2461000022', years_exp:12, availability:'Lunes a viernes',    rate:'$500 – $1,500 / proyecto',    avatar_color:'#185FA5', verified:0 },
  { name:'Silvia Campos',     trades:['Aluminios / Vidrios'],            zone:'Zacatelco',                 coverage_zones:[],                           whatsapp:'2461000023', years_exp:4,  availability:'Lunes a sábado',     rate:'A convenir con el cliente',   avatar_color:'#993556', verified:0 },
  // SASTRE
  { name:'Carmen Martínez',   trades:['Sastre'],                         zone:'Calpulalpan',               coverage_zones:[],                           whatsapp:'2461000007', years_exp:6,  availability:'Solo con cita previa', rate:'A convenir con el cliente',  avatar_color:'#993556', verified:0 },
  { name:'Fernanda Ortiz',    trades:['Sastre'],                         zone:'Tlaxcala de Xicohténcatl', coverage_zones:['Apizaco'],                  whatsapp:'2461000024', years_exp:18, availability:'Lunes a viernes',    rate:'A convenir con el cliente',   avatar_color:'#7C5CBF', verified:1 },
  { name:'Graciela Ríos',     trades:['Sastre'],                         zone:'Huamantla',                 coverage_zones:[],                           whatsapp:'2461000025', years_exp:8,  availability:'Solo con cita previa', rate:'A convenir con el cliente',  avatar_color:'#B8751A', verified:0 },
  // REPARADOR LÍNEA BLANCA
  { name:'Sofía Hernández',   trades:['Reparador línea blanca'],         zone:'Tlaxcala de Xicohténcatl', coverage_zones:['Apizaco'],                  whatsapp:'2461000011', years_exp:8,  availability:'Lunes a sábado',     rate:'$200 – $400 / visita',        avatar_color:'#185FA5', verified:0 },
  { name:'Guillermo Santos',  trades:['Reparador línea blanca'],         zone:'Apizaco',                   coverage_zones:['Tlaxcala de Xicohténcatl'], whatsapp:'2461000026', years_exp:11, availability:'Lunes a viernes',    rate:'$200 – $400 / visita',        avatar_color:'#444441', verified:1 },
  { name:'Norma Luna',        trades:['Reparador línea blanca','Eléctrico'], zone:'Chiautempan',           coverage_zones:[],                           whatsapp:'2461000027', years_exp:5,  availability:'Todos los días',     rate:'$200 – $400 / visita',        avatar_color:'#993C1D', verified:0 },
  // TABLAROCA / YESERO
  { name:'Miguel Torres',     trades:['Tablaroca / Yesero'],             zone:'Tlaxcala de Xicohténcatl', coverage_zones:['Zacatelco'],                whatsapp:'2461000005', years_exp:15, availability:'Lunes a sábado',     rate:'$1,500 – $5,000 / proyecto',  avatar_color:'#185FA5', verified:1 },
  { name:'Benjamín Cruz',     trades:['Tablaroca / Yesero','Albañil'],   zone:'Apizaco',                   coverage_zones:['Chiautempan'],              whatsapp:'2461000028', years_exp:10, availability:'Lunes a viernes',    rate:'$1,500 – $5,000 / proyecto',  avatar_color:'#3B6D11', verified:0 },
  { name:'Verónica Méndez',   trades:['Tablaroca / Yesero'],             zone:'Huamantla',                 coverage_zones:[],                           whatsapp:'2461000029', years_exp:6,  availability:'Lunes a sábado',     rate:'$500 – $1,500 / proyecto',    avatar_color:'#993556', verified:0 },
  // MECÁNICO
  { name:'Felipe Castillo',   trades:['Mecánico'],                       zone:'Chiautempan',               coverage_zones:['Zacatelco'],                whatsapp:'2461000030', years_exp:5,  availability:'Todos los días',     rate:'$200 – $400 / hora',          avatar_color:'#444441', verified:0 },
  { name:'Arturo Pacheco',    trades:['Mecánico'],                       zone:'Apizaco',                   coverage_zones:['Tlaxcala de Xicohténcatl'], whatsapp:'2461000031', years_exp:16, availability:'Lunes a sábado',     rate:'$200 – $400 / hora',          avatar_color:'#B8751A', verified:1 },
  { name:'Ignacio Vega',      trades:['Mecánico','Eléctrico'],           zone:'Tlaxcala de Xicohténcatl', coverage_zones:[],                           whatsapp:'2461000032', years_exp:9,  availability:'Lunes a viernes',    rate:'$100 – $200 / hora',          avatar_color:'#185FA5', verified:0 },
  { name:'Claudia Ramos',     trades:['Mecánico'],                       zone:'Huamantla',                 coverage_zones:['Calpulalpan'],              whatsapp:'2461000033', years_exp:7,  availability:'Lunes a sábado',     rate:'$200 – $400 / hora',          avatar_color:'#993556', verified:1 },
  // CERRAJERO
  { name:'Héctor Morales Jr', trades:['Cerrajero'],                      zone:'Apizaco',                   coverage_zones:[],                           whatsapp:'2461000034', years_exp:8,  availability:'Todos los días',     rate:'$200 – $400 / visita',        avatar_color:'#B8751A', verified:0 },
  { name:'Sandra Pérez',      trades:['Cerrajero','Eléctrico'],          zone:'Tlaxcala de Xicohténcatl', coverage_zones:['Apizaco'],                  whatsapp:'2461000035', years_exp:5,  availability:'Lunes a sábado',     rate:'$200 – $400 / visita',        avatar_color:'#7C5CBF', verified:1 },
  { name:'Tomás Guerrero',    trades:['Cerrajero'],                      zone:'Chiautempan',               coverage_zones:['Zacatelco'],                whatsapp:'2461000036', years_exp:12, availability:'Todos los días',     rate:'Menos de $200 / visita',      avatar_color:'#1F6B4E', verified:0 },
]

const insertC = db.prepare(`
  INSERT INTO contractors
    (name,trades,zone,coverage_zones,whatsapp,years_exp,availability,rate,avatar_color,plan,verified,featured)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
`)

for (const c of CONTRACTORS) {
  insertC.run(
    c.name,
    JSON.stringify(c.trades),
    c.zone,
    JSON.stringify(c.coverage_zones),
    c.whatsapp,
    c.years_exp,
    c.availability,
    c.rate,
    c.avatar_color,
    'free',
    c.verified,
    0
  )
}

// ── Reseñas ───────────────────────────────────────────────────
const REVIEWS = [
  { cid:1,  name:'María G.',    email:'maria@test.com',    stars:5, body:'Excelente trabajo, llegó puntual y dejó todo limpio. Muy recomendable.',           days:3  },
  { cid:1,  name:'Luis R.',     email:'luis@test.com',     stars:5, body:'Resolvió un problema que nadie había podido en días. Precio justo y rápido.',       days:7  },
  { cid:2,  name:'Pedro M.',    email:'pedro@test.com',    stars:4, body:'Muy buen trabajo. Tardó un poco más de lo esperado pero el resultado fue bueno.',    days:5  },
  { cid:4,  name:'Carmen L.',   email:'carmen@test.com',   stars:5, body:'Llegó en menos de una hora para la urgencia. Excelente servicio.',                  days:2  },
  { cid:5,  name:'Diana F.',    email:'diana@test.com',    stars:4, body:'Buen trabajo aunque el precio fue un poco alto. Lo recomendaría.',                  days:4  },
  { cid:10, name:'Ramón E.',    email:'ramon@test.com',    stars:5, body:'Arregló la tubería rápido y sin desorden. Muy profesional.',                        days:6  },
  { cid:13, name:'Sofía T.',    email:'sofia@test.com',    stars:4, body:'Bien organizado y puntual. El trabajo quedó como esperaba.',                        days:8  },
  { cid:15, name:'Miguel A.',   email:'miguel@test.com',   stars:5, body:'Excelente herrero, hizo la reja exactamente como la pedí. Muy recomendable.',       days:10 },
  { cid:18, name:'Laura B.',    email:'laura@test.com',    stars:5, body:'Pintó la fachada en dos días, quedó perfecta. Ya lo tengo guardado.',               days:12 },
  { cid:20, name:'Jorge P.',    email:'jorge@test.com',    stars:4, body:'Colocó las ventanas de aluminio correctamente. Buena calidad de trabajo.',          days:9  },
  { cid:29, name:'Andrea M.',   email:'andrea@test.com',   stars:5, body:'Instaló el tablaroca impecable, sin desperdicios. Muy recomendado.',                days:11 },
  { cid:32, name:'Roberto V.',  email:'roberto@test.com',  stars:5, body:'Arregló la transmisión en tiempo récord. El precio fue muy justo.',                 days:3  },
  { cid:34, name:'Elena S.',    email:'elena@test.com',    stars:4, body:'Reparó la lavadora el mismo día que llamé. Funciona perfectamente.',                days:5  },
]

const insertR = db.prepare(`
  INSERT INTO reviews (contractor_id,author_name,author_email,stars,body,status,approved_at)
  VALUES (?,?,?,?,?,'approved',?)
`)
for (const r of REVIEWS) {
  insertR.run(r.cid, r.name, r.email, r.stars, r.body, daysAgo(r.days))
}

// ── Banners de prueba ─────────────────────────────────────────
const ADS = [
  { title:'Ferretería El Clavo — Tlaxcala',      image_url:'https://placehold.co/720x180/C0442A/FFFFFF?text=Ferretería+El+Clavo', link_url:'https://ejemplo.com/ferreteria', advertiser:'Ferretería El Clavo' },
  { title:'Materiales La Pirámide — Apizaco',    image_url:'https://placehold.co/720x180/1F8080/FFFFFF?text=Materiales+La+Pirámide', link_url:'https://ejemplo.com/materiales', advertiser:'Materiales La Pirámide' },
  { title:'Pinturas Tlaxco — Distribuidor',      image_url:'https://placehold.co/720x180/3B6D11/FFFFFF?text=Pinturas+Tlaxco', link_url:'https://ejemplo.com/pinturas', advertiser:'Pinturas Tlaxco' },
]

const insertA = db.prepare(`
  INSERT INTO ads (title, image_url, link_url, advertiser, active)
  VALUES (?,?,?,?,1)
`)
for (const a of ADS) {
  insertA.run(a.title, a.image_url, a.link_url, a.advertiser)
}

console.log(`✓ ${CONTRACTORS.length} contratistas`)
console.log(`✓ ${REVIEWS.length} reseñas`)
console.log(`✓ ${ADS.length} banners`)
