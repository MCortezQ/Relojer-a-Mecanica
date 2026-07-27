// ==========================================
// CYLINDER ESCAPEMENT - Escape de Cilindro
// ==========================================

class CylinderEscapement {
  
    constructor(pendulum, escapeGear, system) {
        // Validaciones (igual que Swiss)
        if (!pendulum || !pendulum.shaft) {
            console.error("❌ ERROR: Péndulo inválido");
            return null;
        }
        if (!escapeGear || !escapeGear.shaft) {
            console.error("❌ ERROR: Rueda de escape inválida");
            return null;
        }
        if (pendulum.shaft === escapeGear.shaft) {
            console.error("❌ ERROR: Péndulo y escape en el mismo eje");
            return null;
        }
        
        this.pendulum = pendulum;
        this.escapeGear = escapeGear;
        this.system = system;
        this.simTime = 0;       // Tiempo simulado acumulado (no depende del reloj real del navegador)
        this.lastTickTime = 0;  // Ahora medido en tiempo simulado, no en millis()
        this.type = 'cylinder';
        
        // ⚙️ GEOMETRÍA DEL CILINDRO
        let dx = escapeGear.shaft.x - pendulum.shaft.x;
        let dy = escapeGear.shaft.y - pendulum.shaft.y;
        this.distanceToEscape = Math.sqrt(dx*dx + dy*dy);
        this.angleToEscape = Math.atan2(dy, dx);
        
        // El cilindro tiene un ángulo de paletas más cerrado
        this.palletSpread = PI / 12; // ~15 grados
        this.impulseFactor = 0.8;    // Impulso más suave
        
        // El cilindro necesita dientes con perfil especial
        // (esto afecta la geometría visual)
        this.cylinderRadius = escapeGear.pitchRadius * 0.7;
        
        // Congelar la rueda de escape
        escapeGear.shaft.lockedByEscapement = true;
        
        this.rebuildConnectedTrain();
        console.log("✅ Escape de Cilindro creado correctamente.");

      console.log("🔴 applyTickToTrain() llamado desde:", this.constructor.name);
      
    }


    
    // ==========================================
    // MÉTODOS (igual que Swiss pero con variaciones)
    // ==========================================
    
    rebuildConnectedTrain() {
        this.connectedShafts = [];
        let visited = new Set();
        if (this.escapeGear && this.escapeGear.shaft) {
            this._findConnectedNodes(this.escapeGear.shaft, visited);
        }
    }
    
    _findConnectedNodes(shaft, visited) {
        if (visited.has(shaft)) return;
        visited.add(shaft);
        this.connectedShafts.push(shaft);
        
        for (let link of this.system.getLinks()) {
            let otherShaft = null;
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
        if (dt > 0.033) return;
        this.simTime += dt; // Avanza con el tiempo simulado, no con el reloj del navegador
        if (this.pendulum.isAtCenter()) {
            // 0.15s simulados (antes: 150ms reales vía millis()). Ver nota en SwissLeverEscapement.
            if (this.simTime - this.lastTickTime > 0.15) {
                this.lastTickTime = this.simTime;
                this.doTick();
            }
        }
    }
    
    // Se usa el omega que el Solver ya calculó para este eje (el "muro del escape"
    // deja pasar el cálculo, solo corta la propagación más allá). Ver nota extendida
    // en SwissLeverEscapement.getSystemDirection().
    getSystemDirection() {
        return Math.sign(this.escapeGear.shaft.omega);
    }
    
    doTick() {
        for (let shaft of this.system.shafts) shaft.visited = false;
        
        let direction = this.getSystemDirection();
        if (direction === 0) return;
        
        let linksCache = this.system.getLinks();
        let initialStep = (TWO_PI / this.escapeGear.teeth) * direction;
        
        this.applyTickToTrain(this.escapeGear.shaft, initialStep, linksCache);
        
        // ✅ Impulso del cilindro (más suave)
        let currentSpeed = Math.abs(this.pendulum.angularVelocity);
        let targetSpeed = 2.5;
        let energyDeficit = targetSpeed - currentSpeed;
        
        if (energyDeficit > 0) {
            let direction = Math.sign(this.pendulum.angularVelocity) || 1;
            let impulse = energyDeficit * 1.2; // Factor más suave
            this.pendulum.angularVelocity += direction * impulse;
        }
        
        this.system.totalTicks++;
        playTickSound();
        console.log("⏱️ TICK (Cilindro)!");
    }
    
    applyTickToTrain(shaft, angleIncrement, links) {
        if (shaft.visited) return;
        shaft.visited = true;
        shaft.angle += angleIncrement;

        for (let i = 0; i < links.length; i++) {
            let link = links[i];
            let otherShaft = null;
            let nextIncrement = 0;

            if (link.driver.node === shaft) {
                otherShaft = link.driven.node;
                nextIncrement = angleIncrement * link.ratio();
            } 
            else if (link.driven.node === shaft) {
                otherShaft = link.driver.node;
                nextIncrement = angleIncrement / link.ratio();
            }

            if (otherShaft && !otherShaft.visited) {
                if (otherShaft.lockedByCarrier) continue;
                this.applyTickToTrain(otherShaft, nextIncrement, links);
            }
        }
    }
}