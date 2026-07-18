let system;
let renderer;
let panel;
let canvas;


// ---> INICIO SISTEMA DE CÁMARA <---
let camX;
let camY;
let zoom = 1;

// Convierte el pixel de la pantalla a la coordenada real del engranaje
function getWorldMouse() {
    return {
        x: (mouseX - width/2) / zoom + camX,
        y: (mouseY - height/2) / zoom + camY
    };
}
// ---> FIN SISTEMA DE CÁMARA <---

// ---> INICIO LÍMITE DE FÍSICA <---
const MAX_DT = 0.05; // Si un frame dura más de 50ms, lo cortamos a 50ms
// ---> FIN LÍMITE DE FÍSICA <---

//const MAX_DT = 0.05; 

// ---> INICIO CONFIGURACIÓN DE AUDIO GLOBAL <---
let audioCtx;
let soundType = 'square';    // 'sine', 'triangle', 'sawtooth', 'square', 'custom'
let soundFreq = 900;         // Frecuencia (400 a 2000)
let soundDecay = 0.04;       // Tiempo de caída en segundos (0.02 a 0.20)
let soundVolume = 0.4;       // Volumen pico (0.0 a 1.0)
// ---> FIN CONFIGURACIÓN DE AUDIO GLOBAL <---

function setup() {
    canvas = createCanvas(600, 500);
    canvas.mousePressed(canvasMousePressed);

    camX = width / 2;
    camY = height / 2;
 
    system = new MechanicalSystem();
    renderer = new Renderer(system);
    panel = new PropertyPanel(system);
}

// ---> INICIO MOTOR DE AUDIO DINÁMICO <---
function playTickSound() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const osc = audioCtx.createOscillator();
    
    // Si el usuario eligió la opción "custom" (Duty Cycle), generamos la onda personalizada
    if (soundType === 'custom') {
        const real = new Float32Array([0, 1, 0.1, 0.9, 0.1, 0.9, 0.1, 0.9]);
        const imag = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]);
        const wave = audioCtx.createPeriodicWave(real, imag, {disableNormalization: false});
        osc.setPeriodicWave(wave);
    } else {
        osc.type = soundType; // Usa la selección del panel
    }
    
    // Aplicar frecuencia configurada
    osc.frequency.setValueAtTime(soundFreq, audioCtx.currentTime);

    // Crear la envolvente (El golpe)
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(soundVolume, audioCtx.currentTime); 
    // Aplicar tiempo de caída configurado
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + soundDecay); 
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    // Durar el tiempo exacto de la caída + un pequeño margen
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + soundDecay + 0.02);
}
// ---> FIN MOTOR DE AUDIO DINÁMICO <---


function draw(){
    background('#8ABECF');

    // Cortar el deltaTime para evitar explosiones matemáticas
    let safeDt = min(deltaTime/1000, MAX_DT); 

  system.update(deltaTime/1000);
    renderer.draw();
}

//*************************************
function canvasMousePressed(){
    let worldMouse = getWorldMouse(); // <--- NUEVO

    if(system.connectionMode){
        let targetComp = system.findClosestComponentAt(worldMouse.x, worldMouse.y); // <--- CAMBIO
        if(targetComp && targetComp instanceof Gear && targetComp !== system.connectionSourceGear){
            system.connectGears(system.connectionSourceGear, targetComp);
        }
        system.endConnection();
        panel.clearActiveStyles();
        return;
    }

    if(system.pulleyConnectionMode){
        let targetComp = system.findClosestComponentAt(worldMouse.x, worldMouse.y); // <--- CAMBIO
        if(targetComp && targetComp instanceof Pulley && targetComp !== system.connectionSourcePulley){
            system.connectPulleys(system.connectionSourcePulley, targetComp, false);
        }
        system.endPulleyConnection();
        panel.clearActiveStyles();
        return;
    }

    if(system.rackConnectionMode){
        let targetRack = system.findRackAt(worldMouse.x, worldMouse.y); // <--- CAMBIO
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
  
    let selectedNode = system.findShaftAt(worldMouse.x, worldMouse.y); // <--- CAMBIO
    if(!selectedNode) {
        selectedNode = system.findGuideAt(worldMouse.x, worldMouse.y); // <--- CAMBIO
    }

    panel.clearActiveStyles();
    panel.setSelection(selectedNode);
    if(selectedNode){
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

    let worldMouse = getWorldMouse(); // <--- NUEVO
    if(system.draggedShaft && system.draggedShaft.isDriver){
        system.dragRigidly(worldMouse.x, worldMouse.y); // <--- CAMBIO
    } else {
        system.dragTo(worldMouse.x, worldMouse.y); // <--- CAMBIO
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