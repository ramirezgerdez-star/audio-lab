[README.md](https://github.com/user-attachments/files/28724970/README.md)
# Audio Lab - Analizador de Espectro FFT en Tiempo Real

¡Bienvenido a **Audio Lab**! Esta es una aplicación web interactiva diseñada para capturar el audio del micrófono en tiempo real y renderizar un análisis espectral detallado mediante la Transformada Rápida de Fourier (FFT), incluyendo herramientas de medición avanzadas como cursores dinámicos interactivos.

El proyecto está optimizado para funcionar sin problemas en dispositivos móviles gracias al despliegue seguro con HTTPS a través de GitHub Pages.

---

## 🚀 Características Principales

* **Análisis FFT de Alta Precisión:** Visualización fluida de las frecuencias de audio utilizando la Web Audio API.
* **Ajuste Dinámico de Bins:** Permite cambiar la resolución de la FFT (tamaño del búfer) sobre la marcha con recalibración automática de gráficos.
* **Cursores de Medición:** Cursores interactivos en pantalla para realizar lecturas de espectro precisas.
* **Gestión Inteligente de Energía y Privacidad (Micrófono OFF en Pausa):** Al presionar la pausa, el sistema detiene completamente las pistas de hardware del micrófono (`MediaStreamTrack.stop()`), apagando el indicador de privacidad (punto verde) del smartphone y ahorrando batería. Al reanudar, reconecta automáticamente el flujo de audio.
* **Interfaz Responsiva y Moderna:** Diseñada con estilos oscuros optimizados para laboratorios o entornos de pruebas, indicadores LED de estado animados y diseño adaptativo para móviles.

---

## 🛠️ Tecnologías Utilizadas

* **HTML5 & CSS3:** Estructura de la aplicación y diseño de contenedores.
* **Tailwind CSS / Bootstrap:** Estilos ágiles para un look oscuro táctico, transiciones fluidas y LEDs animados (`animate-pulse`).
* **JavaScript (Vanilla ES6):** Lógica del motor de audio, control de estados de la interfaz y renderizado del bucle en el canvas.
* **Web Audio API:** Manipulación del hardware mediante `AudioContext`, `createMediaStreamSource` y el nodo `AnalyserNode`.
* **GitHub Pages:** Alojamiento estático seguro con cifrado SSL/TLS (HTTPS obligatorio para el uso de `getUserMedia` en navegadores móviles modernos).

---

## 📂 Estructura del Repositorio

El repositorio está organizado con todos los archivos del proyecto centralizados dentro de la carpeta principal de la aplicación:

```text
audio-lab/
└── Maester_Audio/
    ├── index.html            # Interfaz web principal (UI, Canvas y Contenedores)
    └── app.js                # Motor de audio, lógica de estados y bucle de renderizado
