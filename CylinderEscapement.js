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
        this.lastTickTime = 0;
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
        if (this.pendulum.isAtCenter()) {
            let now = millis();
            // ✅ El cilindro puede hacer tick más rápido (menos cooldown)
            if (now - this.lastTickTime > 150) {
                this.lastTickTime = now;
                this.doTick();
            }
        }
    }
    
    getSystemDirection() {
        let driver = this.system.shafts.find(s => s.isDriver);
        if (!driver || driver.omega === 0) return 0;
        if (driver === this.escapeGear.shaft) return Math.sign(driver.omega);

        let currentSign = Math.sign(driver.omega);
        let visited = new Set([driver]);
        let queue = [driver];
        let links = this.system.getLinks();

        while (queue.length > 0) {
            let current = queue.shift();
            if (current === this.escapeGear.shaft) return currentSign;

            for (let link of links) {
                let neighbor = null;
                if (link.driver.node === current) neighbor = link.driven.node;
                else if (link.driven.node === current) neighbor = link.driver.node;

                if (neighbor && !visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                    currentSign = Math.sign(currentSign * link.ratio());
                }
            }
        }
        return 1;
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