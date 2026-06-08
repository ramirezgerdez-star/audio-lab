const btnAudio = document.getElementById('btn-audio');
const btnPausa = document.getElementById('btn-pausa');
const selectFft = document.getElementById('select-fft');
const statusLed = document.getElementById('status-led');
const statusText = document.getElementById('status-text');
const footerSampleRate = document.getElementById('footer-samplerate');
const canvas = document.getElementById('canvas-espectro');
const canvasCtx = canvas.getContext('2d');

// Elementos de control de rango
const rangeFmin = document.getElementById('range-fmin');
const rangeFmax = document.getElementById('range-fmax');
const valFmin = document.getElementById('val-fmin');
const valFmax = document.getElementById('val-fmax');

let audioCtx;
let analyser;
let dataArray;
let bufferLength;
let localStream;

let estaPausado = false;
let audioIniciado = false;

let alturaSueloEfectiva = 305;
let marcadorFijoX = -1;

// Valores por defecto del rango de frecuencias
let fMin = parseInt(rangeFmin.value);
let fMax = parseInt(rangeFmax.value);

canvas.width = 800;
canvas.height = 320;

// Escuchar cambios en los Sliders
rangeFmin.addEventListener('input', () => {
    fMin = parseInt(rangeFmin.value);
    if (fMin >= fMax) fMin = fMax - 100; // Evitar cruce de valores
    valFmin.innerText = `${fMin} Hz`;
});

rangeFmax.addEventListener('input', () => {
    fMax = parseInt(rangeFmax.value);
    if (fMax <= fMin) fMax = fMin + 100; // Evitar cruce de valores
    valFmax.innerText = `${fMax} Hz`;
});

selectFft.addEventListener('change', () => {
    if (analyser) {
        analyser.fftSize = parseInt(selectFft.value);
        actualizarVariablesFFT();
    }
});

btnAudio.addEventListener('click', async () => {
    if (!audioIniciado) {
        await inicializarAudio();
    }
});

btnPausa.addEventListener('click', () => {
    if (!audioIniciado) return;
    estaPausado = !estaPausado;
    if (estaPausado) {
        btnPausa.innerHTML = `<svg class="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg> Reanudar`;
        statusText.innerText = "FFT FROZEN";
        statusLed.className = "w-2 h-2 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50 animate-pulse";
    } else {
        btnPausa.innerHTML = `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V7zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg> Pausar`;
        statusText.innerText = "FFT SPECTRUM RECV";
        statusLed.className = "w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse";
        dibujarEspectro();
    }
});

async function inicializarAudio() {
    try {
        if (!navigator.mediaDevices && window.isSecureContext === false) {
            alert("Tu navegador bloquea el micrófono en redes http locales.");
            return;
        }

        // 1. Obtener el micrófono del usuario
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
            video: false
        });

        // 2. Crear el contexto de audio
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // 3. Crear la fuente desde el micrófono
        const fuenteMicrofono = audioCtx.createMediaStreamSource(localStream);

        // 4. Crear el analizador real (asegurándonos de asignarlo a tu variable global)
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024; // O el tamaño que estés usando (2048, etc.)

        // ... (todo tu código anterior de conectar la fuente y el analyser se queda igual) ...

        // 5. ¡EL PUENTE CRUCIAL! Conectar el micrófono al analizador
        fuenteMicrofono.connect(analyser);

        // 6. Inicializar el array con el tamaño correcto para las frecuencias
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        // --- PARCHE DE DESPIERTE PARA MÓVILES ---
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        // Arrancar el bucle de dibujo
        audioIniciado = true;
        estaPausado = false;
        dibujarEspectro();

    } catch (error) {
        console.error("Error al acceder al micrófono:", error);
        alert("No se pudo activar el micrófono: " + error.message);
    }
}

function actualizarVariablesFFT() {
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
}

