# OficioMX — Backend

API REST para la app de contratistas. Construida con:

- **Express** — servidor HTTP
- **better-sqlite3** — base de datos local (sin servidor externo)
- **Resend** — envío de emails OTP

---

## Requisitos

- Node.js 18 o superior

---

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Crear tu archivo de configuración
cp .env.example .env

# 3. Editar .env con tus valores reales
#    (al menos RESEND_API_KEY si quieres enviar emails reales)
```

---

## Variables de entorno (.env)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `RESEND_API_KEY` | API key de resend.com | `re_xxxx...` |
| `FROM_EMAIL` | Remitente verificado en Resend | `noreply@tudominio.mx` |
| `FROM_NAME` | Nombre del remitente | `OficioMX` |
| `FRONTEND_URL` | URL del frontend (para CORS) | `http://localhost:5500` |
| `ADMIN_TOKEN` | Token para endpoints de admin | `mi-token-secreto` |
| `NODE_ENV` | `development` o `production` | `development` |

> En `development`, los OTPs se imprimen en consola en lugar de enviarse por email.

---

## Ejecutar

```bash
# Producción
npm start   # usa node --env-file=.env internamente

# Desarrollo (reinicia al detectar cambios)
npm run dev   # usa node --env-file=.env --watch internamente
```

El servidor arranca en `http://localhost:3000`

---

## Endpoints

### OTP
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/otp/send` | Genera y envía código de 6 dígitos |
| `POST` | `/api/otp/verify` | Verifica el código ingresado |

**POST /api/otp/send**
```json
{ "email": "usuario@ejemplo.com", "context": "review_42" }
```
El campo `context` identifica para qué se usa el OTP:
- `review_<id>` para verificar una reseña del contratista con ese id
- `register` para verificar el registro de un contratista

**POST /api/otp/verify**
```json
{ "email": "usuario@ejemplo.com", "context": "review_42", "code": "847291" }
```

---

### Contratistas
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/contractors` | Lista (con filtros) |
| `GET` | `/api/contractors/:id` | Detalle + reseñas aprobadas |
| `POST` | `/api/contractors` | Registrar contratista nuevo |

**GET /api/contractors** — parámetros opcionales:
- `trade` — oficio (ej. `Electricista`)
- `zone` — zona/municipio (ej. `Tlaxcala`)
- `sort` — `rating` | `reviews` | `newest`

**POST /api/contractors**
```json
{
  "name":      "Carlos Mendoza",
  "trade":     "Electricista",
  "zone":      "Tlaxcala de Xicohténcatl",
  "whatsapp":  "2461234567",
  "years_exp": 8,
  "plan":      "free"
}
```

---

### Reseñas
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/reviews` | Crear reseña (requiere OTP previo) |
| `GET` | `/api/reviews/pending` | Listar pendientes (admin) |
| `PATCH` | `/api/reviews/:id/approve` | Aprobar reseña (admin) |
| `PATCH` | `/api/reviews/:id/reject` | Rechazar reseña (admin) |

Los endpoints de admin requieren el header:
```
x-admin-token: <tu ADMIN_TOKEN del .env>
```

**POST /api/reviews**
```json
{
  "contractor_id": 1,
  "author_name":   "María García",
  "author_email":  "maria@ejemplo.com",
  "stars":         5,
  "body":          "Excelente trabajo, llegó puntual y dejó todo limpio."
}
```

---

## Flujo completo de una reseña

```
1. Usuario llena el formulario en la app
2. App → POST /api/otp/send  { email, context: "review_42" }
3. Usuario recibe código en su correo
4. Usuario ingresa el código en la app
5. App → POST /api/otp/verify { email, context, code }
6. Si ok: App → POST /api/reviews { ...datos }
7. Reseña queda en status "pending"
8. Tú revisas en /api/reviews/pending y apruebas o rechazas
```

---

## Base de datos

Se crea automáticamente como `oficiomx.db` al primer arranque.
Tablas: `contractors`, `reviews`, `otp_codes`.

Para explorar los datos puedes usar [DB Browser for SQLite](https://sqlitebrowser.org/) (gratuito).

---

## Deploy gratuito recomendado

1. Sube el proyecto a GitHub
2. Crea una cuenta en [Railway.app](https://railway.app)
3. Conecta el repositorio
4. Agrega las variables de entorno en el panel de Railway
5. Railway despliega automáticamente en cada push

> La base de datos SQLite en Railway persiste mientras no destruyas el volumen.
> Para mayor durabilidad en producción considera migrar a PostgreSQL (Railway también lo ofrece gratis).
