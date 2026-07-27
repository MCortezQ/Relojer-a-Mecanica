let system;
let renderer;
let panel;
let canvas;
let camX;      //Cámara
let camY;      //Cámara
let zoom = 1;  //Cámara
let xrayMode = false;
let activePlane = null; 
let presentationMode = false;
let presentationBtn;
let comparisonMode = false;
let comparisonSystem = null;
let comparisonRenderer = null;
let comparisonBtn;

// Convierte el pixel de la pantalla a la coordenada real del engranaje
function getWorldMouse() {
    return {
        x: (mouseX - width/2) / zoom + camX,
        y: (mouseY - height/2) / zoom + camY
    };
}

const MAX_DT = 0.05; // (histórico, ya no se usa para cortar la física; ver acumulador abajo)

// ---> INICIO ACUMULADOR DE FÍSICA (recuperación de tiempo perdido) <---
// Antes: dt se recortaba a 50ms por frame y el resto del tiempo real se descartaba.
// Si el navegador tira un frame largo (pestaña en 2do plano, lag, laptop en reposo),
// ese tiempo real desaparecía sin simularse: el reloj se quedaba atrás sin recuperarlo jamás.
// Ahora: acumulamos el tiempo real transcurrido y lo consumimos en pasos fijos pequeños,
// tantos como haga falta por frame (con un tope para no congelar el navegador si el hueco fue enorme).
const FIXED_DT = 1 / 120;                 // Paso de física fijo (más estable numéricamente que el dt variable anterior)
const MAX_CATCHUP_SECONDS = 1.0;          // Tope de tiempo real que se intenta recuperar de una sola vez
const MAX_STEPS_PER_FRAME = Math.ceil(MAX_CATCHUP_SECONDS / FIXED_DT);
let physicsAccumulator = 0;
// ---> FIN ACUMULADOR DE FÍSICA <---

// ---> INICIO CONFIGURACIÓN DE AUDIO GLOBAL <---
let audioCtx;
let soundType = 'square';    // 'sine', 'triangle', 'sawtooth', 'square', 'custom'
let soundFreq = 900;         // Frecuencia (400 a 2000)
let soundDecay = 0.04;       // Tiempo de caída en segundos (0.02 a 0.20)
let soundVolume = 0.4;       // Volumen pico (0.0 a 1.0)
let soundFreqTick = 1200;    // Frecuencia para "tic" (más agudo)
let soundFreqTock = 800;     // Frecuencia para "toc" (más grave)
let tickCounter = 0;         // Para alternar tic/toc
// ---> FIN CONFIGURACIÓN DE AUDIO GLOBAL <---

function setup() {
    canvas = createCanvas(600, 550);
    canvas.mousePressed(canvasMousePressed);

    camX = width / 2;
    camY = height / 2;
 
    system = new MechanicalSystem();// ✅ También exponerlo en window para la consola
    window.system = system;
    renderer = new Renderer(system);
    window.renderer = renderer;    // ✅ NUEVO: Exponer renderer globalmente
    panel = new PropertyPanel(system);
    window.panel = panel;

    comparisonBtn = createButton('📊 Comparar');
    comparisonBtn.position(10, 40);
    comparisonBtn.style('background', '#8e44ad');
    comparisonBtn.style('color', 'white');
    comparisonBtn.style('padding', '8px 16px');
    comparisonBtn.style('border', 'none');
    comparisonBtn.style('border-radius', '4px');
    comparisonBtn.style('cursor', 'pointer');
    comparisonBtn.style('z-index', '100');
    comparisonBtn.mousePressed(toggleComparisonMode);  

/*
    // Agregar botón de prueba
    let testBtn = createButton('🧪 Ejecutar Pruebas');
    testBtn.position(620, 520); // Ajusta la posición según tu UI
    testBtn.style('background', '#2c3e50');
    testBtn.style('color', 'white');
    testBtn.style('padding', '8px 16px');
    testBtn.style('border', 'none');
    testBtn.style('border-radius', '4px');
    testBtn.style('cursor', 'pointer');
    testBtn.style('z-index', '100');
    testBtn.mousePressed(() => {
        // Llamar a la función de prueba
        if (typeof testRenderCache  === 'function') {
            testRenderCache ();
        } else {
            console.error("❌ La función de prueba no está definida.");
            console.log("💡 Asegúrate de que el script de pruebas esté cargado.");
        }
    });
*/  
}