function dibujarEspectro() {
    if (!audioIniciado || estaPausado) return;

    // Volver a llamar a la función en el próximo fotograma
    requestAnimationFrame(dibujarEspectro);

    // ¡ESTA LÍNEA ES VITAL! Llena el array con las frecuencias actuales
    analyser.getByteFrequencyData(dataArray);

    canvasCtx.fillStyle = '#09090b';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    // Rejilla de fondo
    canvasCtx.strokeStyle = 'rgba(39, 39, 42, 0.3)';
    canvasCtx.lineWidth = 1;
    for (let i = 50; i < canvas.height; i += 50) {
        canvasCtx.beginPath(); canvasCtx.moveTo(0, i); canvasCtx.lineTo(canvas.width, i); canvasCtx.stroke();
    }

    // --- MAGIA MATEMÁTICA DEL SPAN / ZOOM ---
    // Cada 'bin' (casilla) del array equivale a un salto de hertzios fijo: Hz_por_bin = SampleRate / fftSize
    const hzPerBin = audioCtx.sampleRate / analyser.fftSize;

    // Calculamos en qué índice (bin) empiezan y terminan las frecuencias deseadas
    const indexMin = Math.floor(fMin / hzPerBin);
    const indexMax = Math.min(Math.floor(fMax / hzPerBin), bufferLength - 1);

    // Cuántos elementos reales vamos a dibujar en pantalla
    const totalBinsADibujar = indexMax - indexMin;

    if (totalBinsADibujar <= 0) return;

    // El ancho de cada barra se calcula dividiendo el canvas solo entre las barras filtradas
    const barWidth = canvas.width / totalBinsADibujar;
    let barHeight;
    let x = 0;

    // Solo recorremos el segmento seleccionado del array original
    for (let i = indexMin; i <= indexMax; i++) {
        barHeight = dataArray[i];

        const percent = (i - indexMin) / totalBinsADibujar;

        // Colores: Degradado esmeralda-cyan según el segmento visible
        const r = Math.floor(34 + (barHeight * 0.4));
        const g = Math.floor(197 - (percent * 40));
        const b = Math.floor(94 + (percent * 140));

        const renderHeight = (barHeight / 255) * (canvas.height * 0.82);

        canvasCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        // Se dibuja la barra estirada cubriendo el espacio asignado
        canvasCtx.fillRect(x, canvas.height - renderHeight - 10, Math.max(barWidth - 1, 0.5), renderHeight);

        x += barWidth;
    }

    // --- 3. DIBUJAR CURSOR DE MEDICIÓN DE FRECUENCIA EN TIEMPO REAL ---
    if (mouseEnCanvas && audioIniciado && !estaPausado) {
        // Calcular la fracción de la pantalla donde está parado el mouse (0.0 a 1.0)
        const fraccionMouse = mouseX / canvas.width;

        // Regla de tres matemática: Interpolar la frecuencia según el Zoom activo
        const frecuenciaMedida = fMin + (fraccionMouse * (fMax - fMin));

        // Dibujar línea guía vertical de color cyan/azul flúor translúcido
        canvasCtx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
        canvasCtx.lineWidth = 1.5;
        canvasCtx.setLineDash([4, 4]); // Línea punteada tipo osciloscopio
        canvasCtx.beginPath();
        canvasCtx.moveTo(mouseX, 0);
        canvasCtx.lineTo(mouseX, alturaSueloEfectiva);
        canvasCtx.stroke();
        canvasCtx.setLineDash([]); // Resetear estilo de línea normal

        // Formatear el texto flotante de la medición
        let textoMedicion;
        if (frecuenciaMedida >= 1000) {
            textoMedicion = `${(frecuenciaMedida / 1000).toFixed(2)} kHz`;
        } else {
            textoMedicion = `${Math.floor(frecuenciaMedida)} Hz`;
        }

        // Configurar la cajita negra flotante (Tooltip) arriba del puntero
        canvasCtx.font = 'bold 11px monospace';
        const anchoTexto = canvasCtx.measureText(textoMedicion).width;
        const paddingX = 8;
        const altoCaja = 20;
        const anchoCaja = anchoTexto + (paddingX * 2);

        // Evitar que la caja de texto se salga por los bordes laterales del canvas
        let cajaX = mouseX - (anchoCaja / 2);
        if (cajaX < 4) cajaX = 4;
        if (cajaX + anchoCaja > canvas.width - 4) cajaX = canvas.width - anchoCaja - 4;

        const cajaY = 15; // Altura fija superior para que no tape las barras bajas

        // Dibujar el fondo de la etiqueta flotante
        canvasCtx.fillStyle = 'rgba(9, 9, 11, 0.85)';
        canvasCtx.strokeStyle = '#22d3ee'; // Borde Cyan
        canvasCtx.lineWidth = 1;
        canvasCtx.beginPath();
        canvasCtx.roundRect(cajaX, cajaY, anchoCaja, altoCaja, 5);
        canvasCtx.fill();
        canvasCtx.stroke();

        // Escribir los Hz/kHz medidos dentro de la caja
        canvasCtx.fillStyle = '#22d3ee';
        canvasCtx.textAlign = 'center';
        canvasCtx.fillText(textoMedicion, cajaX + (anchoCaja / 2), cajaY + 14);
    }

    // --- 4. DIBUJAR MARCADOR FIJO CUANDO EL USUARIO HACE CLICk ---
    if (marcadorFijoX !== -1 && audioIniciado) {
        // Calcular la frecuencia estática basada en la posición guardada
        const fraccionFija = marcadorFijoX / canvas.width;
        const frecuenciaFija = fMin + (fraccionFija * (fMax - fMin));

        let textoFijo = frecuenciaFija >= 1000
            ? `${(frecuenciaFija / 1000).toFixed(2)} kHz`
            : `${Math.floor(frecuenciaFija)} Hz`;

        canvasCtx.save();

        // Línea vertical fija (Color Rojo/Naranja Amber para diferenciarla del cursor vivo)
        canvasCtx.strokeStyle = '#f59e0b';
        canvasCtx.lineWidth = 2;
        canvasCtx.beginPath();
        canvasCtx.moveTo(marcadorFijoX, 0);
        canvasCtx.lineTo(marcadorFijoX, alturaSueloEfectiva);
        canvasCtx.stroke();

        // Tarjeta flotante estática superior
        canvasCtx.font = 'bold 11px monospace';
        const anchoTextoFijo = canvasCtx.measureText(textoFijo).width;
        const anchoCajaFija = anchoTextoFijo + 16;

        let cajaFijaX = marcadorFijoX - (anchoCajaFija / 2);
        if (cajaFijaX < 4) cajaFijaX = 4;
        if (cajaFijaX + anchoCajaFija > canvas.width - 4) cajaFijaX = canvas.width - anchoCajaFija - 4;

        // Fondo de la tarjeta fija (un tono naranja oscuro/negro)
        canvasCtx.fillStyle = 'rgba(12, 10, 9, 0.9)';
        canvasCtx.strokeStyle = '#f59e0b';
        canvasCtx.lineWidth = 1;
        canvasCtx.beginPath();
        canvasCtx.roundRect(cajaFijaX, 42, anchoCajaFija, 22, 5); // Un poco más abajo (Y=42) para que no choque con el cursor dinámico
        canvasCtx.fill();
        canvasCtx.stroke();

        // Texto de frecuencia fija
        canvasCtx.fillStyle = '#f59e0b';
        canvasCtx.textAlign = 'center';
        canvasCtx.fillText(textoFijo, cajaFijaX + (anchoCajaFija / 2), 57);

        canvasCtx.restore();
    }
}

