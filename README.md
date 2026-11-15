# ORM Lab: TypeORM, Prisma y Drizzle

Laboratorio para aprender los tres ORMs más usados de Node.js/TypeScript con **el mismo dominio**
(`Cliente` 1 → N `Pedido`) y **la misma base PostgreSQL**, para compararlos lado a lado.

| Proyecto | ORM | Estado |
|---|---|---|
| [`typeorm-lab/`](typeorm-lab) | TypeORM 1.x | ✅ Entidades, consultas, QueryBuilder, migraciones, transacciones, DTOs y pruebas |
| [`prisma-lab/`](prisma-lab) | Prisma ORM 7 | ✅ Schema, consultas, `$queryRaw`, migraciones, transacciones, DTOs y pruebas |
| [`drizzle-lab/`](drizzle-lab) | Drizzle ORM 0.45 | ✅ Schema en TS, API SQL y relacional, migraciones, transacciones, DTOs y pruebas |

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Estructura del repositorio](#2-estructura-del-repositorio)
3. [Base de datos con Docker](#3-base-de-datos-con-docker)
4. [TypeORM: paso a paso](#4-typeorm-paso-a-paso)
5. [Prisma: paso a paso](#5-prisma-paso-a-paso)
6. [Drizzle: paso a paso](#6-drizzle-paso-a-paso)
7. [Pruebas](#7-pruebas)
8. [Construir y ejecutar en modo producción](#8-construir-y-ejecutar-en-modo-producción)
9. [Calidad de código con SonarQube](#9-calidad-de-código-con-sonarqube)
10. [Arquitectura de cada proyecto](#10-arquitectura-de-cada-proyecto)
11. [Solución de problemas](#11-solución-de-problemas)

---

## 1. Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | **22.18 o superior** (probado con 26) | Ejecuta el código; trae `--env-file` y el test runner nativo |
| npm | el que viene con Node | Dependencias y scripts |
| Docker | cualquiera reciente | Levanta PostgreSQL y SonarQube |

Verifica:

```bash
node -v
docker -v
```

---

## 2. Estructura del repositorio

```
orm-lab/
├── README.md
├── docker-compose.yml            ← SonarQube Community Build
├── .env.sonar / .env.sonar.example   ← URL y token de SonarQube
├── scripts/
│   └── sonar-report.mjs          ← genera reports/sonar-report.html
├── typeorm-lab/
│   ├── .env / .env.test          ← credenciales (no se suben a git)
│   ├── .env.example / .env.test.example
│   ├── package.json
│   ├── tsconfig.json             ← desarrollo y verificación de tipos (src + test)
│   ├── tsconfig.build.json       ← compila src/ → dist/
│   ├── src/
│   │   ├── index.ts              ← demo: JSON → DTO → servicio → respuesta
│   │   ├── config.ts             ← lee y valida variables de entorno
│   │   ├── data-source.ts        ← configuración de TypeORM
│   │   ├── entities/             ← Cliente.ts, Pedido.ts (@Entity)
│   │   ├── migrations/           ← migraciones versionadas
│   │   ├── dtos/                 ← esquemas Zod de entrada + tipos de salida
│   │   ├── mappers/              ← entidad → DTO de respuesta
│   │   ├── services/             ← lógica de negocio (como un @Service)
│   │   ├── utils/env.ts
│   │   ├── seed.ts · consultas.ts · transacciones.ts   ← scripts de práctica
│   └── test/                     ← pruebas unitarias y de integración
├── prisma-lab/
│   ├── .env / .env.test
│   ├── .env.example / .env.test.example
│   ├── package.json
│   ├── prisma7.config.ts         ← configuración de la CLI de Prisma
│   ├── prisma/
│   │   ├── schema.prisma         ← el modelo de datos
│   │   └── migrations/           ← migraciones en SQL
│   ├── src/
│   │   ├── index.ts · db.ts · config.ts
│   │   ├── generated/prisma/     ← cliente generado (no se sube a git)
│   │   ├── dtos/ · mappers/ · services/ · utils/
│   │   ├── seed.ts · consultas.ts · transacciones.ts · errores.ts
│   └── test/
└── drizzle-lab/
    ├── .env / .env.test
    ├── .env.example / .env.test.example
    ├── package.json
    ├── drizzle.config.ts         ← configuración de la CLI drizzle-kit
    ├── drizzle/                  ← migraciones SQL generadas + metadatos (meta/)
    ├── src/
    │   ├── index.ts · config.ts
    │   ├── migrate.ts            ← aplica migraciones desde código (producción)
    │   ├── db/
    │   │   ├── schema.ts         ← tablas y relaciones en TypeScript
    │   │   └── index.ts          ← pool de conexiones + instancia `db`
    │   ├── dtos/ · mappers/ · services/ · utils/
    │   ├── seed.ts · consultas.ts · transacciones.ts · errores.ts
    └── test/
```

---

## 3. Base de datos con Docker

Un solo contenedor de PostgreSQL con **seis bases**: una de desarrollo y una de pruebas por proyecto.

```bash
# Primera vez: crear y levantar el contenedor
docker run --name pg-orm -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:17

# Crear las bases
docker exec -it pg-orm psql -U postgres -c "CREATE DATABASE typeorm_lab;"
docker exec -it pg-orm psql -U postgres -c "CREATE DATABASE typeorm_test;"
docker exec -it pg-orm psql -U postgres -c "CREATE DATABASE prisma_lab;"
docker exec -it pg-orm psql -U postgres -c "CREATE DATABASE prisma_test;"
docker exec -it pg-orm psql -U postgres -c "CREATE DATABASE drizzle_lab;"
docker exec -it pg-orm psql -U postgres -c "CREATE DATABASE drizzle_test;"
```

Las siguientes veces (por ejemplo, después de reiniciar el Mac) basta con:

```bash
docker start pg-orm
```

Para revisar las bases: `docker exec -it pg-orm psql -U postgres -l`

---

## 4. TypeORM: paso a paso

```bash
cd typeorm-lab
```

### 4.1 Instalar dependencias

```bash
npm install
```

### 4.2 Configurar variables de entorno

```bash
cp .env.example .env
cp .env.test.example .env.test
```

Edita ambos archivos con tus valores. Con el contenedor de la sección 3 quedan así:

```env
# .env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=typeorm_lab
```

```env
# .env.test
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=typeorm_test
DB_LOGGING=false
```

`DB_LOGGING=false` apaga el log de SQL (útil en las pruebas). Si no se define, se muestra cada consulta.

### 4.3 Crear las tablas (migraciones)

```bash
npm run migration:run      # aplica las migraciones pendientes
npm run migration:show     # [X] = aplicada, [ ] = pendiente
```

### 4.4 Cargar datos y practicar

```bash
npm run seed        # borra y carga datos de ejemplo (Ana, Bruno, Carla)
npm run dev         # demo completa: valida un JSON con Zod, crea el cliente y muestra la respuesta
npm run consultas   # find, findOneBy, relations, QueryBuilder y agregaciones
npm run tx          # transacción con rollback forzado
```

### 4.5 Cambiar el modelo (nueva migración)

1. Modifica una entidad en `src/entities/` (por ejemplo, agrega una columna).
2. Genera la migración comparando las entidades con la base:
   ```bash
   npm run migration:generate -- src/migrations/NombreDelCambio
   ```
3. Revisa el archivo generado. Si VS Code marca la primera línea, cámbiala a:
   ```ts
   import type { MigrationInterface, QueryRunner } from "typeorm";
   ```
4. Aplica y, si quieres deshacer la última:
   ```bash
   npm run migration:run
   npm run migration:revert
   ```

### 4.6 Scripts disponibles

| Script | Qué hace |
|---|---|
| `npm run dev` | Ejecuta `src/index.ts` con `tsx` |
| `npm run seed` | Reinicia los datos de ejemplo |
| `npm run consultas` | Ejemplos de consultas |
| `npm run tx` | Ejemplo de transacción |
| `npm run migration:generate -- src/migrations/Nombre` | Genera una migración a partir de las entidades |
| `npm run migration:run` / `migration:revert` / `migration:show` | Aplica, revierte o lista migraciones |
| `npm run typeorm -- <comando>` | Cualquier otro comando de la CLI de TypeORM |
| `npm test` | Pruebas (usa `.env.test`) |
| `npm run typecheck` | Verifica tipos de `src/` y `test/` sin generar archivos |
| `npm run build` | Compila a `dist/` |
| `npm start` | Ejecuta la versión compilada |
| `npm run migration:run:prod` | Aplica migraciones usando el código compilado |

---

## 5. Prisma: paso a paso

```bash
cd prisma-lab
```

> **Importante: este proyecto usa Prisma 7.** `npm install prisma` sin versión instala Prisma 8,
> que tiene otra CLI y otra API. Las versiones ya están fijadas en `package.json`, así que
> `npm install` instala la correcta. Si agregas Prisma a otro proyecto, usa `prisma@7`.

### 5.1 Instalar dependencias

```bash
npm install
```

### 5.2 Configurar variables de entorno

```bash
cp .env.example .env
cp .env.test.example .env.test
```

Mismos valores que en TypeORM, cambiando `DB_NAME` por `prisma_lab` y `prisma_test`.

La URL de conexión se arma en dos lugares, porque Prisma tiene dos consumidores:

| Archivo | Lo usa | Cuándo |
|---|---|---|
| `prisma7.config.ts` | La CLI de Prisma | `migrate`, `generate`, `studio` |
| `src/config.ts` | Tu aplicación | `npm run dev`, `seed`, pruebas… |

### 5.3 Crear las tablas y generar el cliente

```bash
npm run migrate:deploy   # aplica las migraciones existentes
npm run generate         # genera el cliente tipado en src/generated/prisma
```

> El cliente generado no se sube a git. **Después de clonar el repositorio o de cambiar el schema,
> ejecuta siempre `npm run generate`.**

### 5.4 Cargar datos y practicar

```bash
npm run seed        # borra y carga datos de ejemplo (con nested writes)
npm run dev         # demo completa: JSON → DTO → servicio → respuesta
npm run consultas   # findMany, include, some/none, groupBy, _count y $queryRaw
npm run tx          # transacción interactiva con rollback + transacción por lotes
npm run errores     # captura del error P2002 (email duplicado)
npm run studio      # abre Prisma Studio en el navegador para ver y editar datos
```

### 5.5 Cambiar el modelo (nueva migración)

1. Modifica `prisma/schema.prisma`.
2. Crea y aplica la migración en desarrollo:
   ```bash
   npm run migrate:dev -- --name nombre_del_cambio
   ```
3. Regenera el cliente (en Prisma 7, `migrate dev` ya no lo hace solo):
   ```bash
   npm run generate
   ```
4. Revisa el `migration.sql` creado en `prisma/migrations/`.

`migrate dev` es solo para desarrollo. En pruebas, CI y producción se usa `migrate deploy`, que aplica
las migraciones existentes sin crear nuevas.

### 5.6 Scripts disponibles

| Script | Qué hace |
|---|---|
| `npm run dev` | Ejecuta `src/index.ts` con `tsx` |
| `npm run seed` / `consultas` / `tx` / `errores` | Scripts de práctica |
| `npm run generate` | Genera el cliente de Prisma |
| `npm run migrate:dev -- --name x` | Crea y aplica una migración (desarrollo) |
| `npm run migrate:deploy` | Aplica migraciones existentes (pruebas / producción) |
| `npm run migrate:status` | Estado de las migraciones |
| `npm run studio` | Prisma Studio |
| `npm test` | Pruebas (usa `.env.test`) |
| `npm run typecheck` | Verifica tipos sin generar archivos |
| `npm run build` | Genera el cliente y compila a `dist/` |
| `npm start` | Ejecuta la versión compilada |

---

## 6. Drizzle: paso a paso

```bash
cd drizzle-lab
```

> Este proyecto usa la versión estable **Drizzle ORM 0.45** (`drizzle-kit` 0.31). La 1.0 está en
> release candidate y cambia algunas APIs (por ejemplo, la API relacional). Si lees la documentación
> oficial, revisa que corresponda a la versión 0.x.

### 6.1 Instalar dependencias

```bash
npm install
```

### 6.2 Configurar variables de entorno

```bash
cp .env.example .env
cp .env.test.example .env.test
```

Mismos valores que en los otros proyectos, con `DB_NAME=drizzle_lab` y `DB_NAME=drizzle_test`.

Igual que en Prisma, hay dos consumidores de la configuración:

| Archivo | Lo usa | Cuándo |
|---|---|---|
| `drizzle.config.ts` | La CLI `drizzle-kit` | `db:generate`, `db:migrate`, `db:push`, `db:studio` |
| `src/config.ts` | Tu aplicación | `npm run dev`, `seed`, pruebas… |

### 6.3 Crear las tablas

```bash
npm run db:migrate     # aplica las migraciones de drizzle/
```

### 6.4 Cargar datos y practicar

```bash
npm run seed        # borra y carga datos de ejemplo
npm run dev         # demo completa: JSON → DTO → servicio → respuesta
npm run consultas   # API SQL (select/join/groupBy) y API relacional (db.query + with)
npm run tx          # rollback con error y rollback explícito con tx.rollback()
npm run errores     # captura del error 23505 (email duplicado)
npm run db:studio   # Drizzle Studio en el navegador
```

### 6.5 Las dos APIs de Drizzle

```ts
// API SQL: se lee casi igual que el SQL generado (como jOOQ)
await db.select().from(clientes).where(eq(clientes.email, "ana@example.com"));

// API relacional: objetos anidados (como Prisma). Requiere `relations()` en el schema
await db.query.clientes.findFirst({ where: eq(clientes.email, "ana@example.com"), with: { pedidos: true } });
```

Ten en cuenta que `numeric` siempre llega como `string`, pero la API SQL lo entrega como `"15990.00"`
y la relacional como `"15990"`. El mapper `toPedidoResponse` normaliza el formato a dos decimales.

### 6.6 Cambiar el modelo (nueva migración)

1. Modifica `src/db/schema.ts`.
2. Genera la migración comparando el schema con la última migración (no necesita la base):
   ```bash
   npm run db:generate -- --name nombre_del_cambio
   ```
3. Revisa el `.sql` creado en `drizzle/` y aplícalo:
   ```bash
   npm run db:migrate
   ```

`npm run db:push` aplica los cambios del schema directo a la base, **sin crear migración**. Es cómodo
para prototipar, pero equivale a `synchronize: true`: no lo uses en producción.

### 6.7 Scripts disponibles

| Script | Qué hace |
|---|---|
| `npm run dev` | Ejecuta `src/index.ts` con `tsx` |
| `npm run seed` / `consultas` / `tx` / `errores` | Scripts de práctica |
| `npm run db:generate -- --name x` | Genera una migración a partir del schema |
| `npm run db:migrate` | Aplica migraciones con la CLI |
| `npm run db:push` | Sincroniza el schema sin migración (solo prototipos) |
| `npm run db:studio` | Drizzle Studio |
| `npm test` | Pruebas (usa `.env.test`) |
| `npm run typecheck` | Verifica tipos sin generar archivos |
| `npm run build` | Compila a `dist/` |
| `npm start` | Ejecuta la versión compilada |
| `npm run migrate:prod` | Aplica migraciones desde el código compilado (`dist/migrate.js`) |

---

## 7. Pruebas

Los tres proyectos usan el **test runner nativo de Node** (`node:test` + `node:assert`) ejecutado con `tsx`.
No requiere dependencias extra.

```bash
# Requisitos: contenedor levantado y base de pruebas creada (sección 3)
npm test
```

| Archivo | Tipo | Qué prueba |
|---|---|---|
| `test/env.test.ts` | Unitaria | `env()` devuelve el valor o falla con un mensaje claro |
| `test/cliente.dto.test.ts` | Unitaria | Validaciones Zod: email, nombre, totales, al menos un pedido |
| `test/cliente.mapper.test.ts` | Unitaria | Conversión entidad → DTO de respuesta |
| `test/cliente.service.test.ts` | Integración | `ClienteService` contra PostgreSQL real: crear, buscar, duplicados, rollback, totales y clientes sin pedidos |

Cómo funcionan las pruebas de integración:

- Usan la base de `.env.test` (`typeorm_test`, `prisma_test` o `drizzle_test`), nunca la de desarrollo.
- **Antes de empezar** aplican las migraciones: `runMigrations()` en TypeORM, `prisma migrate deploy` en Prisma
  y `migrate()` en Drizzle.
  Es lo mismo que hace Flyway al arrancar una app Spring Boot.
- **Antes de cada prueba** vacían las tablas con `TRUNCATE`, para que cada prueba parta de cero.
- Se ejecutan de a un archivo a la vez (`--test-concurrency=1`) porque comparten la base.

Las pruebas de los tres proyectos son **las mismas**: solo cambian el servicio y el setup. Es la mejor
forma de comparar los ORMs.

Para ejecutar un solo archivo:

```bash
npx tsx --env-file=.env.test --test test/cliente.dto.test.ts
```

---

## 8. Construir y ejecutar en modo producción

En desarrollo, `tsx` ejecuta TypeScript directamente. Para producción se compila a JavaScript:

**TypeORM**

```bash
npm run build                 # src/ → dist/
npm run migration:run:prod    # migraciones usando dist/
npm start                     # node dist/index.js
```

**Prisma**

```bash
npm run build                 # prisma generate + src/ → dist/
npm run migrate:deploy
npm start
```

**Drizzle**

```bash
npm run build                 # src/ → dist/
npm run migrate:prod          # migraciones desde dist/migrate.js (sin drizzle-kit)
npm start
```

Detalles:
- `tsconfig.json` verifica `src/` y `test/` sin generar archivos (`noEmit`). `tsconfig.build.json` lo
  extiende y compila solo `src/` hacia `dist/`.
- En TypeORM, `data-source.ts` detecta si corre desde `.ts` (tsx) o `.js` (dist) para cargar las
  migraciones correctas.
- `dist/` no se sube a git.

---

## 9. Calidad de código con SonarQube

[SonarQube](https://www.sonarsource.com/products/sonarqube/) analiza el código en busca de bugs,
vulnerabilidades, *code smells*, duplicación y falta de cobertura. Se usa la edición gratuita
**Community Build** en Docker.

### 9.1 Conceptos clave

| Concepto | Qué es |
|---|---|
| **Issue** | Un problema en el código. Se clasifica por la calidad que afecta: **seguridad**, **confiabilidad** (bugs) o **mantenibilidad** (*code smells*), y por severidad |
| **Security hotspot** | Código sensible que una persona debe revisar (no siempre es un error) |
| **Rating (A–E)** | Nota por calidad: A es la mejor, E la peor |
| **Cobertura** | Porcentaje de líneas ejecutadas por las pruebas. SonarQube no corre las pruebas: lee el reporte LCOV que genera `c8` |
| **Duplicación** | Porcentaje de líneas repetidas |
| **Quality Profile** | El conjunto de reglas activas por lenguaje (por defecto, *Sonar way*) |
| **Quality Gate** | Las condiciones que el proyecto debe cumplir para "aprobar". El de por defecto (*Sonar way*) evalúa el **código nuevo**: sin issues nuevos, cobertura ≥ 80 % y duplicación ≤ 3 % |
| **Código nuevo** | Lo que cambió desde la versión anterior (`sonar.projectVersion`) o en los últimos días. En el primer análisis todo es código "viejo" |

### 9.2 Levantar SonarQube

```bash
docker compose up -d sonarqube        # desde la raíz de orm-lab
docker logs -f sonarqube              # espera "SonarQube is operational" (1–2 min) y sal con Ctrl+C
```

1. Abre **http://localhost:9000** e ingresa con `admin` / `admin`. Te pedirá cambiar la contraseña. (Ejemplo: @Admin123456)
2. Crea un token: avatar (arriba a la derecha) → **My Account** → **Security** → *Generate Tokens*.
   Elige tipo **User Token**: sirve para analizar **y** para leer los resultados que usa el reporte.
3. Guarda el token en la raíz de `orm-lab`:
   ```bash
   cp .env.sonar.example .env.sonar
   # edita .env.sonar y pega el token en SONAR_TOKEN
   ```

Para detenerlo: `docker compose stop sonarqube`. Los datos se conservan en volúmenes de Docker.

### 9.3 Analizar un proyecto

Con PostgreSQL levantado (las pruebas de integración lo necesitan):

```bash
cd typeorm-lab        # o prisma-lab / drizzle-lab
npm run sonar
```

`npm run sonar` hace dos cosas:

1. `npm run test:coverage`: ejecuta las pruebas con **c8** y genera `coverage/lcov.info`.
2. Ejecuta el scanner oficial (`@sonar/scan`), que lee `sonar-project.properties`, analiza el código,
   envía los resultados al servidor y muestra la URL del dashboard.

El primer análisis tarda más porque el scanner descarga su motor desde el servidor.

Para ver solo la cobertura, sin SonarQube: `npm run test:coverage` (resumen en consola y detalle en
`coverage/lcov-report/index.html`).

### 9.4 Archivos de configuración

| Archivo | Para qué |
|---|---|
| `sonar-project.properties` (en cada proyecto) | Clave del proyecto, carpetas a analizar, exclusiones y ruta del reporte de cobertura |
| `.c8rc.json` (en cada proyecto) | Qué archivos mide la cobertura |
| `.env.sonar` (raíz) | URL del servidor y token. **No se sube a git** |
| `docker-compose.yml` (raíz) | Servidor SonarQube |

Decisiones de configuración:
- Los scripts de demostración (`index.ts`, `seed.ts`, `consultas.ts`…) se analizan, pero no cuentan
  para la cobertura (`sonar.coverage.exclusions`), porque no tienen pruebas: son ejemplos para ejecutar a mano.
- En Prisma se excluye `src/generated/**` (código generado).
- En TypeORM, las migraciones no cuentan para la duplicación (`sonar.cpd.exclusions`).
- Para que el scanner **falle si el Quality Gate no pasa** (útil en CI), descomenta
  `sonar.qualitygate.wait=true` en `sonar-project.properties`.

### 9.5 Generar el reporte

La Community Build no exporta reportes en PDF (es una función de las ediciones pagadas), así que el
repositorio incluye `scripts/sonar-report.mjs`, que consulta la Web API de SonarQube y genera un
**reporte HTML** con los tres proyectos:

```bash
# Desde la raíz de orm-lab, después de analizar los proyectos
node --env-file=.env.sonar scripts/sonar-report.mjs
open reports/sonar-report.html        # macOS
```

El reporte incluye, por proyecto: estado del Quality Gate y sus condiciones, líneas de código,
cobertura, duplicación, ratings de seguridad, confiabilidad y mantenibilidad, la lista de issues
abiertos (con enlace a cada uno en SonarQube) y los security hotspots. También deja los datos crudos en
`reports/sonar-report.json` y termina con código de salida `1` si algún proyecto no aprueba el Quality Gate.

Para un solo proyecto: `node --env-file=.env.sonar scripts/sonar-report.mjs orm-lab-prisma`

### 9.6 Cómo practicar con SonarQube

1. **Analiza los tres proyectos** y compara sus dashboards.
2. **Provoca un issue a propósito**: por ejemplo, deja una variable sin usar o un `catch` vacío en un
   servicio, vuelve a ejecutar `npm run sonar` y búscalo en la pestaña *Issues*. Lee la explicación de la regla.
3. **Baja la cobertura**: comenta un test y observa cómo cambia la métrica.
4. **Haz fallar el Quality Gate**: sube `sonar.projectVersion` (por ejemplo a `1.1.0`) para iniciar un
   nuevo período de código nuevo, agrega un método sin pruebas y analiza otra vez.
5. **Revisa un security hotspot** y márcalo como *Safe* o *Fixed* desde la interfaz.
6. **Instala SonarQube for IDE** (extensión de VS Code) para ver los issues mientras escribes.
   En modo *Connected Mode* usa las mismas reglas que tu servidor.

---

## 10. Arquitectura de cada proyecto

```
JSON de entrada
   │
   ▼
DTO (Zod)            src/dtos/       valida en la frontera (como Bean Validation)
   │  datos válidos y tipados
   ▼
Servicio             src/services/   lógica de negocio y transacciones (como un @Service)
   │  entidad / modelo
   ▼
Mapper               src/mappers/    entidad → DTO de respuesta (no expone el modelo de la base)
   │
   ▼
Respuesta
```

`src/index.ts` recorre este flujo completo. Es idempotente: si el cliente ya existe, no lo vuelve a crear.

### Comparación rápida

| | TypeORM | Prisma | Drizzle |
|---|---|---|---|
| Modelo | Clases con decoradores (`@Entity`) | `schema.prisma` | Tablas en TypeScript (`pgTable`) |
| Se parece a | JPA / Hibernate | Generador de código desde un DSL | jOOQ |
| Consultas | `Repository` + `QueryBuilder` | Cliente generado (`findMany`, `include`…) | API SQL (`select().from()`) + API relacional (`db.query`) |
| Paso de generación | No | Sí (`prisma generate`) | No |
| Decimales | `string` | `Prisma.Decimal` (como `BigDecimal`) | `string` |
| Migraciones | Clases TS con `up()` / `down()` | Archivos SQL | Archivos SQL |
| Transacciones | `ds.transaction(async (manager) => …)` | `prisma.$transaction(async (tx) => …)` o nested writes | `db.transaction(async (tx) => …)` + `tx.rollback()` |

---

## 11. Solución de problemas

| Síntoma | Causa | Solución |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:5432` o `Can't reach database server` | El contenedor está detenido | `docker start pg-orm` |
| `database "..._test" does not exist` | Falta la base de pruebas | Créala (sección 3) |
| `Falta la variable de entorno X` | Falta en `.env` o `.env.test` | Agrégala, guiándote por `.env.example` |
| `column ... does not exist` | Hay migraciones sin aplicar | Aplica las migraciones: `npm run migration:run` (TypeORM), `npm run migrate:deploy` (Prisma) o `npm run db:migrate` (Drizzle) |
| `Cannot find module './generated/prisma/client.js'` | No se generó el cliente | `npm run generate` |
| `The datasource.url property is required` | La CLI de Prisma no encuentra la URL | Revisa `prisma7.config.ts` y tu `.env` |
| `Missing script: "x"` | Estás en otra carpeta o el script no existe | Revisa con `npm run` |
| `Relative import paths need explicit file extensions` | Regla de ESM con `nodenext` | Importa con `.js`: `import { x } from "./archivo.js"` |
| `Cannot access 'Cliente' before initialization` | Import circular entre entidades (TypeORM) | Usa `Relation<...>` en las propiedades de relación |
| `db.query.clientes` es `undefined` (Drizzle) | Falta pasar el schema a `drizzle()` | Revisa `src/db/index.ts`: `drizzle({ client: pool, schema })` |
| `npm error 404 Not Found` al instalar | Nombre de paquete mal escrito | Copia y pega el nombre exacto |
| `npm run sonar` responde `401` o *Not authorized* | Falta el token o expiró | Revisa `SONAR_TOKEN` en `.env.sonar` (raíz de `orm-lab`) |
| `npm run sonar` no conecta a `localhost:9000` | SonarQube detenido o arrancando | `docker compose up -d sonarqube` y espera a que diga *operational* |
| Cobertura 0 % en SonarQube | No se generó `coverage/lcov.info` o las pruebas fallaron | Ejecuta `npm run test:coverage` y revisa que las pruebas pasen |
| El reporte dice *No se pudo leer orm-lab-...* | El proyecto aún no se analiza, o el token no es de usuario | Ejecuta `npm run sonar` en ese proyecto y usa un **User Token** |

### Nota sobre git

`node_modules/`, `dist/`, `src/generated/`, `coverage/`, `reports/`, `.scannerwork/` y los archivos `.env*` (salvo los `.example`) están en
`.gitignore` y no se versionan. Si alguna vez subes uno por error, quítalo del índice sin borrarlo del disco:

```bash
git rm -r --cached <ruta>
```
