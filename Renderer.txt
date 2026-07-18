class Renderer {

    constructor(system){
        this.system = system;
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

// 1. GRILLA DE FONDO (Debe ir primero para que todo se dibuje encima)
        this.drawGrid();

        // 1. Dibujar la esfera y las agujas del reloj DEBAJO de la mecánica
        this.drawClockDial();
        this.drawClockHands();

        // 2. Dibujar la mecánica
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

        // 3. Escape y Péndulo (El áncora debe ir antes que el péndulo)
        this.drawAnchors(); 
        this.drawPendulums(); 
      
        this.drawShafts();
        
        pop();
    }

    drawShafts(){
        for(let shaft of this.system.shafts){
                this.drawShaft(shaft);
        }
    }

    drawShaft(shaft){    
        push();
        translate(shaft.x, shaft.y);
        
        // Solo dibujar agujas sueltas si NO hemos creado la esfera del reloj aún
        if (!this.system.hourHandShaft) {
            
            // ---> AGUJA DE LOS SEGUNDOS <---
            let isEscapeShaft = false;
            for (let esc of this.system.escapements) {
                if (esc.escapeGear.shaft === shaft) isEscapeShaft = true;
            }
            if (isEscapeShaft) {
                rotate(shaft.angle);
                stroke(200, 0, 0); fill(200, 0, 0); noStroke();
                strokeWeight(2); line(0, 0, 0, -60);
                strokeWeight(3); line(0, 0, 0, 15);
                rotate(-shaft.angle); 
            }

            // ---> AGUJA DE LOS MINUTOS <---
            if (this.system.minuteHandShaft === shaft) {
                rotate(shaft.angle);
                stroke(0, 0, 200); fill(0, 0, 200); noStroke();
                strokeWeight(3); line(0, 0, 0, -45);
                strokeWeight(4); line(0, 0, 0, 10);
                rotate(-shaft.angle); 
            }

            // ---> AGUJA DE LAS HORAS <---
            if (this.system.hourHandShaft === shaft) {
                rotate(shaft.angle);
                stroke(0, 180, 0); fill(0, 180, 0); noStroke();
                strokeWeight(4); line(0, 0, 0, -25);
                strokeWeight(5); line(0, 0, 0, 8);
                rotate(-shaft.angle); 
            }
        }
        // ---> FIN BLOQUE DE AGUJAS SUELTAS <---

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
    }
  
    drawGears(){
        for(let gear of this.system.gears){
            this.drawGear(gear);
        }
    }

    drawGear(gear){
        push();
        translate(gear.x, gear.y);
        rotate(gear.angle);
        
        if (gear.teeth > 40) {
            // --- ENGRANAJES GRANDES (Optimizados) ---
            noFill();
            stroke(180);
            strokeWeight(1);
            circle(0, 0, gear.pitchRadius * 2);
            circle(0, 0, gear.outsideRadius * 2);
            
            // Si está apilado, dibujar el interior ligeramente sombreado
            if (gear.shaft.components.length > 1) {
                fill(220, 220, 220, 100); // Semi-transparente
                stroke(0);
                strokeWeight(1);
                circle(0, 0, gear.rootRadius * 2);
            } else {
                fill(220, 220, 220, 150);
                stroke(0);
                strokeWeight(1);
                circle(0, 0, gear.rootRadius * 2);
            }
        } else {
            // --- ENGRANAJES NORMALES ---
            rectMode(CENTER);
            let step = TWO_PI / gear.teeth;
            stroke(0);
            strokeWeight(1);
            fill(220);
            for (let i = 0; i < gear.teeth; i++) {
                push();
                rotate(i * step);
                rectMode(CENTER);
                rect((gear.rootRadius + gear.outsideRadius) / 2, 0, gear.outsideRadius - gear.rootRadius, gear.module * 1.35);
                pop();
            }

            // ---> INICIO LA LÓGICA DEL ANILLO <---
            if (gear.shaft.components.length > 1) {
                // Hay más componentes en este eje. 
                // Dibujar el cuerpo como un anillo hueco para no tapar lo que está debajo
                noFill(); 
                stroke(0);
                strokeWeight(1);
                circle(0, 0, gear.rootRadius * 2);
                
                // Añadir línea punteada en el Pitch Radius (estilo plano técnico)
                drawingContext.setLineDash([4, 4]); // Línea a rayas
                stroke(100, 100, 255); // Azul claro
                circle(0, 0, gear.pitchRadius * 2);
                drawingContext.setLineDash([]); // Restaurar línea sólida
            } else {
                // Es el único componente. Dibujado sólido normal.
                fill(220);
                stroke(0);
                strokeWeight(1);
                circle(0, 0, gear.rootRadius * 2);
            }
            // ---> FIN LA LÓGICA DEL ANILLO <---
        }

        // Testigo visual: Un punto rojo SOLO en la rueda de escape
        let isEscapeGear = this.system.escapements.some(esc => esc.escapeGear === gear);
        if (isEscapeGear) {
            fill(255, 0, 0);
            noStroke();
            circle(gear.outsideRadius - 5, 0, 10);
        }

        noFill();
        pop();    
    }

    drawMeshes(){
        for(let mesh of this.system.meshes){
            if(mesh.isValid) stroke(180);
            else stroke(255,0,0);
            strokeWeight(2);
            line(mesh.driver.x, mesh.driver.y, mesh.driven.x, mesh.driven.y);
        }
    }

    drawBelt(belt) {
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
        for (const belt of this.system.belts) {
            this.drawBelt(belt);
        }
    }

    drawPulley(pulley) {
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
        for (const pulley of this.system.pulleys) {
            this.drawPulley(pulley);
        }
    }

    drawGuides() {
        for (let guide of this.system.guides) {
            this.drawGuide(guide);
        }
    }

    drawGuide(guide) {
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
        for (let rack of this.system.racks) {
            this.drawRack(rack);
        }
    }

    drawRack(rack) {
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
        for (let mesh of this.system.rackMeshes) {
            if(mesh.isValid) stroke(0, 150, 0); 
            else stroke(255, 0, 0);
            strokeWeight(2);
            line(mesh.pinion.x, mesh.pinion.y, mesh.rack.x, mesh.rack.y);
        }
    }

    drawCarriers() {
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
        for (let annulus of this.system.annuli) {
            push();
            translate(annulus.x, annulus.y);
            
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
        for (let esc of this.system.escapements) {
            this.drawAnchor(esc);
        }
    }

    drawAnchor(esc) {
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

    drawClockDial() {
        // Solo dibujar la esfera si existe el tren de horas
        if (!this.system.hourHandShaft) return; 
        
        let cx = this.system.hourHandShaft.x;
        let cy = this.system.hourHandShaft.y;
        let dialRadius = 55; // Tamaño de la esfera
        
        push();
        translate(cx, cy);
        
        // 1. El cristal de la esfera (fondo blanco semi-transparente)
        fill(255, 255, 255, 220); 
        stroke(40);
        strokeWeight(3);
        circle(0, 0, dialRadius * 2);
        
        // 2. Las marcas de los minutos (60 rayas)
        stroke(150);
        strokeWeight(1);
        for (let i = 0; i < 60; i++) {
            let angle = (i * TWO_PI / 60) - HALF_PI; // -HALF_PI para que el 0 sea arriba
            let r1 = dialRadius - 5;
            let r2 = dialRadius - 1;
            line(Math.cos(angle)*r1, Math.sin(angle)*r1, Math.cos(angle)*r2, Math.sin(angle)*r2);
        }
        
        // 3. Los números de las horas
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

    drawClockHands() {
        if (!this.system.hourHandShaft) return;
        
        let cx = this.system.hourHandShaft.x;
        let cy = this.system.hourHandShaft.y;
        
        let secAngle = (this.system.totalTicks % 60) * (TWO_PI / 60);
        // Sin signos negativos. El ángulo de p5.js ya es horario naturalmente.
        let minAngle = this.system.minuteHandShaft ? this.system.minuteHandShaft.angle : 0;
        let hourAngle = this.system.hourHandShaft.angle;
        
        push();
        translate(cx, cy);
        
        // Aguja de Horas (Verde)
        push();
        rotate(hourAngle - HALF_PI); 
        stroke(0, 150, 0);
        strokeWeight(6);
        strokeCap(ROUND);
        line(0, 0, 28, 0);
        pop();
        
        // Aguja de Minutos (Azul)
        push();
        rotate(minAngle - HALF_PI);
        stroke(0, 0, 200);
        strokeWeight(4);
        strokeCap(ROUND);
        line(0, 0, 42, 0);
        pop();
        
        // Aguja de Segundos (Roja)
        push();
        rotate(secAngle - HALF_PI); 
        stroke(200, 0, 0);
        strokeWeight(1.5);
        line(-8, 0, 48, 0);
        pop();
        
        fill(40);
        noStroke();
        circle(0, 0, 6);
        
        pop();
    }
}