// ---> INICIO MOTOR DE AUDIO DINÁMICO <---
function playTickSound() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const osc = audioCtx.createOscillator();
    
    // ✅ ALTERNAR TIC/TOC
    tickCounter++;
    let isTick = tickCounter % 2 === 1;  // Impar = tic, Par = toc
    let freq = isTick ? soundFreqTick : soundFreqTock;
    
    // Configurar forma de onda
    if (soundType === 'custom') {
        const real = new Float32Array([0, 1, 0.1, 0.9, 0.1, 0.9, 0.1, 0.9]);
        const imag = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]);
        const wave = audioCtx.createPeriodicWave(real, imag, {disableNormalization: false});
        osc.setPeriodicWave(wave);
    } else {
        osc.type = soundType;
    }
    
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    // Envolvente
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(soundVolume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + soundDecay);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + soundDecay + 0.02);
}
// ---> FIN MOTOR DE AUDIO DINÁMICO <---

function draw() {
    if (comparisonMode && comparisonSystem && comparisonRenderer) {
        // --- MODO COMPARATIVO ---
        background('#1a1a2e');
        
        let halfWidth = width / 2;
        
        // ==========================================
        // LADO IZQUIERDO: Sistema original
        // ==========================================
        push();
        drawingContext.save();
        drawingContext.beginPath();
        drawingContext.rect(0, 0, halfWidth, height);
        drawingContext.clip();
        
        // Matriz de cámara para el sistema original
        translate(halfWidth/2, height/2);
        scale(zoom);
        translate(-camX, -camY);
        
        // Renderizar sistema original COMPLETO
        renderer.drawGrid();
        renderer.drawClockDial();
        renderer.drawMeshes();
        renderer.drawBelts();
        renderer.drawRackMeshes();
        renderer.drawAnnuli();
        renderer.drawGears();
        renderer.drawPulleys();
        renderer.drawRacks();
        renderer.drawCarriers();
        renderer.drawShafts();
        renderer.drawGuides();
        renderer.drawAnchors();
        renderer.drawPendulums();
        renderer.drawClockHands();
        
        drawingContext.restore();
        pop();
        
        // ==========================================
        // LADO DERECHO: Sistema comparativo
        // ==========================================
        push();
        drawingContext.save();
        drawingContext.beginPath();
        drawingContext.rect(halfWidth, 0, halfWidth, height);
        drawingContext.clip();
        
        translate(halfWidth + halfWidth/2, height/2);
        scale(zoom);
        translate(-camX, -camY);
        
        // Renderizar sistema comparativo COMPLETO
        comparisonRenderer.drawGrid();
        comparisonRenderer.drawClockDial();
        comparisonRenderer.drawMeshes();
        comparisonRenderer.drawBelts();
        comparisonRenderer.drawRackMeshes();
        comparisonRenderer.drawAnnuli();
        comparisonRenderer.drawGears();
        comparisonRenderer.drawPulleys();
        comparisonRenderer.drawRacks();
        comparisonRenderer.drawCarriers();
        comparisonRenderer.drawShafts();
        comparisonRenderer.drawGuides();
        comparisonRenderer.drawAnchors();
        comparisonRenderer.drawPendulums();
        comparisonRenderer.drawClockHands();
        
        drawingContext.restore();
        pop();
        
        // --- LÍNEA DIVISORIA ---
        stroke(255, 255, 255, 100);
        strokeWeight(2);
        line(halfWidth, 0, halfWidth, height);
        
        // --- ETIQUETAS ---
        fill(255);
        noStroke();
        textAlign(CENTER, TOP);
        textSize(14);
        text("🔵 Original", halfWidth/2, 10);
        text("🟣 Comparación", halfWidth + halfWidth/2, 10);
        
        // --- INFO DE VELOCIDAD ---
        textSize(10);
        textAlign(CENTER, BOTTOM);
        let origMotor = system.shafts.find(s => s.isDriver);
        let compMotor = comparisonSystem.shafts.find(s => s.isDriver);
        if (origMotor) {
            text("ω: " + origMotor.omega.toFixed(2), halfWidth/2, height - 10);
        }
        if (compMotor) {
            text("ω: " + compMotor.omega.toFixed(2), halfWidth + halfWidth/2, height - 10);
        }
        
        return; // ✅ Salir para no ejecutar el modo normal
    }
    
    // ==========================================
    // MODO NORMAL (sin cambios)
    // ==========================================
    if (presentationMode) {
        background('#1a1a2e');
    } else {
        background('#8ABECF');
    }
    
    // Tiempo real transcurrido este frame, acotado para no intentar recuperar horas de golpe
    let frameDt = Math.min(deltaTime / 1000, MAX_CATCHUP_SECONDS);
    physicsAccumulator += frameDt;

    let steps = 0;
    while (physicsAccumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
        system.update(FIXED_DT);
        physicsAccumulator -= FIXED_DT;
        steps++;
    }

    renderer.draw();
}

