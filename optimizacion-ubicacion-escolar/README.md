# Optimización de Ubicación Escolar

Aplicación web interactiva que acompaña el reporte **"Método general para determinar la distancia óptima entre escuelas"** (proyecto de Métodos Numéricos). Implementa el modelo estadístico de Walpole et al. y el método de la secante para encontrar la separación *d\** entre escuelas que minimiza el tiempo de traslado.

**Autores del reporte:** Amaya López Jesús y Eduardo Duarte Sierra
**Docente:** Gutierrez Aldana Eduardo · Métodos Numéricos

## Tecnologías

- React 18 + Vite
- Tailwind CSS 4
- Recharts (gráficas)
- lucide-react (íconos)

## Cómo ejecutarlo localmente

```bash
npm install
npm run dev
```

Abre en tu navegador la URL que aparece en la terminal (normalmente `http://localhost:5173`).

## Compilar para producción

```bash
npm run build
```

Esto genera una carpeta `dist/` lista para desplegar, por ejemplo en GitHub Pages, Vercel o Netlify.

## Estructura del proyecto

```
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx      # punto de entrada de React
    ├── App.jsx       # toda la aplicación (pestañas, cálculo, gráficas)
    └── index.css     # importa Tailwind CSS
```

## Contenido de la aplicación

- **Metodología General** — definición del problema, entradas del método (Cuadro 1), variable de decisión y modelo estadístico.
- **Modelo de Tiempos** — construcción de T(d) a partir de la población (tiempo individual, promedio ponderado, equidad).
- **Validación Estadística** — ANOVA, R², residuos, PRESS, condiciones para aceptar la curva e intervalos de incertidumbre.
- **Cálculo Numérico** — calculadora interactiva del método de la secante, con presets, coeficientes ajustables y comparación contra los extremos del intervalo.
- **Animación Gráfica** — visualización paso a paso de la búsqueda de la raíz sobre T(d) y T'(d).
- **Impacto y ODS** — adaptabilidad del método a otras localidades y vínculo con los ODS 4 y 11 (Cuadro 4).
