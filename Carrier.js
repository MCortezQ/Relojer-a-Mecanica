class Carrier {
    constructor(system, centerShaft, attachedShaft) {
        this.system = system; // Referencia al sistema para buscar la corona
        this.centerShaft = centerShaft; 
        this.attachedShafts = [];
        this.omega = 0;
        this.isDriver = false;
        this.selected = false;
        // ✅ NUEVO: qué elemento es la entrada libre del sistema planetario.
        // 'motor'     -> el sol es la entrada (default, comportamiento de siempre).
        // 'corona'    -> la corona es la entrada. No requiere cambios acá: se
        //                logra seleccionando el eje de la corona y usando su
        //                propio botón de motor, igual que el sol — la fórmula
        //                de Willis de más abajo es simétrica en omega_s/omega_a.
        // 'traslacion'-> el PORTADOR es la entrada (this.omega lo fija el
        //                usuario directamente), y se deriva la corona.
        this.inputMode = 'motor';

        let dx = attachedShaft.x - centerShaft.x;
        let dy = attachedShaft.y - centerShaft.y;
        this.armRadius = Math.sqrt(dx * dx + dy * dy);
        // ✅ CORREGIDO: antes this.angle quedaba fijo en 0 sin importar dónde
        // estuviera el eje real, así que TODO carrier nuevo saltaba a la misma
        // posición angular (a la derecha del centro) en el primer update() —
        // por eso un segundo planeta se montaba encima del primero.
        this.angle = Math.atan2(dy, dx);

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

            // ✅ NUEVO: modo Traslación — el portador YA es la entrada libre,
            // this.omega lo fija el usuario directamente (ver PropertyPanel),
            // así que acá NO se deriva. Lo único que se deriva, si hay
            // corona, es SU velocidad (misma ecuación de Willis, despejada
            // para omega_a en vez de omega_c), para que su rotación dibujada
            // no quede inconsistente con el resto del tren.
            if (this.inputMode === 'traslacion') {
                if (annulus) {
                    let Z_a = annulus.teeth;
                    annulus.shaft.omega = this.omega - (Z_s / Z_a) * (omega_s - this.omega);
                }
                break;
            }

            // Modos 'motor' y 'corona': la fórmula es la MISMA en ambos casos
            // — lo único que cambia es cuál de omega_s/omega_a lo controla el
            // usuario (seleccionando el eje del sol o el de la corona y
            // usando su propio botón de motor) y cuál queda en 0 por defecto
            // si no está siendo accionado. Acá siempre se deriva el portador.
            if (annulus) {
                let Z_a = annulus.teeth;
                let omega_a = annulus.shaft.omega; // Normalmente 0 si está fija al chasis

                // ECUACIÓN DE WILLIS RESUELTA PARA EL CARRIER (w_c)
                // (w_s - w_c) / (w_a - w_c) = - Z_a / Z_s
                this.omega = ( (omega_s * Z_a) + (omega_a * Z_s) ) / (Z_a + Z_s);
            } else {
                // Fallback: sin corona, solo sol+planeta — indeterminado por
                // construcción (ver conversación: siempre da 0 algebraicamente).
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

        // ✅ CORREGIDO: shaft.omega (calculado por el Solver) asume un marco
        // fijo — es solo omega_sol * ratio, como si el carrier nunca rotara.
        // Eso es correcto SOLO mientras el carrier está quieto (this.omega=0);
        // por eso "sin orbitar, engrana perfecto". En cuanto el carrier orbita,
        // la velocidad de giro real del planeta respecto al sol cambia, y usar
        // shaft.omega directo hacía que los dientes se fueran desincronizando
        // (cruzándose) del sol/corona a medida que avanzaba la órbita.
        //
        // Fórmula correcta (método de Willis, velocidad relativa al carrier):
        //   omega_planeta_relativa = (omega_sol - omega_carrier) * (-Z_sol/Z_planeta)
        //   omega_planeta_lab      = omega_carrier + omega_planeta_relativa
        // shaft.angle ya suma this.angle (orbital) + relativeAngle más abajo,
        // así que aquí solo hace falta acumular relativeAngle con la
        // velocidad RELATIVA correcta, no con shaft.omega crudo.
        let sunGear = this.centerShaft.components.find(c => c instanceof Gear);

        for (let shaft of this.attachedShafts) {
            let planetGear = shaft.components.find(c => c instanceof Gear);

            if (sunGear && planetGear) {
                let relOmega = (this.centerShaft.omega - this.omega) * (-sunGear.teeth / planetGear.teeth);
                shaft.relativeAngle += relOmega * dt;
            } else {
                // Fallback defensivo si por algún motivo no hay engranaje (no debería pasar).
                shaft.relativeAngle += shaft.omega * dt;
            }

            shaft.x = cx + this.armRadius * Math.cos(this.angle);
            shaft.y = cy + this.armRadius * Math.sin(this.angle);

            shaft.angle = this.angle + shaft.relativeAngle;
        }
    }
}