class Carrier {
    constructor(system, centerShaft, attachedShaft) {
        this.system = system; // Referencia al sistema para buscar la corona
        this.centerShaft = centerShaft; 
        this.attachedShafts = [];
        this.angle = 0;
        this.omega = 0;
        this.isDriver = false;
        this.selected = false;

        let dx = attachedShaft.x - centerShaft.x;
        let dy = attachedShaft.y - centerShaft.y;
        this.armRadius = Math.sqrt(dx * dx + dy * dy);

        this.attachShaft(attachedShaft);
    }

    attachShaft(shaft) {
        shaft.relativeAngle = shaft.angle - this.angle;
        shaft.lockedByCarrier = true; 
        this.attachedShafts.push(shaft);
    }

    autoSolveVelocity() {
        let sunGear = this.centerShaft.components.find(c => c instanceof Gear);
        if(!sunGear) return;

        for (let shaft of this.attachedShafts) {
            let planetGear = shaft.components.find(c => c instanceof Gear);
            if (!planetGear) continue;

            // Buscar si este planeta está conectado a una corona
            let annulus = this.system.findAnnulusFor(shaft);

            let Z_s = sunGear.teeth;
            let omega_s = this.centerShaft.omega;

            if (annulus) {
                let Z_a = annulus.teeth;
                let omega_a = annulus.shaft.omega; // Normalmente 0 si está fija al chasis

                // ECUACIÓN DE WILLIS RESUELTA PARA EL CARRIER (w_c)
                // (w_s - w_c) / (w_a - w_c) = - Z_a / Z_s
                // Despejando w_c:
                this.omega = ( (omega_s * Z_a) + (omega_a * Z_s) ) / (Z_a + Z_s);
            } else {
                // Fallback: Si no hay corona, usa la lógica de 2 elementos que teníamos
                let Z_p = planetGear.teeth;
                let omega_p = shaft.omega;
                this.omega = ( (omega_s * Z_s) + (omega_p * Z_p) ) / (Z_s + Z_p);
            }
            break; 
        }
    }

    update(dt) {
        if (this.isDriver) {
            this.autoSolveVelocity();
        }

        this.angle += this.omega * dt;
        
        let cx = this.centerShaft.x;
        let cy = this.centerShaft.y;

        for (let shaft of this.attachedShafts) {
            shaft.relativeAngle += shaft.omega * dt;

            shaft.x = cx + this.armRadius * Math.cos(this.angle);
            shaft.y = cy + this.armRadius * Math.sin(this.angle);

            shaft.angle = this.angle + shaft.relativeAngle;
        }
    }
}