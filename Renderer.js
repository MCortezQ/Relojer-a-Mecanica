class Renderer {

    constructor(system){
        this.system = system;
        this.gearCache = {};
    }

    drawGrid() {
        // 1. Definir los tamaños de celda posibles
        let gridSizes = [10, 25, 50, 100, 200, 500];
        
        // 2. Encontrar qué tamaño se acerca más a 50px reales en pantalla
        let targetScreenSize = 50;
        let bestSize = gridSizes[0];
        let minDiff = Infinity;
        
        for (let size of gridSizes) {
            let screenSize = size * zoom;
            let diff = Math.abs(screenSize - targetScreenSize);
            if (diff < minDiff) {
                minDiff = diff;
                bestSize = size;
            }
        }
        
        // 3. Calcular los límites del espacio visible (Lo que ve la cámara)
        let halfW = (width / 2) / zoom;
        let halfH = (height / 2) / zoom;
        let minX = Math.floor((camX - halfW) / bestSize) * bestSize;
        let maxX = Math.ceil((camX + halfW) / bestSize) * bestSize;
        let minY = Math.floor((camY - halfH) / bestSize) * bestSize;
        let maxY = Math.ceil((camY + halfH) / bestSize) * bestSize;
        
        // 4. Estilos de la grilla
        stroke(255, 255, 255, 60); // Blanco semi-transparente
        strokeWeight(1 / zoom);    // El grosor no crece al hacer zoom
        
        // 5. Dibujar líneas verticales
        for (let x = minX; x <= maxX; x += bestSize) {
            line(x, minY, x, maxY);
        }
        
        // 6. Dibujar líneas horizontales
        for (let y = minY; y <= maxY; y += bestSize) {
            line(minX, y, maxX, y);
        }
        
        // 7. Dibujar los ejes principales (X=0, Y=0) más gruesos
        stroke(255, 255, 255, 120);
        strokeWeight(2 / zoom);
        line(0, minY, 0, maxY); // Eje Y
        line(minX, 0, maxX, 0); // Eje X
    }

    draw(){
        push();
        // ---> MATRIZ DE CÁMARA <---
        translate(width/2, height/2);
        scale(zoom);
        translate(-camX, -camY);

        // ---> INICIO CÁLCULO DE DELTA REAL <---
        // Guardamos los ángulos ACTUALES (que vienen del update de este frame)
        if (!this.prevAngles) this.prevAngles = {};
        let currentFrameAngles = {};
        for (let s of this.system.shafts) {
            currentFrameAngles[s.id] = s.angle;
        }
        // ---> FIN CÁLCULO DE DELTA REAL <---

        // 1. GRILLA DE FONDO
        this.drawGrid();

        // 2. LA ESFERA 
        this.drawClockDial();

        // 3. LA MECÁNICA COMPLETA
        this.drawMeshes();
        this.drawBelts();
        this.drawRackMeshes(); 
        this.drawAnnuli(); 
        this.drawGears();
        this.drawPulleys();
        this.drawRacks();    
        this.drawCarriers(); 
        this.drawShafts();
        this.drawGuides();

        // 4. ESCAPE Y PÉNDULO
        this.drawAnchors(); 
        this.drawPendulums(); 
      
        // 5. LAS AGUJAS
        this.drawClockHands();

        // ---> ACTUALIZAR HISTORIAL PARA EL SIGUIENTE FRAME <---
        // Al final del dibujado, guardamos estos ángulos como el "pasado" para el próximo frame
        this.prevAngles = currentFrameAngles;
        // ---------------------------------------------------
        
        pop();
        
        this.drawRulers(); // <--- AÑADIR ESTO
    }
  
    drawShafts(){
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }
      
        for(let shaft of this.system.shafts){
                this.drawShaft(shaft);
        }
    }

    drawShaft(shaft){
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }
      
        push();
        translate(shaft.x, shaft.y);
      
      // Dibujar el centro del eje
        strokeWeight(2);
        if (shaft.selected) {
            // Prioridad 1: Si está seleccionado, Rojo
            fill(255, 0, 0);
            stroke(0);
        } 
        else if (shaft.isDriver) {
            // Prioridad 2: Si es un motor, Amarillo/Naranja
            fill(255, 200, 0); // Un amarillo oro
            stroke(180, 120, 0); // Borde marrón oscuro
            strokeWeight(3); // Un poco más gordo para que resalte
        }
        else { fill(255); stroke(0); }
        circle(0,0,12);
        pop();  
        // Dibujar flecha de giro si el eje se está moviendo
        this.drawRotationIndicator(shaft);
    }
  
    drawGears(){     
        for(let gear of this.system.gears){
            this.drawGear(gear);
        }
    }

    drawGear(gear) {
        if (!gear.shaft) return;
    
        // ---> VISIBILIDAD DE PLANO <---
        let gPlane = (gear.plane !== undefined) ? gear.plane : 0;
        let isVisible = (activePlane === null || gPlane === activePlane);
        if (!isVisible) return;
    
        // ---> CACHE <---
        let hash = this.getGearHash(gear);
        
        // ✅ Solo regenerar si el hash cambió (geometría distinta) o no existe en caché.
        // (No usar un flag global "cacheDirty": si se pone en true y nunca se resetea,
        // esto se re-ejecuta en TODOS los frames para TODOS los engranajes, filtrando
        // un createGraphics() nuevo cada vez sin liberar el anterior — exactamente el
        // bug de la pantalla negra intermitente que ya se diagnosticó antes.)
        if (!this.gearCache[hash]) {  
            this.gearCache[hash] = this.renderGearToBuffer(gear);
        }
      
        // ---> DIBUJAR DESDE CACHE <---
        push();
        translate(gear.x, gear.y);
        rotate(gear.angle);
    
        // ✅ Colores según modo presentación
        if (presentationMode) {
            // Colores más vibrantes o brillantes (se aplican al dibujar desde cache)
            // Nota: El cache ya tiene los colores definidos en renderGearToBuffer()
            // Para el modo presentación, podrías querer regenerar el cache con otros colores
            // Por simplicidad, dejamos que el cache maneje los colores
        }
    
        let buffer = this.gearCache[hash];
        if (buffer) {
            let size = buffer.width;
            image(buffer, -size/2, -size/2);
        }
        
        pop();
    }
  
    drawMeshes(){
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }
      
        for(let mesh of this.system.meshes){
            if(mesh.isValid) stroke(180);
            else stroke(255,0,0);
            strokeWeight(2);
            line(mesh.driver.x, mesh.driver.y, mesh.driven.x, mesh.driven.y);
        }
    }

    drawBelt(belt) {
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }
      
        if (!belt.driverEntry || !belt.driverExit || !belt.drivenEntry || !belt.drivenExit) return;
    
        stroke(60);
        strokeWeight(2);
        noFill();
    
        line(belt.driverEntry.x, belt.driverEntry.y, belt.drivenEntry.x, belt.drivenEntry.y);
        line(belt.driverExit.x, belt.driverExit.y, belt.drivenExit.x, belt.drivenExit.y);
    
        const driver = belt.driver;
        const driven = belt.driven;
        const shaft1 = driver.shaft;
        const shaft2 = driven.shaft;
    
        arc(shaft1.x, shaft1.y, driver.radius * 2, driver.radius * 2,
            atan2(belt.driverEntry.y - shaft1.y, belt.driverEntry.x - shaft1.x),
            atan2(belt.driverExit.y - shaft1.y, belt.driverExit.x - shaft1.x));
    
        arc(shaft2.x, shaft2.y, driven.radius * 2, driven.radius * 2,
            atan2(belt.drivenExit.y - shaft2.y, belt.drivenExit.x - shaft2.x),
            atan2(belt.drivenEntry.y - shaft2.y, belt.drivenEntry.x - shaft2.x));
    }

    drawBelts() {
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }
      
        for (const belt of this.system.belts) {
            this.drawBelt(belt);
        }
    }

    drawPulley(pulley) {
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }
      
        if (!pulley) return;
        push();
        translate(pulley.x, pulley.y);
        rotate(pulley.angle);
        stroke(40);
        strokeWeight(2);
        fill(210);
        circle(0, 0, pulley.radius * 2);
        pop();
    } 

    drawPulleys() {
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }
      
        for (const pulley of this.system.pulleys) {
            this.drawPulley(pulley);
        }
    }

    drawGuides() {
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }
      
        for (let guide of this.system.guides) {
            this.drawGuide(guide);
        }
    }

    drawGuide(guide) {
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }
      
        push();
        translate(guide.x, guide.y);
        rotate(guide.angle);
        stroke(150);
        strokeWeight(2);
        line(-500, 0, 500, 0); 
        if (guide.selected) fill(255, 0, 0);
        else fill(100);
        noStroke();
        circle(0, 0, 10); 
        pop();
    }

    drawRacks() {
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }
      
        for (let rack of this.system.racks) {
            this.drawRack(rack);
        }
    }

    drawRack(rack) {
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }
      
        push();
        translate(rack.x, rack.y);
        if(rack.guide) rotate(rack.guide.angle); 
        
        stroke(0);
        strokeWeight(1);
        fill(200);
        
        let step = rack.pitch;
        rectMode(CORNER);
        rect(0, 0, rack.length, rack.thickness);
        
        for (let i = 0; i < rack.teeth; i++) {
            rect(i * step, -rack.addendum, step * 0.5, rack.addendum);
        }
        pop();
    }

    drawRackMeshes() {
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }
      
        for (let mesh of this.system.rackMeshes) {
            if(mesh.isValid) stroke(0, 150, 0); 
            else stroke(255, 0, 0);
            strokeWeight(2);
            line(mesh.pinion.x, mesh.pinion.y, mesh.rack.x, mesh.rack.y);
        }
    }

    drawCarriers() {
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }
      
        for(let carrier of this.system.carriers) {
            let cx = carrier.centerShaft.x;
            let cy = carrier.centerShaft.y;
            
            for(let shaft of carrier.attachedShafts) {
                push();
                stroke(carrier.selected ? color(230, 126, 34) : color(180, 130, 80));
                strokeWeight(carrier.selected ? 6 : 4);
                line(cx, cy, shaft.x, shaft.y);
                
                // Un pequeño círculo en el extremo para simular el rodamiento
                noFill();
                stroke(carrier.selected ? color(230, 126, 34) : color(180, 130, 80));
                circle(shaft.x, shaft.y, 20);
                pop();
            }
        }
    }

    drawAnnuli() {
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }
        
        for (let annulus of this.system.annuli) {
            push();
            translate(annulus.x, annulus.y);
            // ✅ AGREGADO: faltaba rotar segun annulus.angle -- por eso
            // la corona giraba bien en la fisica pero se vela siempre congelada.
            rotate(annulus.angle);
            
            // Dibujar el borde exterior sólido
            stroke(0);
            strokeWeight(2);
            fill(240);
            circle(0, 0, annulus.outsideRadius * 2);
            
            // Dibujar los dientes apuntando hacia adentro
            let step = TWO_PI / annulus.teeth;
            fill(240);
            for (let i = 0; i < annulus.teeth; i++) {
                push();
                rotate(i * step);
                rectMode(CORNER);
                // Se dibujan desde el radio de punta hacia afuera (hacia la raíz)
                rect(annulus.addendumRadius, -annulus.module * 0.6, 
                     annulus.rootRadius - annulus.addendumRadius, annulus.module * 1.2);
                pop();
            }
            
            // Limpiar el centro para que se vea el mecanismo interno
            fill(240); // Color de fondo de tu canvas
            noStroke();
            circle(0, 0, annulus.addendumRadius * 2);
            
            pop();
        }
    }

    drawPendulums() {
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }
      
        for (let pend of this.system.pendulums) {
            let sx = pend.shaft.x;
            let sy = pend.shaft.y;
            
            push();
            translate(sx, sy);
            rotate(pend.currentAngle);
            
            // Barra del péndulo
            stroke(80);
            strokeWeight(3);
            line(0, 0, 0, pend.length);
            
            // Lenteja (peso) en la punta
            fill(120, 100, 80); // Color bronce
            stroke(40);
            strokeWeight(1);
            circle(0, pend.length, 20);
            
            pop();
        }
    }  

    drawAnchors() {
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }      
        for (let esc of this.system.escapements) {
            // ✅ Dibujar según tipo
            if (esc.type === 'cylinder') {
                this.drawCylinderAnchor(esc);
            } else if (esc.type === 'detent') {
                this.drawDetentAnchor(esc);
            } else if (esc.type === 'verge') {
                this.drawVergeAnchor(esc);
            } else {
                this.drawSwissAnchor(esc);
            }
        }  
    }

    drawSwissAnchor(esc) {
        if (presentationMode) {
            // Colores más vibrantes o brillantes
            fill(255, 255, 255, 200);
            stroke(255, 255, 255, 150);
        } else {
            // Colores normales
            fill(220);
            stroke(0);
        }      
        let px = esc.pendulum.shaft.x;
        let py = esc.pendulum.shaft.y;
        let ex = esc.escapeGear.shaft.x;
        let ey = esc.escapeGear.shaft.y;
        let pAngle = esc.pendulum.shaft.angle;
        
        // ---> INICIO GEOMETRÍA DINÁMICA <---
        // Recalcular posición y tamaño en cada frame
        let dx = ex - px;
        let dy = ey - py;
        let liveDistance = Math.sqrt(dx*dx + dy*dy);
        let liveAngle = Math.atan2(dy, dx);
        let livePalletLength = esc.escapeGear.pitchRadius; // Se adapta si cambias los dientes
        // ---> FIN GEOMETRÍA DINÁMICA <---
        
        push();
        translate(px, py);
        rotate(pAngle);
        
        push();
        rotate(liveAngle); 
        
        // El brazo principal se detiene a un 65% del camino
        let armEnd = liveDistance * 0.65;
        stroke(60);
        strokeWeight(4);
        line(0, 0, armEnd, 0);
        
        // Matemática de precisión con datos en vivo
        let distToGearCenter = liveDistance - armEnd;
        let palletReach = distToGearCenter - livePalletLength; 
        
        // Paleta de Entrada (Roja)
        push();
        translate(armEnd, 0);
        rotate(-esc.palletSpread); 
        fill(180, 50, 50);
        noStroke();
        rectMode(CORNER);
        rect(0, -5, palletReach, 10, 2); 
        pop();
        
        // Paleta de Salida (Azul)
        push();
        translate(armEnd, 0);
        rotate(esc.palletSpread); 
        fill(50, 50, 180);
        noStroke();
        rectMode(CORNER);
        rect(0, -5, palletReach, 10, 2); 
        pop();
        
        pop(); // Cerrar dirección
        pop(); // Cerrar péndulo
    }  

    drawCylinderAnchor(esc) {
        let px = esc.pendulum.shaft.x;
        let py = esc.pendulum.shaft.y;
        let pAngle = esc.pendulum.shaft.angle;
        
        push();
        translate(px, py);
        rotate(pAngle);
        
        // Cilindro: una barra con un círculo en el extremo
        let armLength = esc.distanceToEscape * 0.6;
        stroke(100, 100, 150);
        strokeWeight(3);
        line(0, 0, armLength, 0);
        
        // Cilindro (círculo)
        fill(80, 80, 130, 150);
        noStroke();
        circle(armLength, 0, esc.cylinderRadius * 0.8);
        
        // Paleta de escape (pequeña)
        fill(180, 50, 50);
        rect(armLength + esc.cylinderRadius * 0.4, -4, 10, 8);
        
        pop();
    }
    
    drawDetentAnchor(esc) {
        // Dibujo para cronómetro (más minimalista)
        let px = esc.pendulum.shaft.x;
        let py = esc.pendulum.shaft.y;
        let pAngle = esc.pendulum.shaft.angle;
        
        push();
        translate(px, py);
        rotate(pAngle);
        
        let armLength = esc.distanceToEscape * 0.5;
        stroke(60, 60, 60);
        strokeWeight(2);
        line(0, 0, armLength, 0);
        
        // Detente (paleta simple)
        fill(50, 50, 180);
        noStroke();
        rect(armLength, -3, 15, 6);
        
        pop();
    }
    
    drawVergeAnchor(esc) {
        // Dibujo para verge (escape de reculada)
        let px = esc.pendulum.shaft.x;
        let py = esc.pendulum.shaft.y;
        let pAngle = esc.pendulum.shaft.angle;
        
        push();
        translate(px, py);
        rotate(pAngle);
        
        // Brazo en Y más abierto
        let armLength = esc.distanceToEscape * 0.7;
        stroke(150, 100, 50);
        strokeWeight(4);
        line(0, 0, armLength, 0);
        
        // Paletas verticales (característico del verge)
        fill(180, 100, 50);
        noStroke();
        rect(armLength, -8, 6, 16);
        
        // Paleta trasera
        rect(armLength - 10, -12, 6, 6);
        
        pop();
    }  

    drawClockHands() {
        // Dibujar CADA aguja física en el eje exacto donde está atornillada
        for (let hand of this.system.hands) {
            if (!hand.shaft) continue; // Seguridad por si está flotando en el limbo
            
            push();
            // Trasladarnos al centro del eje donde está montada esta aguja específica
            translate(hand.shaft.x, hand.shaft.y);
            
            // Rotar usando el ángulo FÍSICO de ese eje
            rotate(hand.shaft.angle - HALF_PI); 
            
            stroke(hand.color[0], hand.color[1], hand.color[2]);
            strokeWeight(hand.strokeW);
            strokeCap(ROUND);
            
            // Dibujar el rabito/contrapeso si lo tiene (ej. el segundero)
            if (hand.tailLength > 0) {
                line(-hand.tailLength, 0, 0, 0);
            }
            
            // Dibujar la aguja principal
            line(0, 0, hand.length, 0);
            
            pop();
        }
    }

    drawClockHands() {
        // Dibujar CADA aguja física en el eje exacto donde está atornillada
        for (let hand of this.system.hands) {
            if (!hand.shaft) continue; 
            
            push();
            translate(hand.shaft.x, hand.shaft.y);
            rotate(hand.shaft.angle - HALF_PI); 
            
            stroke(hand.color[0], hand.color[1], hand.color[2]);
            strokeWeight(hand.strokeW);
            strokeCap(ROUND);
            
            if (hand.tailLength > 0) {
                line(-hand.tailLength, 0, 0, 0);
            }
            
            line(0, 0, hand.length, 0);
            pop();
        }
    }
  
    drawRotationIndicator(shaft) {
        if (shaft.components.length === 0) return; 
        
        // Inicializar diccionarios de memoria si no existen
        if (!this.lastDeltaSign) this.lastDeltaSign = {};
        if (!this.lastMovementTime) this.lastMovementTime = {};

        // Calcular la diferencia de ángulo
        let prevA = this.prevAngles ? (this.prevAngles[shaft.id] || 0) : 0;
        let deltaAngle = shaft.angle - prevA;
        
        // Si hubo movimiento REAL en este frame (ej. el tick del escape)
        // NOTA: millis() aquí es intencional, no el bug de tiempo real vs. simulado que se
        // corrigió en Escapement/SwissLeverEscapement/CylinderEscapement. Esto es puramente
        // cosmético (cuánto dura visible una flecha de dirección en pantalla), no afecta la
        // física ni la hora que marca el reloj — no requiere tiempo simulado.
        if (Math.abs(deltaAngle) > 0.0001) {
            this.lastDeltaSign[shaft.id] = deltaAngle > 0 ? 1 : -1; // Guarda la dirección
            this.lastMovementTime[shaft.id] = millis();             // Guarda la hora del movimiento
        }
        
        // Si NO se ha movido en los últimos 2 segundos, apagar la flecha
        let lastMove = this.lastMovementTime[shaft.id] || 0;
        if (millis() - lastMove > 2000) return; 

        // Recuperar la dirección que recordamos
        let dir = this.lastDeltaSign[shaft.id];
        
        push();
        translate(shaft.x, shaft.y);
        
        let arrowRadius = 14; 
        let arcLength = PI * 1.5; 
        
        stroke(50, 50, 50, 200); 
        strokeWeight(2);
        noFill();
        
        let startAngle, endAngle, tipAngle, tangentAngle;
        
        if (dir > 0) {
            startAngle = -HALF_PI;
            endAngle = startAngle + arcLength;
            tipAngle = endAngle; 
            tangentAngle = tipAngle + HALF_PI; 
        } else {
            endAngle = HALF_PI;
            startAngle = endAngle - arcLength;
            tipAngle = startAngle; 
            tangentAngle = tipAngle - HALF_PI; 
        }
        
        arc(0, 0, arrowRadius * 2, arrowRadius * 2, startAngle, endAngle);
        
        fill(50, 50, 50, 200);
        noStroke();
        let tipX = cos(tipAngle) * arrowRadius;
        let tipY = sin(tipAngle) * arrowRadius;
        
        push();
        translate(tipX, tipY);
        rotate(tangentAngle);
        triangle(0, 0, -6, -3, -6, 3);
        pop();
        
        pop();
    }
  
    drawClockDial() {
        // Buscar físicamente dónde está la esfera
        let hourHand = this.system.hands.find(h => h.type === 'horario' && h.shaft);
        let minuteHand = this.system.hands.find(h => h.type === 'minutero' && h.shaft);
        let dialCenterShaft = hourHand ? hourHand.shaft : (minuteHand ? minuteHand.shaft : null);
        
        if (!dialCenterShaft) return; 
        
        let cx = dialCenterShaft.x;
        let cy = dialCenterShaft.y;
        let dialRadius = 55; 
        
        push();
        translate(cx, cy);
        
        fill(255, 255, 255, 220); 
        stroke(40);
        strokeWeight(3);
        circle(0, 0, dialRadius * 2);
        
        stroke(150);
        strokeWeight(1);
        for (let i = 0; i < 60; i++) {
            let angle = (i * TWO_PI / 60) - HALF_PI; 
            let r1 = dialRadius - 5;
            let r2 = dialRadius - 1;
            line(Math.cos(angle)*r1, Math.sin(angle)*r1, Math.cos(angle)*r2, Math.sin(angle)*r2);
        }
        
        fill(40);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(14);
        textStyle(BOLD);
        for (let i = 1; i <= 12; i++) {
            let angle = (i * TWO_PI / 12) - HALF_PI;
            let r = dialRadius - 15;
            text(i, Math.cos(angle)*r, Math.sin(angle)*r);
        }
        
        pop();
    }

    drawRulers() {
        push(); // Abrimos un contexto UI (no afectado por la cámara)

        // Fondos de las reglas
        fill(230, 230, 230, 220);
        noStroke();
        rect(0, 0, width, 20); // Regla superior
        rect(0, 0, 20, height); // Regla izquierda

        // Calcular el paso ideal basado en la legibilidad del texto (mínimo 50px entre números)
        let minScreenDist = 50; 
        let rawStep = minScreenDist / zoom;

        // Escudo de seguridad contra zooms extremos (Infinity o 0)
        if (!isFinite(rawStep) || rawStep <= 0) rawStep = 50; 

        // Algoritmo "1-2-5" para encontrar el múltiplo entero más bonito
        let exponent = Math.floor(Math.log10(rawStep));
        let fraction = rawStep / Math.pow(10, exponent);
        
        let niceFraction;
        if (fraction <= 1.0) niceFraction = 1;
        else if (fraction <= 2.0) niceFraction = 2;
        else if (fraction <= 5.0) niceFraction = 5;
        else niceFraction = 10;

        let baseStep = niceFraction * Math.pow(10, exponent);
        
        // Forzar estrictamente a un número entero limpio, con un mínimo absoluto de 1
        baseStep = Math.max(1, Math.round(baseStep));

        // Límites del mundo que se ven en la pantalla
        let worldLeft = (0 - width/2) / zoom + camX;
        let worldRight = (width - width/2) / zoom + camX;
        let worldTop = (0 - height/2) / zoom + camY;
        let worldBottom = (height - height/2) / zoom + camY;

        stroke(150);
        strokeWeight(1);
        fill(50);
        textSize(9);
        textFont('monospace'); // Fuente monoespaciada para que los números no bailen

        // --- REGLA SUPERIOR (Eje X) ---
        textAlign(CENTER, TOP);
        let startX = Math.floor(worldLeft / baseStep) * baseStep;
        for (let x = startX; x <= worldRight; x += baseStep) {
            let sx = (x - camX) * zoom + width/2;
            if (sx < 25 || sx > width) continue; // No dibujar debajo de la regla Y
            
            line(sx, 15, sx, 20); // Marca
            text(Math.round(x), sx, 3); // Número entero
        }

        // --- REGLA IZQUIERDA (Eje Y) ---
        textAlign(RIGHT, CENTER);
        let startY = Math.floor(worldTop / baseStep) * baseStep;
        for (let y = startY; y <= worldBottom; y += baseStep) {
            let sy = (y - camY) * zoom + height/2;
            if (sy < 25 || sy > height) continue; // No dibujar debajo de la regla X
            
            line(15, sy, 20, sy); // Marca
            text(Math.round(y), 18, sy); // Número entero
        }

        pop(); // Cerrar contexto UI
    }
 
    getGearHash(gear) {
        // Hash que cambia SOLO cuando la geometría del engranaje cambia
        // El ángulo NO se incluye porque se aplica con rotate() al dibujar
        return `${gear.id}-${gear.teeth}-${gear.module}-${gear.plane}`;
//        return `${gear.id}-${gear.teeth}-${gear.module}-${gear.plane}-${gear.shaft ? gear.shaft.id : 'null'}`;
    }  

    invalidateCache() {
        for (let key in this.gearCache) {
            if (this.gearCache[key]) this.gearCache[key].remove();
        }
        this.gearCache = {};
    }
  
    renderGearToBuffer(gear) {
        // Crear buffer con tamaño suficiente
        let margin = 10;
        // ✅ Limitar el tamaño máximo del buffer
        let maxSize = 800;
        let size = Math.min((gear.outsideRadius + margin) * 2, maxSize);
        let buffer = createGraphics(size, size);
        buffer.clear();
        buffer.translate(size/2, size/2);
        
        // ---> DIBUJAR ENGRANAJE (lógica extraída de drawGear) <---
        if (gear.teeth > 40) {
            // ENGRANAJES GRANDES (Optimizados)
            buffer.noFill();
            buffer.stroke(180);
            buffer.strokeWeight(1);
            buffer.circle(0, 0, gear.pitchRadius * 2);
            buffer.circle(0, 0, gear.outsideRadius * 2);
            
            // Si está apilado, dibujar el interior ligeramente sombreado
            if (gear.shaft.components.length > 1) {
                buffer.fill(220, 220, 220, 100);
            } else {
                buffer.fill(220, 220, 220, 150);
            }
            buffer.stroke(0);
            buffer.strokeWeight(1);
            buffer.circle(0, 0, gear.rootRadius * 2);
        } else {
            // ENGRANAJES NORMALES
            buffer.rectMode(CENTER);
            let step = TWO_PI / gear.teeth;
            buffer.stroke(0);
            buffer.strokeWeight(1);
            buffer.fill(220);
            
            for (let i = 0; i < gear.teeth; i++) {
                buffer.push();
                buffer.rotate(i * step);
                buffer.rectMode(CENTER);
                buffer.rect((gear.rootRadius + gear.outsideRadius) / 2, 0, 
                            gear.outsideRadius - gear.rootRadius, gear.module * 1.35);
                buffer.pop();
            }
    
            // LÓGICA DEL ANILLO (engranajes apilados)
            let tangibleComponents = gear.shaft.components.filter(c => !(c instanceof Hand));
            
            if (tangibleComponents.length > 1) {
                buffer.noFill();
                buffer.stroke(0);
                buffer.strokeWeight(1);
                buffer.circle(0, 0, gear.rootRadius * 2);
                
                // Línea punteada en el Pitch Radius
                buffer.drawingContext.setLineDash([4, 4]);
                buffer.stroke(100, 100, 255);
                buffer.circle(0, 0, gear.pitchRadius * 2);
                buffer.drawingContext.setLineDash([]);
            } else {
                buffer.fill(220);
                buffer.stroke(0);
                buffer.strokeWeight(1);
                buffer.circle(0, 0, gear.rootRadius * 2);
            }
        }
        
        buffer.noFill();
        return buffer;
    }

    refresh() {
        this.invalidateCache(); // Libera los buffers viejos y fuerza regeneración real
    }  
 
}