//*************************************
function canvasMousePressed(){
    let worldMouse = getWorldMouse(); // <--- NUEVO

    if(system.connectionMode){
        let targetComp = system.findClosestComponentAt(worldMouse.x, worldMouse.y);
        system.pushHistory(); // Guardar estado antes de conectar
        if(targetComp && targetComp instanceof Gear && targetComp !== system.connectionSourceGear){
            system.connectGears(system.connectionSourceGear, targetComp);
        }
        system.endConnection();
        panel.clearActiveStyles();
        return;
    }

    if(system.pulleyConnectionMode){
        let targetComp = system.findClosestComponentAt(worldMouse.x, worldMouse.y);
        system.pushHistory(); // Guardar estado antes de conectar
        if(targetComp && targetComp instanceof Pulley && targetComp !== system.connectionSourcePulley){
            system.connectPulleys(system.connectionSourcePulley, targetComp, false);
        }
        system.endPulleyConnection();
        panel.clearActiveStyles();
        return;
    }

    if(system.rackConnectionMode){
        let targetRack = system.findRackAt(worldMouse.x, worldMouse.y);
        system.pushHistory(); // Guardar estado antes de conectar
        if(targetRack && targetRack !== system.connectionSourcePinion){
            system.createRackPinionMesh(system.connectionSourcePinion, targetRack);
        }
        system.endRackConnection();
        panel.clearActiveStyles();
        return;
    }

    if(system.pendulumSelectionMode){
        // ---> CORRECCIÓN: Usar coordenadas del mundo, no de la pantalla <---
        let worldMouse = getWorldMouse();
        let targetShaft = system.findShaftAt(worldMouse.x, worldMouse.y);
        // -----------------------------------------------------------------
        
        let selectedPendulum = null;
        
        if(targetShaft) {
            selectedPendulum = system.pendulums.find(p => p.shaft === targetShaft);
        }

        if (selectedPendulum) {
            system.createEscapement(selectedPendulum.shaft, system.pendingEscapeGear);
        } else {
            console.warn("Selección cancelada. Debes hacer clic en un eje que tenga un péndulo.");
        }

        system.pendulumSelectionMode = false;
        system.pendingEscapeGear = null;
        panel.clearActiveStyles();
        panel.update(); 
        return;
    }
  
    // ---> INICIO LÓGICA COAXIAL <---
    let selectedNode = null;
    let coaxialShafts = system.findShaftsAt(worldMouse.x, worldMouse.y); 

    if (coaxialShafts.length > 1) {
        // Si el usuario ya había elegido uno de estos ejes previamente, 
        // no mostramos el menú, simplemente lo tratamos como el seleccionado para permitir arrastrarlo.
        if (panel.selectedNode && coaxialShafts.includes(panel.selectedNode)) {
            selectedNode = panel.selectedNode;
        } else {
            // Si es un clic fresco en un punto con múltiples ejes, mostramos el menú
            panel.showCoaxialSelector(coaxialShafts);
            return; 
        }
    } else if (coaxialShafts.length === 1) {
        // Caso normal: Solo hay un eje
        selectedNode = coaxialShafts[0];
    } else {
        // Caso vacío: No hay ejes, buscamos guías lineales
        selectedNode = system.findGuideAt(worldMouse.x, worldMouse.y);
    }
    // ---> FIN LÓGICA COAXIAL <---
    panel.clearActiveStyles();
    panel.setSelection(selectedNode);

  if(selectedNode){
        system.pushHistory(); // Guardar estado antes de conectar
        if(!system.isAttachedToCarrier(selectedNode)){
            system.beginDrag(selectedNode);
        }
    }
}

