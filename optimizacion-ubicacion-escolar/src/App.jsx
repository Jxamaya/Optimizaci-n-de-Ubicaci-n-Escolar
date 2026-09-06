import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Calculator, BarChart3, Play, Compass, 
  SkipForward, SkipBack, RotateCcw, CheckCircle2, 
  AlertTriangle, Info, Database, Sliders, TrendingUp, Check,
  Clock, ClipboardCheck, Users
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot 
} from 'recharts';

const DEFAULT_PARAMS = {
  // Coeficientes del modelo estadístico de Walpole (Pág 8 del reporte)
  // T(d) = b0 + b1*d + b2/d + b3*d^2
  b0: 4.698212,
  b1: 1.349204,
  b2: 12.273689,
  b3: 0.140142,

  // Límites normativos / físicos
  d_min_limit: 1.2,
  d_max_limit: 4.8,

  // Configuración del método de la secante
  d0: 2.0,
  d1: 4.0,
  tolerance: 0.00001,
  tolerance_f: 0.0000001,
  max_iterations: 30
};

const PRESET_SCENARIOS = {
  reporte: {
    name: "Ejemplo del Reporte (Cuadro 3)",
    b0: 4.698212, b1: 1.349204, b2: 12.273689, b3: 0.140142,
    d0: 2.0, d1: 4.0, d_min_limit: 1.2, d_max_limit: 4.8
  },
  urbano: {
    name: "Zona Urbana Densa",
    b0: 5.5, b1: 0.8, b2: 24.5, b3: 0.22,
    d0: 1.5, d1: 4.5, d_min_limit: 1.0, d_max_limit: 5.0
  },
  rural: {
    name: "Zona Rural Dispersa",
    b0: 3.2, b1: 1.95, b2: 6.2, b3: 0.04,
    d0: 1.2, d1: 3.5, d_min_limit: 0.8, d_max_limit: 6.0
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('explicacion');
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [activePreset, setActivePreset] = useState('reporte');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Función T(d)
  const calculateTime = (d, p = params) => {
    if (d <= 0.001) return null; // Evitar división por cero
    return p.b0 + (p.b1 * d) + (p.b2 / d) + (p.b3 * Math.pow(d, 2));
  };

  // Derivada T'(d)
  const calculateDeriv = (d, p = params) => {
    if (d <= 0.001) return null;
    return p.b1 - (p.b2 / Math.pow(d, 2)) + (2 * p.b3 * d);
  };

  // Segunda Derivada T''(d)
  const calculateSecondDeriv = (d, p = params) => {
    if (d <= 0.001) return null;
    return (2 * p.b2 / Math.pow(d, 3)) + (2 * p.b3);
  };

  const secantExecution = useMemo(() => {
    let d_prev = parseFloat(params.d0);
    let d_curr = parseFloat(params.d1);
    const tol = parseFloat(params.tolerance) || 1e-5;
    const tolF = parseFloat(params.tolerance_f) || 1e-7;
    const maxIter = parseInt(params.max_iterations, 10) || 30;

    const steps = [];
    let converged = false;
    let iterations = 0;

    // Valores seguros por defecto si los inputs están vacíos o son inválidos
    if (isNaN(d_prev) || d_prev <= 0) d_prev = 1.0;
    if (isNaN(d_curr) || d_curr <= 0) d_curr = 2.0;

    let f_prev = calculateDeriv(d_prev);
    let f_curr = calculateDeriv(d_curr);
    
    // Iteración 0 (Dato inicial 1)
    steps.push({
      iter: 0, d_prev: null, d_curr: d_prev, f_curr: f_prev,
      error: 0, error_rel: null, t_curr: calculateTime(d_prev)
    });

    // Iteración 1 (Dato inicial 2)
    steps.push({
      iter: 1, d_prev: d_prev, d_curr: d_curr, f_curr: f_curr,
      error: Math.abs(d_curr - d_prev),
      error_rel: d_curr !== 0 ? Math.abs((d_curr - d_prev) / d_curr) * 100 : null,
      t_curr: calculateTime(d_curr)
    });

    for (let i = 2; i <= maxIter + 1; i++) {
      iterations = i;
      const diff_f = f_curr - f_prev;

      // Romper si la derivada es constante para evitar división por cero
      if (Math.abs(diff_f) < 1e-12) {
        converged = true;
        break;
      }

      // Fórmula de la Secante
      const d_next = d_curr - (f_curr * (d_curr - d_prev)) / diff_f;
      const error = Math.abs(d_next - d_curr);
      const error_rel = d_next !== 0 ? Math.abs((d_next - d_curr) / d_next) * 100 : null;
      const f_next = calculateDeriv(d_next);

      steps.push({
        iter: i, d_prev: d_curr, d_curr: d_next, f_curr: f_next,
        error: error, error_rel: error_rel, t_curr: calculateTime(d_next)
      });

      if (error < tol || Math.abs(f_next) < tolF) {
        converged = true;
        d_curr = d_next;
        break;
      }

      d_prev = d_curr; f_prev = f_curr;
      d_curr = d_next; f_curr = f_next;
    }

    const d_math_opt = d_curr;
    const t_math_opt = calculateTime(d_math_opt);
    const deriv_at_opt = calculateDeriv(d_math_opt);
    const second_deriv = calculateSecondDeriv(d_math_opt);
    const is_minimum = second_deriv > 0;

    // Comparación con los extremos, siguiendo los pasos 10-11 del algoritmo (Sección 8.3):
    // "Comparar T(d*), T(dmín) y T(dmáx)" / "Adoptar el punto factible con menor tiempo".
    const t_at_dmin = calculateTime(params.d_min_limit);
    const t_at_dmax = calculateTime(params.d_max_limit);
    const interior_is_feasible = d_math_opt >= params.d_min_limit && d_math_opt <= params.d_max_limit;
    const t_at_interior = interior_is_feasible ? t_math_opt : null;

    const boundaryCandidates = [
      { d: params.d_min_limit, t: t_at_dmin, label: 'dmin' },
      { d: params.d_max_limit, t: t_at_dmax, label: 'dmax' }
    ];
    if (interior_is_feasible) {
      boundaryCandidates.push({ d: d_math_opt, t: t_at_interior, label: 'interior' });
    }
    let bestCandidate = boundaryCandidates[0];
    for (const cand of boundaryCandidates) {
      if (cand.t < bestCandidate.t) bestCandidate = cand;
    }

    const d_feasible = bestCandidate.d;
    const t_feasible = bestCandidate.t;
    const is_bounded = bestCandidate.label !== 'interior';
    const best_label = bestCandidate.label;

    return { 
      steps, converged, iterations, d_math_opt, t_math_opt, 
      deriv_at_opt, second_deriv, is_minimum, d_feasible, 
      t_feasible, is_bounded,
      t_at_dmin, t_at_dmax, t_at_interior, interior_is_feasible, best_label
    };
  }, [params]);

  const graphData = useMemo(() => {
    const data = [];
    const minD = Math.max(0.1, params.d_min_limit - 1.0);
    const maxD = params.d_max_limit + 1.0;
    const points = 60; 
    const step = (maxD - minD) / points;

    for (let i = 0; i <= points; i++) {
      const d = minD + i * step;
      const tVal = calculateTime(d);
      const fVal = calculateDeriv(d);
      
      if (tVal !== null && fVal !== null && isFinite(tVal) && isFinite(fVal)) {
        data.push({
          d: parseFloat(d.toFixed(3)),
          T: parseFloat(tVal.toFixed(3)),
          f: parseFloat(fVal.toFixed(3))
        });
      }
    }
    return data;
  }, [params]);

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= secantExecution.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, secantExecution.steps.length]);

  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [params]);

  const loadPreset = (key) => {
    setActivePreset(key);
    if (PRESET_SCENARIOS[key]) {
      setParams({ ...params, ...PRESET_SCENARIOS[key] });
    }
  };

  const safeStepIndex = Math.min(currentStep, Math.max(0, secantExecution.steps.length - 1));
  const currentStepData = secantExecution.steps[safeStepIndex] || secantExecution.steps[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Encabezado */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Database className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-lg tracking-tight text-white flex items-center gap-2">
                Optimización de Ubicación Escolar
                <span className="text-[10px] sm:text-xs font-normal px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 hidden md:inline-block">
                  Regresión + Secante
                </span>
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Navegación por Pestañas */}
      <nav className="bg-slate-900 border-b border-slate-800 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 flex gap-2 py-2">
          {[
            { id: 'explicacion', label: 'Metodología General', icon: BookOpen },
            { id: 'modelo_tiempos', label: 'Modelo de Tiempos', icon: Clock },
            { id: 'estadistica', label: 'Validación Estadística', icon: BarChart3 },
            { id: 'dashboard', label: 'Cálculo Numérico', icon: Calculator },
            { id: 'secant_anim', label: 'Animación Gráfica', icon: Play },
            { id: 'ods', label: 'Impacto y ODS', icon: Compass }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Contenedor de Vistas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {activeTab === 'explicacion' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 p-6 sm:p-8 rounded-xl border border-slate-800 shadow-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 flex items-center gap-3 tracking-tight">
                <BookOpen className="w-8 h-8 text-indigo-400" />
                Definición General del Problema
              </h2>
              
              <div className="prose prose-invert prose-slate max-w-none">
                <p className="text-slate-300 leading-relaxed text-sm sm:text-base bg-slate-950/50 p-4 rounded-lg border border-slate-800 border-l-4 border-l-indigo-500">
                  La distancia adecuada entre escuelas depende de la forma de la ciudad, la ubicación de los estudiantes, la red vial, y la congestión generada. Por ello, <strong>no existe un número único que sea óptimo para todos los lugares.</strong> El objetivo de este sistema es implementar un método numérico adaptable a cualquier localidad para encontrar la distancia <em>d*</em> que minimice el tiempo de traslado.
                </p>

                <h3 className="text-lg font-semibold text-white mt-8 mb-3 border-b border-slate-800 pb-2">Entradas que Acepta el Método</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  El procedimiento no depende de una ciudad ni de una matrícula fija: recibe los siguientes datos, cuyo tamaño puede cambiar libremente entre localidades (Cuadro 1 del reporte).
                </p>

                <div className="bg-slate-950/80 rounded-lg border border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Símbolo</th>
                          <th className="py-2.5 px-4 font-semibold">Tipo</th>
                          <th className="py-2.5 px-4 font-semibold">Significado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        <tr>
                          <td className="py-2 px-4 font-mono text-indigo-300">N</td>
                          <td className="py-2 px-4 text-slate-500">entero positivo</td>
                          <td className="py-2 px-4">Número total de estudiantes.</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 font-mono text-indigo-300">p<sub>i</sub></td>
                          <td className="py-2 px-4 text-slate-500">coordenada o nodo</td>
                          <td className="py-2 px-4">Domicilio, zona censal o punto de origen del estudiante i.</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 font-mono text-indigo-300">q<sub>i</sub></td>
                          <td className="py-2 px-4 text-slate-500">peso no negativo</td>
                          <td className="py-2 px-4">Estudiantes representados por el origen i (q<sub>i</sub> = 1 si el dato es individual).</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 font-mono text-indigo-300">m<sub>i</sub></td>
                          <td className="py-2 px-4 text-slate-500">categoría</td>
                          <td className="py-2 px-4">Modo de traslado: caminata, bicicleta, autobús, transporte público o automóvil.</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 font-mono text-indigo-300">G</td>
                          <td className="py-2 px-4 text-slate-500">red</td>
                          <td className="py-2 px-4">Calles, senderos, velocidades, sentidos, pendientes, cruces y barreras.</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 font-mono text-indigo-300">C<sub>j</sub></td>
                          <td className="py-2 px-4 text-slate-500">entero</td>
                          <td className="py-2 px-4">Capacidad del centro escolar j.</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 font-mono text-indigo-300">[d<sub>mín</sub>, d<sub>máx</sub>]</td>
                          <td className="py-2 px-4 text-slate-500">intervalo</td>
                          <td className="py-2 px-4">Separaciones permitidas por cobertura, presupuesto, suelo y normativa.</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 font-mono text-indigo-300">ε<sub>d</sub></td>
                          <td className="py-2 px-4 text-slate-500">real positivo</td>
                          <td className="py-2 px-4">Tolerancia requerida para la distancia calculada.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-slate-950/50 border border-slate-800 rounded-lg">
                  <h4 className="text-sm font-bold text-slate-200 mb-2">Variable de Decisión</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    La variable principal es la separación característica <em>d</em> entre escuelas. Para cada valor de d, las escuelas se ubican mediante S(d) = {'{'}s<sub>1</sub>(d), s<sub>2</sub>(d), …, s<sub>K</sub>(d){'}'}. El método de la secante no depende de cómo se generen esas ubicaciones — solo necesita conocer el tiempo T(d) resultante para cada separación.
                  </p>
                </div>

                <h3 className="text-lg font-semibold text-white mt-8 mb-4 border-b border-slate-800 pb-2">Las Etapas del Procedimiento</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 shadow-inner group hover:border-indigo-500/50 transition-colors">
                    <h4 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">
                      <span className="bg-indigo-900/80 text-indigo-200 w-6 h-6 rounded flex items-center justify-center text-xs">1</span>
                      Recolección de Datos
                    </h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Se definen valores de separación <em>d<sub>1</sub>, d<sub>2</sub>, ..., d<sub>n</sub></em> dentro de un intervalo permitido. Para cada separación, se asigna la población estudiantil a las escuelas y se calcula el tiempo promedio de traslado en la red real, incluyendo demoras vehiculares.
                    </p>
                  </div>

                  <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 shadow-inner group hover:border-emerald-500/50 transition-colors">
                    <h4 className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
                      <span className="bg-emerald-900/80 text-emerald-200 w-6 h-6 rounded flex items-center justify-center text-xs">2</span>
                      Modelo Estadístico
                    </h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Los datos se ajustan mediante mínimos cuadrados múltiples a un modelo de respuesta flexible: <br/>
                      <span className="font-mono text-emerald-300 text-xs bg-emerald-950/50 px-2 py-1 rounded mt-2 inline-block">
                        T(d) = b<sub>0</sub> + b<sub>1</sub>d + b<sub>2</sub>/d + b<sub>3</sub>d²
                      </span>
                      <br/>
                      <span className="text-slate-500 text-xs mt-2 inline-block">Estimado en forma matricial por:</span>
                      <br/>
                      <span className="font-mono text-emerald-300 text-xs bg-emerald-950/50 px-2 py-1 rounded mt-1 inline-block">
                        b = (X<sup>T</sup>X)<sup>-1</sup>X<sup>T</sup>y
                      </span>
                    </p>
                  </div>

                  <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 shadow-inner group hover:border-amber-500/50 transition-colors">
                    <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
                      <span className="bg-amber-900/80 text-amber-200 w-6 h-6 rounded flex items-center justify-center text-xs">3</span>
                      Validación de Curva
                    </h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Antes de optimizar, se revisa la calidad de la curva generada utilizando el Análisis de Varianza (Prueba F), el análisis de los residuales, y el estadístico PRESS para asegurar su capacidad predictiva.
                    </p>
                  </div>

                  <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 shadow-inner group hover:border-rose-500/50 transition-colors">
                    <h4 className="text-rose-400 font-bold mb-2 flex items-center gap-2">
                      <span className="bg-rose-900/80 text-rose-200 w-6 h-6 rounded flex items-center justify-center text-xs">4</span>
                      Búsqueda de Raíz (Secante)
                    </h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Se busca la separación óptima resolviendo iterativamente la condición de punto crítico <em>T'(d) = 0</em> mediante el <strong>Método de la Secante</strong>, para evitar calcular derivadas analíticas complejas.
                    </p>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-lg flex gap-3 items-start">
                  <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-indigo-100">
                    Consulta <strong>"Modelo de Tiempos"</strong> para ver cómo se construye T(d) a partir de la población, o navega directamente a <strong>"Cálculo Numérico"</strong> para ejecutar el algoritmo con los datos del Cuadro 3 del reporte.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'modelo_tiempos' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 p-6 sm:p-8 rounded-xl border border-slate-800 shadow-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 flex items-center gap-3 tracking-tight">
                <Clock className="w-8 h-8 text-indigo-400" />
                Construcción del Tiempo de Traslado
              </h2>

              <p className="text-slate-300 leading-relaxed text-sm sm:text-base bg-slate-950/50 p-4 rounded-lg border border-slate-800 border-l-4 border-l-indigo-500">
                La distancia en línea recta no representa adecuadamente ríos, autopistas, pendientes ni calles sin conexión. Por ello, T(d) se construye a partir del tiempo real de ruta sobre la red G, no de la distancia geométrica. Así se llega, paso a paso, de cada estudiante a la función que después se optimiza.
              </p>

              <div className="grid grid-cols-1 gap-4 mt-6">
                <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 shadow-inner">
                  <h4 className="text-indigo-400 font-bold mb-2 text-sm">Tiempo de Cada Estudiante</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Para el origen i, el tiempo asignado es el mínimo tiempo de ruta hacia una escuela que todavía conserve capacidad disponible:
                  </p>
                  <span className="font-mono text-indigo-300 text-xs bg-indigo-950/50 px-2 py-1.5 rounded inline-block">
                    t<sub>i</sub>(d) = mín{'{'} τ<sub>ij</sub> según el modo m<sub>i</sub> : la escuela j conserva capacidad {'}'}
                  </span>
                </div>

                <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 shadow-inner">
                  <h4 className="text-emerald-400 font-bold mb-2 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4" /> Tiempo Medio de Toda la Población
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    El promedio se pondera por la cantidad de estudiantes que representa cada origen, para que ninguna zona con más alumnos quede subrepresentada:
                  </p>
                  <span className="font-mono text-emerald-300 text-xs bg-emerald-950/50 px-2 py-1.5 rounded inline-block">
                    T<sub>viaje</sub>(d) = Σ q<sub>i</sub>t<sub>i</sub>(d) / Σ q<sub>i</sub>
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed mt-4 mb-3">
                    Sumando la demora por congestión g<sub>j</sub>(d) en el ascenso y descenso de cada plantel j, con matrícula asignada n<sub>j</sub>(d), se obtiene la respuesta completa que después se ajusta por regresión:
                  </p>
                  <span className="font-mono text-emerald-300 text-xs bg-emerald-950/50 px-2 py-1.5 rounded inline-block">
                    T(d) = T<sub>viaje</sub>(d) + Σ n<sub>j</sub>(d)g<sub>j</sub>(d) / N
                  </span>
                </div>

                <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 shadow-inner">
                  <h4 className="text-rose-400 font-bold mb-2 text-sm">Protección de Grupos con Trayectos Largos</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Un promedio bajo puede ocultar tiempos excesivos para una minoría. Cuando la equidad es prioritaria se añade una restricción sobre el percentil 95 de los tiempos individuales:
                  </p>
                  <span className="font-mono text-rose-300 text-xs bg-rose-950/50 px-2 py-1.5 rounded inline-block">
                    Q<sub>0.95</sub>(t<sub>i</sub>(d)) ≤ T<sub>máx</sub>
                  </span>

                  <div className="mt-5 pt-4 border-t border-slate-800/80">
                    <h5 className="text-xs font-semibold text-slate-300 mb-3">Ilustración: por qué el promedio no basta</h5>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Tiempo medio de la población</span><span className="font-mono text-indigo-300">T<sub>viaje</sub></span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2.5 border border-slate-800">
                          <div className="bg-indigo-500 h-full rounded-full" style={{width: '55%'}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Percentil 95 (grupo con trayectos más largos)</span><span className="font-mono text-rose-300">Q<sub>0.95</sub></span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2.5 border border-slate-800">
                          <div className="bg-rose-500 h-full rounded-full" style={{width: '92%'}}></div>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                      Ejemplo ilustrativo, sin datos reales: aunque el promedio sea aceptable, un grupo minoritario puede tener tiempos mucho más altos. La restricción (4) evita que ese percentil supere T<sub>máx</sub>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                <h4 className="font-bold text-sm text-slate-200">Cuadro 2 — Estructura de la Base de Escenarios</h4>
                <p className="text-xs text-slate-400 mt-1">Evaluando T(d) en varios valores de separación se construye la base que después se ajusta por mínimos cuadrados.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 font-mono">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Escenario</th>
                      <th className="py-3 px-4 font-semibold">d<sub>k</sub></th>
                      <th className="py-3 px-4 font-semibold">N<sub>k</sub></th>
                      <th className="py-3 px-4 font-semibold">Tiempo medio y<sub>k</sub></th>
                      <th className="py-3 px-4 font-semibold">Percentil 95</th>
                      <th className="py-3 px-4 font-semibold">Demora g<sub>k</sub></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    <tr>
                      <td className="py-2.5 px-4">1</td><td className="py-2.5 px-4">d<sub>1</sub></td><td className="py-2.5 px-4">N<sub>1</sub></td><td className="py-2.5 px-4">y<sub>1</sub></td><td className="py-2.5 px-4">P<sub>95,1</sub></td><td className="py-2.5 px-4">g<sub>1</sub></td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4">2</td><td className="py-2.5 px-4">d<sub>2</sub></td><td className="py-2.5 px-4">N<sub>2</sub></td><td className="py-2.5 px-4">y<sub>2</sub></td><td className="py-2.5 px-4">P<sub>95,2</sub></td><td className="py-2.5 px-4">g<sub>2</sub></td>
                    </tr>
                    <tr className="text-slate-600">
                      <td className="py-2 px-4">⋮</td><td className="py-2 px-4">⋮</td><td className="py-2 px-4">⋮</td><td className="py-2 px-4">⋮</td><td className="py-2 px-4">⋮</td><td className="py-2 px-4">⋮</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4">n</td><td className="py-2.5 px-4">d<sub>n</sub></td><td className="py-2.5 px-4">N<sub>n</sub></td><td className="py-2.5 px-4">y<sub>n</sub></td><td className="py-2.5 px-4">P<sub>95,n</sub></td><td className="py-2.5 px-4">g<sub>n</sub></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
            {/* Controles */}
            <div className="lg:col-span-4 space-y-5">
              
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
                  <Sliders className="w-4 h-4 text-indigo-400" /> Presets de Localidad
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {Object.keys(PRESET_SCENARIOS).map((key) => (
                    <button
                      key={key}
                      onClick={() => loadPreset(key)}
                      className={`text-left text-xs p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                        activePreset === key
                          ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{PRESET_SCENARIOS[key].name}</span>
                      {activePreset === key && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" /> Coeficientes de Regresión
                  </h3>
                  <button 
                    onClick={() => loadPreset('reporte')} 
                    title="Restaurar reporte"
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1" 
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-4 text-xs">
                  {[
                    { key: 'b0', label: 'b₀ (Base Constante)', min: 0, max: 10, step: 0.1 },
                    { key: 'b1', label: 'b₁ (Proporcionalidad)', min: 0.1, max: 5, step: 0.05 },
                    { key: 'b2', label: 'b₂ (Factor Inverso)', min: 0.5, max: 35, step: 0.5 },
                    { key: 'b3', label: 'b₃ (Curvatura Cuadrática)', min: 0, max: 0.8, step: 0.01 }
                  ].map((field) => (
                    <div key={field.key}>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>{field.label}</span> 
                        <span className="font-mono text-indigo-400">{params[field.key].toFixed(4)}</span>
                      </div>
                      <input 
                        type="range" min={field.min} max={field.max} step={field.step} 
                        value={params[field.key]} 
                        onChange={(e) => { 
                          setActivePreset('custom'); 
                          setParams({ ...params, [field.key]: parseFloat(e.target.value) }); 
                        }} 
                        className="w-full accent-indigo-500" 
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 border-b border-slate-800 pb-2 mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-rose-400" /> Semillas y Tolerancia (Secante)
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Inicial d₀</label>
                    <input type="number" step="0.1" value={params.d0} onChange={(e) => { setActivePreset('custom'); setParams({ ...params, d0: parseFloat(e.target.value) || 0 }); }} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200 font-mono" />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Inicial d₁</label>
                    <input type="number" step="0.1" value={params.d1} onChange={(e) => { setActivePreset('custom'); setParams({ ...params, d1: parseFloat(e.target.value) || 0 }); }} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200 font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Tolerancia ε<sub>d</sub></label>
                    <input type="number" step="0.000001" value={params.tolerance} onChange={(e) => { setActivePreset('custom'); setParams({ ...params, tolerance: parseFloat(e.target.value) || 0.00001 }); }} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200 font-mono" />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Tolerancia ε<sub>f</sub></label>
                    <input type="number" step="0.0000001" value={params.tolerance_f} onChange={(e) => { setActivePreset('custom'); setParams({ ...params, tolerance_f: parseFloat(e.target.value) || 0.0000001 }); }} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200 font-mono" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  El algoritmo se detiene cuando |d<sub>r+1</sub> − d<sub>r</sub>| {'<'} ε<sub>d</sub> o cuando |f(d<sub>r+1</sub>)| {'<'} ε<sub>f</sub> (Sección 8.2).
                </p>
              </div>
            </div>

            {/* Resultados y Tabla Numérica */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950/20 p-6 rounded-xl border border-indigo-500/30 shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 border-b border-slate-800/80 pb-4">
                  <div>
                    <span className="text-xs uppercase tracking-widest font-semibold text-indigo-400">Punto Estacionario Encontrado</span>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Separación Óptima d*</h2>
                  </div>
                  {secantExecution.converged ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" /> Tolerancia Cumplida
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <AlertTriangle className="w-4 h-4" /> Límite de Iteraciones
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-950/80 p-4 rounded-lg border border-slate-800 text-center sm:text-left">
                    <span className="text-xs text-slate-400 block mb-1">Distancia Mínima d*</span>
                    <span className="text-2xl font-extrabold text-indigo-400 font-mono">
                      {secantExecution.d_feasible?.toFixed(6)}
                    </span>
                  </div>
                  <div className="bg-slate-950/80 p-4 rounded-lg border border-slate-800 text-center sm:text-left">
                    <span className="text-xs text-slate-400 block mb-1">Tiempo Estimado T(d*)</span>
                    <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                      {secantExecution.t_feasible?.toFixed(6)}
                    </span>
                  </div>
                  <div className="bg-slate-950/80 p-4 rounded-lg border border-slate-800 text-center sm:text-left">
                    <span className="text-xs text-slate-400 block mb-1">Primera Derivada T'(d)</span>
                    <span className="text-xl font-bold text-slate-200 font-mono">
                      {typeof secantExecution.deriv_at_opt === 'number' ? secantExecution.deriv_at_opt.toExponential(2) : '-'}
                    </span>
                  </div>
                  <div className="bg-slate-950/80 p-4 rounded-lg border border-slate-800 text-center sm:text-left flex flex-col justify-center">
                    <span className="text-xs text-slate-400 block mb-1">Condición T''(d*) &gt; 0</span>
                    <span className={`text-sm font-bold block ${secantExecution.is_minimum ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {secantExecution.is_minimum ? "Mínimo Local" : "No es mínimo"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comparación con los extremos: pasos 10-11 del algoritmo (Sección 8.3) */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                  <h4 className="font-bold text-sm text-slate-200">Comparación con los Extremos</h4>
                  <p className="text-xs text-slate-400 mt-1">El algoritmo exige comparar T(d*) con T(d_mín) y T(d_máx), y adoptar el punto factible de menor tiempo.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
                  <div className={`p-4 text-center ${secantExecution.best_label === 'dmin' ? 'bg-emerald-950/30' : ''}`}>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block">d_mín = {params.d_min_limit}</span>
                    <span className="text-lg font-mono font-bold text-slate-200 block mt-1">T = {secantExecution.t_at_dmin?.toFixed(4)}</span>
                    {secantExecution.best_label === 'dmin' && <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mt-1" />}
                  </div>
                  <div className={`p-4 text-center ${secantExecution.best_label === 'interior' ? 'bg-emerald-950/30' : ''}`}>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                      d* (raíz de la secante){!secantExecution.interior_is_feasible && ' — fuera de rango'}
                    </span>
                    <span className="text-lg font-mono font-bold text-slate-200 block mt-1">
                      {secantExecution.interior_is_feasible ? `T = ${secantExecution.t_at_interior?.toFixed(4)}` : 'No factible'}
                    </span>
                    {secantExecution.best_label === 'interior' && <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mt-1" />}
                  </div>
                  <div className={`p-4 text-center ${secantExecution.best_label === 'dmax' ? 'bg-emerald-950/30' : ''}`}>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block">d_máx = {params.d_max_limit}</span>
                    <span className="text-lg font-mono font-bold text-slate-200 block mt-1">T = {secantExecution.t_at_dmax?.toFixed(4)}</span>
                    {secantExecution.best_label === 'dmax' && <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mt-1" />}
                  </div>
                </div>
              </div>

              {/* Tabla de Iteraciones que replica el Cuadro 3 del reporte */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col justify-between items-start gap-2">
                  <h4 className="font-bold text-sm text-slate-200">Tabla de Iteraciones de la Secante (Cuadro 3)</h4>
                  <span className="text-[11px] font-mono text-indigo-300">
                    Fórmula: d<sub>r+1</sub> = d<sub>r</sub> - f(d<sub>r</sub>) * [d<sub>r</sub> - d<sub>r-1</sub>] / [f(d<sub>r</sub>) - f(d<sub>r-1</sub>)]
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 font-mono">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Iter (r)</th>
                        <th className="py-3 px-4 font-semibold">d<sub>r</sub></th>
                        <th className="py-3 px-4 font-semibold">f(d<sub>r</sub>)</th>
                        <th className="py-3 px-4 font-semibold">T(d<sub>r</sub>)</th>
                        <th className="py-3 px-4 font-semibold">| d<sub>r</sub> - d<sub>r-1</sub> |</th>
                        <th className="py-3 px-4 font-semibold">ε<sub>a</sub> (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {secantExecution.steps.filter(s => s.d_prev !== null || s.iter === 0).map((step) => (
                        <tr key={step.iter} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-indigo-400">{step.iter}</td>
                          <td className="py-2.5 px-4">{step.d_curr?.toFixed(6)}</td>
                          <td className="py-2.5 px-4">{step.f_curr?.toFixed(6)}</td>
                          <td className="py-2.5 px-4">{step.t_curr?.toFixed(6)}</td>
                          <td className="py-2.5 px-4 text-slate-400">
                            {step.iter === 0 ? '' : (typeof step.error === 'number' ? step.error.toFixed(6) : '-')}
                          </td>
                          <td className="py-2.5 px-4 text-slate-400">
                            {step.iter === 0 || step.error_rel === null || step.error_rel === undefined ? '' : `${step.error_rel.toFixed(4)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'estadistica' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
            <div className="bg-slate-900 p-6 sm:p-8 rounded-xl border border-slate-800 space-y-6 shadow-xl">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="w-7 h-7 text-emerald-400" />
                Validación de la Curva de Regresión
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                Según el informe, no debe buscarse el mínimo numérico de una curva que no describe adecuadamente los datos reales. Antes de aplicar el método de la secante, el modelo generado por mínimos cuadrados debe validarse con las siguientes métricas estadísticas:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-3 bg-slate-950/50 p-5 rounded-lg border border-slate-800">
                  <h3 className="text-sm font-bold text-indigo-300 border-b border-slate-800 pb-2">1. Análisis de Varianza (ANOVA)</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    La variación total se divide en SCR y SCE. La prueba F global confirma que el modelo explica una fracción significativa del tiempo de traslado en comparación con el ruido.
                  </p>
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="font-mono text-indigo-300 text-xs bg-indigo-950/50 px-2 py-1 rounded inline-block w-fit">SCT = SCR + SCE</span>
                    <span className="font-mono text-indigo-300 text-xs bg-indigo-950/50 px-2 py-1 rounded inline-block w-fit">F = (SCR/p) / (SCE/(n−p−1))</span>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-950/50 p-5 rounded-lg border border-slate-800">
                  <h3 className="text-sm font-bold text-indigo-300 border-b border-slate-800 pb-2">2. Coeficiente de Determinación</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Se reporta el <em>R² ajustado</em> en lugar del R² simple para evitar el sobreajuste que ocurre artificialmente al añadir variables como d² o 1/d al polinomio.
                  </p>
                  <div className="pt-1">
                    <span className="font-mono text-indigo-300 text-xs bg-indigo-950/50 px-2 py-1 rounded inline-block w-fit">R² = 1 − SCE/SCT</span>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-950/50 p-5 rounded-lg border border-slate-800">
                  <h3 className="text-sm font-bold text-indigo-300 border-b border-slate-800 pb-2">3. Análisis de Residuos (e = y - T)</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Los errores deben formar una nube aleatoria sin patrones cuando se grafican contra la distancia. Esto apoya los supuestos de linealidad y varianza constante.
                  </p>
                  <div className="pt-1">
                    <span className="font-mono text-indigo-300 text-xs bg-indigo-950/50 px-2 py-1 rounded inline-block w-fit">e<sub>k</sub> = y<sub>k</sub> − T(d<sub>k</sub>)</span>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-950/50 p-5 rounded-lg border border-slate-800">
                  <h3 className="text-sm font-bold text-indigo-300 border-b border-slate-800 pb-2">4. Estadístico PRESS</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Mide la capacidad de predecir nuevos escenarios. Un valor PRESS bajo indica que la curva es confiable para optimizar distancias no medidas en campo.
                  </p>
                  <div className="pt-1">
                    <span className="font-mono text-indigo-300 text-xs bg-indigo-950/50 px-2 py-1 rounded inline-block w-fit">PRESS = Σ(y<sub>k</sub> − ŷ<sub>(k)</sub>)²</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 p-5 rounded-lg border border-slate-800">
                <h3 className="text-sm font-bold text-emerald-300 border-b border-slate-800 pb-2 mb-3 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" /> Condiciones para Aceptar la Curva Antes de Optimizar
                </h3>
                <p className="text-xs text-slate-500 mb-3">Antes de aplicar la secante, confirma manualmente contra tu propio ajuste (Sección 6.3):</p>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Significancia global de la regresión (prueba F).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Residuos sin tendencia sistemática frente a d<sub>k</sub> y a ŷ<sub>k</sub>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Error de predicción (PRESS) aceptable para la escala del problema.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Datos disponibles a ambos lados de la región de mínimo.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>La raíz de la derivada cae dentro de [d<sub>mín</sub>, d<sub>máx</sub>].</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950/50 p-5 rounded-lg border border-slate-800">
                <h3 className="text-sm font-bold text-sky-300 border-b border-slate-800 pb-2 mb-3">Incertidumbre y Actualización</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  Para cada separación candidata conviene reportar dos intervalos distintos, con x<sub>d</sub> = [1, d, 1/d, d²]<sup>T</sup>:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1.5">Intervalo de confianza (tiempo medio esperado)</span>
                    <span className="font-mono text-xs text-sky-300 leading-relaxed">T(d) ± t<sub>α/2,ν</sub> · s · √(x<sub>d</sub><sup>T</sup>(X<sup>T</sup>X)<sup>-1</sup>x<sub>d</sub>)</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1.5">Intervalo de predicción (una observación futura)</span>
                    <span className="font-mono text-xs text-sky-300 leading-relaxed">T(d) ± t<sub>α/2,ν</sub> · s · √(1 + x<sub>d</sub><sup>T</sup>(X<sup>T</sup>X)<sup>-1</sup>x<sub>d</sub>)</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mt-3">
                  La ubicación no debe tratarse como definitiva: al agregar observaciones nuevas a la base se recalculan b<sub>0</sub>...b<sub>3</sub> y se repite la secante.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'secant_anim' && (
          <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Play className="w-6 h-6 text-indigo-400" /> Búsqueda Iterativa (Gráfica)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Visualización de T(d) (curva base) y T'(d) (derivada cruzando el eje 0).
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 self-stretch sm:self-auto justify-center">
                  <button 
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} 
                    disabled={currentStep === 0} 
                    className="p-2 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-300 transition-colors"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)} 
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition-colors w-28 text-center"
                  >
                    {isPlaying ? 'Pausar' : 'Reproducir'}
                  </button>
                  <button 
                    onClick={() => setCurrentStep(Math.min(secantExecution.steps.length - 1, currentStep + 1))} 
                    disabled={currentStep >= secantExecution.steps.length - 1} 
                    className="p-2 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-300 transition-colors"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="h-80 sm:h-96 w-full bg-slate-950/80 rounded-xl p-2 sm:p-4 border border-slate-800">
                {graphData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis 
                        dataKey="d" stroke="#64748b" 
                        label={{ value: 'Separación d', position: 'insideBottom', offset: -15, fill: '#94a3b8', fontSize: 12 }} 
                      />
                      <YAxis yAxisId="left" stroke="#818cf8" domain={['auto', 'auto']} />
                      <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }} 
                        itemStyle={{ color: '#e2e8f0' }}
                      />
                      
                      <Line yAxisId="left" type="monotone" dataKey="T" stroke="#818cf8" strokeWidth={2.5} dot={false} name="Tiempo Estimado" isAnimationActive={false} />
                      <ReferenceLine yAxisId="right" y={0} stroke="#f43f5e" strokeDasharray="4 4" />
                      <Line yAxisId="right" type="monotone" dataKey="f" stroke="#38bdf8" strokeWidth={1.5} dot={false} name="Derivada" isAnimationActive={false} />

                      {/* Renderizado seguro del punto de iteración actual */}
                      {currentStepData && Number.isFinite(currentStepData.d_curr) && Number.isFinite(currentStepData.f_curr) && (
                        <ReferenceDot 
                          yAxisId="right"
                          x={currentStepData.d_curr} 
                          y={currentStepData.f_curr} 
                          r={7} 
                          fill="#10b981" 
                          stroke="#ffffff" 
                          strokeWidth={2}
                          isFront={true}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                    Calculando gráfica...
                  </div>
                )}
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs gap-3">
                <span className="text-slate-400">
                  Iteración: <strong className="text-indigo-400 text-sm font-mono">{currentStep}</strong> / {secantExecution.steps.length - 1}
                </span>
                <span className="text-slate-300 font-mono bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
                  d = {currentStepData.d_curr?.toFixed(4)} | f(d) = {currentStepData.f_curr?.toFixed(4)}
                  {typeof currentStepData.error_rel === 'number' ? ` | ε_a = ${currentStepData.error_rel.toFixed(4)}%` : ''}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ods' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
            <div className="bg-slate-900 p-6 sm:p-8 rounded-xl border border-slate-800 space-y-6 shadow-xl">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3 border-b border-slate-800 pb-4">
                <Compass className="w-7 h-7 text-sky-400" />
                Adaptabilidad y Vínculo con los ODS
              </h2>

              <div className="p-5 bg-sky-950/20 border border-sky-500/20 rounded-lg space-y-3">
                <h3 className="text-sm font-bold text-sky-300 uppercase tracking-wide">El Método No es Estático</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Como se especifica en la Sección 10 del informe, la solución obtenida (d*) <strong>no se transfiere de una localidad a otra</strong>. El valor real radica en el algoritmo numérico. Al modificar los orígenes, capacidades o crecimiento demográfico futuro, el modelo calcula una nueva función y ejecuta la secante nuevamente.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div className="p-5 bg-slate-950 rounded-lg border border-emerald-900/50 shadow-inner">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ODS 4 — Educación
                  </span>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Minimiza el tiempo global de traslado, asegurando accesibilidad equitativa y protegiendo a grupos minoritarios de trayectos inviables mediante restricciones de equidad (percentiles).
                  </p>
                </div>
                
                <div className="p-5 bg-slate-950 rounded-lg border border-amber-900/50 shadow-inner">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> ODS 11 — Ciudades Sostenibles
                  </span>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Integra la congestión vehicular local dentro de la función de tiempo. Esto previene ubicaciones que saturen el ordenamiento vial en zonas residenciales densas.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/60 rounded-lg border border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800">
                  <h4 className="font-bold text-sm text-slate-200">Cuadro 4 — Cómo se Adapta el Mismo Método</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Circunstancia</th>
                        <th className="py-2.5 px-4 font-semibold">Modificación de los Datos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      <tr>
                        <td className="py-2 px-4 text-sky-300 font-medium whitespace-nowrap">Zona rural dispersa</td>
                        <td className="py-2 px-4">Usar tiempos de carretera y pesos por comunidad; ampliar d<sub>máx</sub>.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-sky-300 font-medium whitespace-nowrap">Centro urbano denso</td>
                        <td className="py-2 px-4">Incorporar tiempos peatonales, transporte público, cruces y colas de descenso.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-sky-300 font-medium whitespace-nowrap">Ríos o autopistas</td>
                        <td className="py-2 px-4">Calcular rutas en la red; no usar distancia euclidiana.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-sky-300 font-medium whitespace-nowrap">Demanda no uniforme</td>
                        <td className="py-2 px-4">Asignar a cada origen su peso q<sub>i</sub> real.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-sky-300 font-medium whitespace-nowrap">Crecimiento futuro</td>
                        <td className="py-2 px-4">Repetir el análisis con proyecciones de q<sub>i</sub>.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-sky-300 font-medium whitespace-nowrap">Capacidad limitada</td>
                        <td className="py-2 px-4">Prohibir asignaciones para las que Σq<sub>i</sub> {'>'} C<sub>j</sub>.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-sky-300 font-medium whitespace-nowrap">Varios niveles escolares</td>
                        <td className="py-2 px-4">Ejecutar el método por nivel o incorporar capacidades y velocidades específicas.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-sky-300 font-medium whitespace-nowrap">Equidad territorial</td>
                        <td className="py-2 px-4">Añadir restricciones sobre tiempo máximo, percentil 95 o cobertura mínima.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-sky-300 font-medium whitespace-nowrap">Congestión variable</td>
                        <td className="py-2 px-4">Medir varios horarios y ajustar variables adicionales en la regresión.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Pie de página con los datos del proyecto */}
      <footer className="border-t border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-[11px] text-slate-500 leading-relaxed text-center sm:text-left">
            Proyecto de aplicación de métodos numéricos — <span className="text-slate-400">Método general para determinar la distancia óptima entre escuelas</span>
            <br className="hidden sm:block" />
            Amaya López Jesús y Eduardo Duarte Sierra · Docente: Gutierrez Aldana Eduardo · Métodos Numéricos · 3 de septiembre de 2026
          </p>
        </div>
      </footer>
    </div>
  );
}