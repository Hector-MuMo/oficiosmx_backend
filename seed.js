// seed.js — datos de prueba
// Ejecutar con: node seed.js

import db from './src/db.js'

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

// Limpiar tablas
db.exec('DELETE FROM reviews')
db.exec('DELETE FROM contractors')
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('contractors','reviews')")

const SAMPLE = [
  { name: 'Jorge Martínez',  trades: ['Electricista','Plomero'],        zone: 'Tlaxcala de Xicohténcatl', whatsapp: '2461000001', years_exp: 12, plan: 'free',    verified: 1, featured: 0 },
  { name: 'Ana Leyva',       trades: ['Electricista'],                   zone: 'Apizaco',                  whatsapp: '2461000002', years_exp: 7,  plan: 'premium', verified: 0, featured: 1 },
  { name: 'Roberto Cruz',    trades: ['Electricista','Albañil'],         zone: 'Chiautempan',              whatsapp: '2461000003', years_exp: 4,  plan: 'free',    verified: 0, featured: 0 },
  { name: 'Patricia Soto',   trades: ['Plomero','Herrero'],              zone: 'Huamantla',                whatsapp: '2461000004', years_exp: 10, plan: 'free',    verified: 1, featured: 0 },
  { name: 'Miguel Torres',   trades: ['Carpintero'],                     zone: 'Tlaxcala de Xicohténcatl', whatsapp: '2461000005', years_exp: 15, plan: 'premium', verified: 1, featured: 1 },
  { name: 'Luis Ramírez',    trades: ['Albañil','Pintor','Yesero'],      zone: 'Zacatelco',               whatsapp: '2461000006', years_exp: 8,  plan: 'free',    verified: 0, featured: 0 },
  { name: 'Carmen Flores',   trades: ['Pintor','Tapicero'],              zone: 'Calpulalpan',              whatsapp: '2461000007', years_exp: 6,  plan: 'free',    verified: 0, featured: 0 },
  { name: 'Héctor Morales',  trades: ['Herrero','Soldador'],             zone: 'Apizaco',                  whatsapp: '2461000008', years_exp: 20, plan: 'premium', verified: 1, featured: 0 },
  { name: 'Rosa Mendoza',    trades: ['Carpintero','Herrero'],           zone: 'Tlaxcala de Xicohténcatl', whatsapp: '2461000009', years_exp: 9,  plan: 'free',    verified: 1, featured: 0 },
  { name: 'Felipe Castillo', trades: ['Plomero'],                        zone: 'Chiautempan',              whatsapp: '2461000010', years_exp: 5,  plan: 'free',    verified: 0, featured: 0 },
]

for (const c of SAMPLE) {
  db.prepare(`
    INSERT INTO contractors (name,trades,zone,whatsapp,years_exp,plan,verified,featured)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(c.name, JSON.stringify(c.trades), c.zone, c.whatsapp, c.years_exp, c.plan, c.verified, c.featured)
}

const REVIEWS = [
  { cid: 1, name: 'María G.',  email: 'maria@test.com',  stars: 5, body: 'Excelente trabajo, llegó puntual y dejó todo limpio. Muy recomendable.',       days: 3  },
  { cid: 1, name: 'Luis R.',   email: 'luis@test.com',   stars: 5, body: 'Resolvió un problema que nadie había podido en días. Precio justo y rápido.',  days: 7  },
  { cid: 2, name: 'Pedro M.',  email: 'pedro@test.com',  stars: 5, body: 'Muy buen trabajo con la iluminación de mi local. Quedó perfecto.',             days: 5  },
  { cid: 2, name: 'Carmen L.', email: 'carmen@test.com', stars: 4, body: 'Bien, aunque tardó un poco más de lo esperado. El resultado fue muy bueno.',   days: 14 },
  { cid: 4, name: 'Ramón E.',  email: 'ramon@test.com',  stars: 5, body: 'Llegó en menos de una hora para la urgencia. Excelente servicio.',             days: 2  },
  { cid: 5, name: 'Diana F.',  email: 'diana@test.com',  stars: 5, body: 'Hizo el closet exactamente como lo pedí. Calidad excepcional.',               days: 4  },
]

for (const r of REVIEWS) {
  db.prepare(`
    INSERT INTO reviews (contractor_id,author_name,author_email,stars,body,status,approved_at)
    VALUES (?,?,?,?,?,'approved',?)
  `).run(r.cid, r.name, r.email, r.stars, r.body, daysAgo(r.days))
}

console.log(`✓ ${SAMPLE.length} contratistas insertados`)
console.log(`✓ ${REVIEWS.length} reseñas insertadas`)
console.log('\nPrueba el backend:')
console.log('  GET http://localhost:3000/api/contractors')
console.log('  GET http://localhost:3000/api/contractors?trade=Electricista')