function mouseReleased(){
    if(system.draggedShaft && !system.draggedShaft.isDriver){
        for(let mesh of system.meshes){
            let fixedShaft = null;
            if(mesh.driver.shaft === system.draggedShaft) fixedShaft = mesh.driven.shaft;
            else if(mesh.driven.shaft === system.draggedShaft) fixedShaft = mesh.driver.shaft;
            if(fixedShaft) system.restoreMesh(mesh, fixedShaft);
        }
    }
    system.endDrag();
    system.afterGeometryChange();
}

function mouseDragged(){
    // ---> INICIO PANEADO CON SHIFT <---
    // Si mantienes pulsado "Shift" y arrastras, mueves la cámara
    if (keyIsDown(SHIFT)) {
        let dx = (mouseX - pmouseX) / zoom;
        let dy = (mouseY - pmouseY) / zoom;
        camX -= dx;
        camY -= dy;
        return; // No arrastra ejes si estamos moviendo la cámara
    }
    // ---> FIN PANEADO CON SHIFT <---

    let worldMouse = getWorldMouse();

        // Si el eje está bloqueado, impedir el arrastre con mouse
        if (system.draggedShaft && system.draggedShaft.isLocked) return;  
    
    // ---> INICIO SNAP A ENTEROS (Para las reglas) <---
    let snapX = Math.round(worldMouse.x);
    let snapY = Math.round(worldMouse.y);
    // ---> FIN SNAP A ENTEROS <---

    if(system.draggedShaft && system.draggedShaft.isDriver){
        system.dragRigidly(snapX, snapY); // <--- Cambiado por snapX, snapY
    } else {
        system.dragTo(snapX, snapY); // <--- Cambiado por snapX, snapY
    }
    // ---> INICIO ACTUALIZACIÓN EN VIVO <---
    // Refresca solo el texto de la cabecera sin reconstruir los botones
    panel.updateNodeInfo();
    // ---> FIN ACTUALIZACIÓN EN VIVO <---
  
}

// ---> INICIO ZOOM CON RUEDA <---
function mouseWheel(event) {
    // Filtrar: Solo actuar si el mouse está dentro del canvas
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
        
        let factor = event.delta > 0 ? 0.9 : 1.1;
        
        // Zoom centrado en el mouse
        let worldBefore = getWorldMouse();
        zoom *= factor;
        zoom = constrain(zoom, 0.1, 5); // Límites de zoom
        let worldAfter = getWorldMouse();
        
        camX -= (worldAfter.x - worldBefore.x);
        camY -= (worldAfter.y - worldBefore.y);
        
        return false; // Previene el scroll SOLO cuando estamos sobre el canvas
    }
    // Si el mouse está fuera del canvas, no devuelve false, 
    // por lo que el navegador permite hacer scroll en la página normalmente.
}
// ---> FIN ZOOM CON RUEDA <---

