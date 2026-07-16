class Escapement {
    
    constructor(pendulum, escapeGear, system) {
        this.pendulum = pendulum;
        this.escapeGear = escapeGear;
        this.system = system;
        this.lastTickTime = 0; 
        
        // Protección contra componentes fantasmas
        if (!escapeGear || !escapeGear.shaft) {
            console.error("ERROR: El componente no tiene un eje válido.");
            return null;
        }
        
        // Congelar la rueda de escape
        escapeGear.shaft.lockedByEscapement = true;

        // ---> INICIO GEOMETRÍA DEL ÁNCORA <---
        // Calcular vector desde el péndulo hasta la rueda de escape
        let dx = escapeGear.shaft.x - pendulum.shaft.x;
        let dy = escapeGear.shaft.y - pendulum.shaft.y;
        this.distanceToEscape = Math.sqrt(dx*dx + dy*dy);
        this.angleToEscape = Math.atan2(dy, dx);
        
        // Diseño de las paletas
        this.palletSpread = PI / 8; // Qué tan abierta está la "Y" (aprox 22 grados)
        this.palletLength = escapeGear.pitchRadius; // Tan larga como para tocar los dientes
        // ---> FIN GEOMETRÍA DEL ÁNCORA <---
        
        // Construir la lista completa del tren (hacia el motor y hacia abajo)
        this.rebuildConnectedTrain();
        
        //this.system.escapements.push(this);
    }



    // Ahora busca en todas direcciones (hacia el motor y hacia abajo)
    rebuildConnectedTrain() {
        this.connectedShafts = [];
        let visited = new Set();
        
        if (this.escapeGear && this.escapeGear.shaft) {
            this._findConnectedNodes(this.escapeGear.shaft, visited);
        }
    }

    // Búsqueda en profundidad (DFS) bidireccional
    _findConnectedNodes(shaft, visited) {
        if (visited.has(shaft)) return; 
        visited.add(shaft);
        this.connectedShafts.push(shaft);
        
        for (let link of this.system.getLinks()) {
            let otherShaft = null;
            
            // Mirar en AMBAS direcciones del enlace
            if (link.driver.node === shaft) {
                otherShaft = link.driven.node;
            } else if (link.driven.node === shaft) {
                otherShaft = link.driver.node;
            }
            
            if (otherShaft && !visited.has(otherShaft)) {
                this._findConnectedNodes(otherShaft, visited);
            }
        }
    }

    update(dt) {
        // Si el tiempo fue anómalo, no evaluar cruces
        if (dt > 0.033) return; 

        if (this.pendulum.isAtCenter()) {
            let now = millis(); 
            if (now - this.lastTickTime > 200) { 
                this.lastTickTime = now;
                this.doTick();
            }
        }
    }

  
    doTick() {
        for (let shaft of this.system.shafts) shaft.visited = false;
        
        let linksCache = this.system.getLinks(); 
        let initialStep = TWO_PI / this.escapeGear.teeth; 
        
        this.applyTickToTrain(this.escapeGear.shaft, initialStep, linksCache);
        
        // ---> INICIO IMPULSO ADAPTATIVO <---
        let currentSpeed = Math.abs(this.pendulum.angularVelocity);
        let targetSpeed = 2.5; 
        let energyDeficit = targetSpeed - currentSpeed;
        
        if (energyDeficit > 0) {
            let direction = Math.sign(this.pendulum.angularVelocity);
            if (direction === 0) direction = 1;
            let gainFactor = 1.8; 
            let impulse = energyDeficit * gainFactor;
            this.pendulum.angularVelocity += direction * impulse;
        }
        // ---> FIN IMPULSO ADAPTATIVO <---

        // ---> INICIO CONTADOR DE TIEMPO REAL <---
        this.system.totalTicks++;
        // ---> FIN CONTADOR DE TIEMPO REAL <---

         // ---> INICIO DISPARO DE SONIDO <---
                playTickSound(); // Llama a la función nativa
        // ---> FIN DISPARO DE SONIDO <---
      
        console.log("⏱️ TICK!");
    }

    // Ahora recibe el 'angleIncrement' exacto que debe aplicar este eje
    applyTickToTrain(shaft, angleIncrement, links) {
        if (shaft.visited) return;
        shaft.visited = true;

        // Aplicar el ángulo que le llegó por la cadena (no calcula nada por su cuenta)
        shaft.angle += angleIncrement;

        for (let i = 0; i < links.length; i++) {
            let link = links[i];
            let otherShaft = null;
            let nextIncrement = 0;

            if (link.driver.node === shaft) {
                otherShaft = link.driven.node;
                // El siguiente eje recibe mi incremento multiplicado por el ratio del enlace
                nextIncrement = angleIncrement * link.ratio();
            } 
            else if (link.driven.node === shaft) {
                otherShaft = link.driver.node;
                // Si vamos hacia atrás, el incremento se divide por el ratio
                nextIncrement = angleIncrement / link.ratio();
            }

            if (otherShaft && !otherShaft.visited) {
                if (otherShaft.lockedByCarrier) continue;
                this.applyTickToTrain(otherShaft, nextIncrement, links);
            }
        }
    }
}