// --- CURSOR INTERACTIVO DE MEDICIÓN (BLOQUE DEFINITIVO) ---
let mouseX = -1;
let mouseEnCanvas = false;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    mouseEnCanvas = true;

    // Si el audio está activo y no está pausado, forzamos al cursor a dibujar encima
    if (audioIniciado && !estaPausado && analyser) {

        // Calcular hercios en la posición actual del mouse
        const fraccionMouse = mouseX / canvas.width;
        const frecuenciaMedida = fMin + (fraccionMouse * (fMax - fMin));

        // Formatear texto de salida
        let textoMedicion = frecuenciaMedida >= 1000
            ? `${(frecuenciaMedida / 1000).toFixed(2)} kHz`
            : `${Math.floor(frecuenciaMedida)} Hz`;

        // Guardar configuración del lienzo para no romper el espectro de fondo
        canvasCtx.save();

        // 1. Dibujar línea vertical punteada tipo osciloscopio
        canvasCtx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
        canvasCtx.lineWidth = 1.5;
        canvasCtx.setLineDash([4, 4]);
        canvasCtx.beginPath();
        canvasCtx.moveTo(mouseX, 0);
        canvasCtx.lineTo(mouseX, alturaSueloEfectiva);
        canvasCtx.stroke();

        // 2. Dibujar tarjeta flotante (Tooltip)
        canvasCtx.font = 'bold 11px monospace';
        canvasCtx.setLineDash([]); // Quitar punteado para la caja
        const anchoTexto = canvasCtx.measureText(textoMedicion).width;
        const paddingX = 8;
        const anchoCaja = anchoTexto + (paddingX * 2);

        let cajaX = mouseX - (anchoCaja / 2);
        if (cajaX < 4) cajaX = 4;
        if (cajaX + anchoCaja > canvas.width - 4) cajaX = canvas.width - anchoCaja - 4;

        // Fondo de la tarjeta
        canvasCtx.fillStyle = 'rgba(9, 9, 11, 0.9)';
        canvasCtx.strokeStyle = '#22d3ee';
        canvasCtx.lineWidth = 1;
        canvasCtx.beginPath();
        canvasCtx.roundRect(cajaX, 15, anchoCaja, 22, 5);
        canvasCtx.fill();
        canvasCtx.stroke();

        // Texto de los hercios
        canvasCtx.fillStyle = '#22d3ee';
        canvasCtx.textAlign = 'center';
        canvasCtx.fillText(textoMedicion, cajaX + (anchoCaja / 2), 30);

        // Restaurar el lienzo para la siguiente ejecución limpia de las barras
        canvasCtx.restore();
    }
});

canvas.addEventListener('mouseleave', () => {
    mouseEnCanvas = false;
});

// Detectar el clic dentro del canvas para congelar/liberar el cursor
canvas.addEventListener('click', () => {
    if (!audioIniciado) return;

    // Si ya había un marcador fijo, el clic lo borra (resetea a -1)
    if (marcadorFijoX !== -1) {
        marcadorFijoX = -1;
    } else if (mouseEnCanvas && mouseX >= 0) {
        // Si el mouse está dentro, congelamos la posición X actual
        marcadorFijoX = mouseX;
    }
});