// ---> INICIO ATAJO CTRL+Z <---
function keyPressed() {
    // 90 es el código de la tecla 'Z'
    if (keyCode === 90 && (keyIsDown(CONTROL) || keyIsDown(91))) { // 91 es la tecla Cmd en Mac
        if (system.undo()) {
            // Si el sistema logró deshacer, limpiamos la selección del panel
            panel.setSelection(null);
        }
        // Prevenir el comportamiento por defecto del navegador (ej. ir atrás en el historial web)
        return false; 
    }
    if (key === 'p' || key === 'P') {
        togglePresentationMode();
    }  
}
// ---> FIN ATAJO CTRL+Z <---

// Función toggle
function togglePresentationMode() {
    presentationMode = !presentationMode;
    
    if (presentationMode) {
        // Ocultar panel
        if (panel && panel.container) {
            panel.container.hide();
        }
        
        // Cambiar fondo
        document.body.style.background = '#1a1a2e';
        
        // Zoom automático
        autoZoomToFit();
        
        // Expandir canvas
        resizeCanvas(windowWidth - 20, windowHeight - 20);
        
        console.log("🎬 Modo presentación activado");
    } else {
        // Mostrar panel
        if (panel && panel.container) {
            panel.container.show();
        }
        
        // Restaurar fondo
        document.body.style.background = '';
        
        // Restaurar canvas
        resizeCanvas(600, 500);
        
        // Restaurar cámara
        camX = width / 2;
        camY = height / 2;
        zoom = 1;
        
        console.log("🎬 Modo presentación desactivado");
    }
    if (window.renderer) {
        renderer.invalidateCache(); // ✅ Forzar regeneración con nuevos colores
    }  
}

function autoZoomToFit() {
    if (system.shafts.length === 0) return;
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (let s of system.shafts) {
        minX = Math.min(minX, s.x);
        maxX = Math.max(maxX, s.x);
        minY = Math.min(minY, s.y);
        maxY = Math.max(maxY, s.y);
    }
    
    let ancho = maxX - minX;
    let alto = maxY - minY;
    let padding = 100;
    
    let zoomX = (windowWidth - padding * 2) / (ancho + padding * 2);
    let zoomY = (windowHeight - padding * 2) / (alto + padding * 2);
    zoom = Math.min(zoomX, zoomY, 5);
    zoom = Math.max(zoom, 0.1);
    
    camX = (minX + maxX) / 2;
    camY = (minY + maxY) / 2;
}

function toggleComparisonMode() {
    comparisonMode = !comparisonMode;
    
    if (comparisonMode) {
        // Crear copia del sistema
        comparisonSystem = new MechanicalSystem();
        let json = system.saveClockToJSON();
        comparisonSystem.loadClockFromJSON(json);
        comparisonRenderer = new Renderer(comparisonSystem);
        
        // ✅ Ocultar el panel
        if (panel && panel.container) {
            panel.container.hide();
        }
        
        // ✅ Ocultar también el botón de presentación si está visible
        if (presentationBtn) {
            presentationBtn.hide();
        }
        
        // ✅ Mostrar botón de salir
        if (comparisonBtn) {
            comparisonBtn.html('❌ Salir Comparación');
            comparisonBtn.style('background', '#c0392b');
            comparisonBtn.show();
        }
        
        // ✅ Ajustar canvas
        resizeCanvas(windowWidth - 20, windowHeight - 20);
        
    } else {
        // ✅ Restaurar panel
        if (panel && panel.container) {
            panel.container.show();
            // Restaurar posición original si es necesario
            if (panel.originalX !== undefined) {
                panel.container.position(panel.originalX, panel.originalY);
            }
        }
        
        // ✅ Restaurar botón de presentación
        if (presentationBtn) {
            presentationBtn.show();
        }
        
        // ✅ Restaurar botón de comparación
        if (comparisonBtn) {
            comparisonBtn.html('📊 Comparar');
            comparisonBtn.style('background', '#8e44ad');
        }
        
        // ✅ Restaurar canvas
        resizeCanvas(600, 500);
        
        // Limpiar sistemas de comparación
        comparisonSystem = null;
        comparisonRenderer = null;
    }
}