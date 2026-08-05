class ComponentFactory {
    constructor(system) {
        this.system = system;
    }

    createShaft(x, y) {
        let shaft = new Shaft(x, y);
        this.system.shafts.push(shaft);
        return shaft;
    }

    createShaftAt(x, y) {
        return this.createShaft(x, y);
    }

    createGear(teeth, module, name = "", plane = 0) {    
        if (!name) {
            this.system.gearCounter++;
            name = "E" + this.system.gearCounter;
        }
        let gear = new Gear(null, teeth, module, name, plane);
        this.system.gears.push(gear);
        return gear;
    }

    createMesh(gearA, gearB) {
        if (gearA.plane !== gearB.plane) {
            console.error("Cannot mesh gears on different planes.");
            return null;
        }
        let mesh = new GearMesh(gearA, gearB);
        this.system.meshes.push(mesh);
        this.system.validateMesh(mesh);
        return mesh;
    }

    createBelt(driver, driven, crossed = false) {
        const belt = new Belt(driver, driven, crossed);
        this.system.belts.push(belt);
        return belt;
    }

    getNodes() {
        return [...this.system.shafts, ...this.system.guides];
    }

    createGuide(x, y, angle = 0) {
        let guide = new LinearGuide(x, y, angle);
        this.system.guides.push(guide);
        return guide;
    }

    createCarrier(centerShaft, planetShaft) {
        let carrier = new Carrier(this.system, centerShaft, planetShaft);
        this.system.carriers.push(carrier);
        return carrier;
    }

    findAnnulusFor(planetShaft) {
        for(let mesh of this.system.internalMeshes) {
            if(mesh.driver.shaft === planetShaft) return mesh.driven;
        }
        return null;
    }

    createHand(type = 'custom') {
        let hand = new Hand(type);
        // ✅ Asegurar que el ID se genera correctamente
        if (hand.id === undefined || hand.id === null) {
            hand.id = Hand.nextId++;
        }
        this.system.hands.push(hand);
        return hand;
    }

    mountHand(hand, shaft) {
        if (!shaft) {
            console.warn("Montaje fallido: Se requiere un eje válido.");
            return;
        }
        shaft.addComponent(hand);
        hand.shaft = shaft;
    }

    removeHand(hand) {
        if (hand.shaft) {
            let idx = hand.shaft.components.indexOf(hand);
            if (idx !== -1) hand.shaft.components.splice(idx, 1);
            hand.shaft = null;
        }
        let globalIdx = this.system.hands.indexOf(hand);
        if (globalIdx !== -1) this.system.hands.splice(globalIdx, 1);
    }

    createPendulum(shaft, length, amplitude, frequency) {
        let pendulum = new Pendulum(shaft, length || 150, amplitude || PI/6, frequency || 1);
        this.system.pendulums.push(pendulum);
        return pendulum;
    }

// Archivo: ComponentFactory.js

createEscapement(pendulumShaft, escapeGear, type = 'swiss') {
    console.log("🔧 Iniciando creación de escape...");
    
    // ==========================================
    // VALIDACIÓN 1: ¿Existe el péndulo?
    // ==========================================
    let pendulumObj = this.system.pendulums.find(p => p.shaft === pendulumShaft);
    if (!pendulumObj) {
        console.error("❌ ERROR: No hay ningún péndulo montado en el eje seleccionado.");
        console.warn("💡 Sugerencia: Añade un péndulo al eje antes de crear el escape.");
        return null;
    }
    
    // ==========================================
    // VALIDACIÓN 2: ¿Existe la rueda de escape?
    // ==========================================
    if (!escapeGear || !escapeGear.shaft) {
        console.error("❌ ERROR: El componente seleccionado no tiene un eje válido.");
        console.warn("💡 Sugerencia: Selecciona un engranaje montado en un eje.");
        return null;
    }
    
    // ==========================================
    // VALIDACIÓN 3: ¿El péndulo está en el mismo eje que el escape?
    // ==========================================
    if (pendulumShaft === escapeGear.shaft) {
        console.error("❌ ERROR: El péndulo y la rueda de escape no pueden estar en el mismo eje.");
        console.warn("💡 Sugerencia: Monta el escape en un eje diferente al del péndulo.");
        return null;
    }
    
    // ==========================================
    // VALIDACIÓN 4: ¿El péndulo ya tiene un escape asignado?
    // ==========================================
    let existingEscape = this.system.escapements.find(e => e.pendulum === pendulumObj);
    if (existingEscape) {
        console.error("❌ ERROR: Este péndulo ya tiene un escape asignado.");
        console.warn("💡 Sugerencia: Elimina el escape existente antes de crear uno nuevo.");
        return null;
    }
    
    // ==========================================
    // VALIDACIÓN 5: ¿La rueda de escape ya está en otro escape?
    // ==========================================
    let existingEscapeGear = this.system.escapements.find(e => e.escapeGear === escapeGear);
    if (existingEscapeGear) {
        console.error("❌ ERROR: Este engranaje ya está siendo usado como rueda de escape.");
        console.warn("💡 Sugerencia: Usa otro engranaje como escape.");
        return null;
    }
    
    // ==========================================
    // VALIDACIÓN 6: ¿La rueda de escape tiene suficientes dientes?
    // ==========================================
    if (escapeGear.teeth < 6) {
        console.warn("⚠️ ADVERTENCIA: La rueda de escape tiene pocos dientes (" + escapeGear.teeth + ").");
        console.warn("💡 Recomendación: Usa al menos 12 dientes para un escape suizo.");
        // No bloqueamos, solo advertimos
    }
    
    // ==========================================
    // VALIDACIÓN 7: ¿La rueda de escape tiene engranajes conectados?
    // ==========================================
    let hasDownstream = false;
    let downstreamGears = [];
    for (let link of this.system.getLinks()) {
        if (link.driver === escapeGear) {
            hasDownstream = true;
            downstreamGears.push(link.driven);
        } else if (link.driven === escapeGear) {
            hasDownstream = true;
            downstreamGears.push(link.driver);
        }
    }
    
    if (!hasDownstream) {
        console.warn("⚠️ ADVERTENCIA: La rueda de escape no tiene engranajes conectados.");
        console.warn("💡 El tick del escape no será visible porque no hay tren downstream.");
        console.warn("💡 Sugerencia: Conecta la rueda de escape a un tren de engranajes.");
        // No bloqueamos, pero advertimos claramente
    } else {
        console.log("✅ Escape conectado a " + downstreamGears.length + " engranaje(s).");
    }
    
    // ==========================================
    // VALIDACIÓN 8: ¿Hay un motor en la cadena?
    // ==========================================
    let hasMotor = false;
    let motorShaft = null;
    let visited = new Set();
    let queue = [escapeGear.shaft];
    visited.add(escapeGear.shaft);
    
    while (queue.length > 0) {
        let current = queue.shift();
        if (current.isDriver) {
            hasMotor = true;
            motorShaft = current;
            break;
        }
        for (let link of this.system.getLinks()) {
            let next = null;
            if (link.driver.node === current) {
                next = link.driven.node;
            } else if (link.driven.node === current) {
                next = link.driver.node;
            }
            if (next && !visited.has(next)) {
                visited.add(next);
                queue.push(next);
            }
        }
    }
    
    if (!hasMotor) {
        console.warn("⚠️ ADVERTENCIA: No se encontró un motor en la cadena del escape.");
        console.warn("💡 El escape funcionará, pero sin energía el péndulo se detendrá.");
        console.warn("💡 Sugerencia: Añade un motor (⚡) en algún eje conectado.");
    } else {
        console.log("✅ Motor encontrado en la cadena del escape (Eje " + motorShaft.id + ").");
    }
    
    // ==========================================
    // CREACIÓN DEL ESCAPE (si pasó todas las validaciones críticas)
    // ==========================================
    console.log("🔧 Creando escape...");
    // ✅ Usar la fábrica
    let escapement = EscapementFactory.create(type, pendulumObj, escapeGear, this.system);
    
    if (!escapement) {
        console.error("❌ Error al crear el escape");
        return null;
    }
    
    this.system.escapements.push(escapement);
    this.system.afterGeometryChange();
    
    console.log(`✅ Escape de tipo "${type}" creado exitosamente.`);
    return escapement;
    
}
  
    createRack(teeth, module, name = "", plane = 0) {    
        if (!name) {
            this.system.rackCounter++;
            name = "R" + this.system.rackCounter;
        }
        let rack = new Rack(null, teeth, module, name, plane);
        this.system.racks.push(rack);
        return rack;
    }

    mountRack(rack, guide) {
        if(rack.guide) rack.guide.removeComponent(rack);
        guide.addComponent(rack);
    }

    createRackPinionMesh(pinion, rack) {
        let mesh = new RackPinionMesh(pinion, rack);
        this.system.rackMeshes.push(mesh);
        this.system.restoreRackPinion(mesh, pinion.node);
        this.system.afterGeometryChange();
        return mesh;
    }

    createAnnulus(teeth, module, name = "") {
        if (!name) {
            name = "C" + (this.system.annuli.length + 1);
        }
        let shaft = this.createShaft(0, 0);
        let annulus = new Annulus(shaft, teeth, module, name);
        this.system.annuli.push(annulus);
        shaft.addComponent(annulus);
        this.system.afterGeometryChange();
        return annulus;
    }

    createInternalMesh(planet, annulus) {
        if (planet.teeth >= annulus.teeth) {
            console.warn("El planeta debe ser más pequeño que la corona.");
            return null;
        }
        let mesh = new InternalGearMesh(planet, annulus);
        this.system.internalMeshes.push(mesh);
        this.system.afterGeometryChange();
        return mesh;
    }

    // ✅ NUEVO: reemplaza los dos flujos de "Corona" que coexistían en
    // PropertyPanel.js (uno creaba+posicionaba pero nunca conectaba vía
    // createInternalMesh; el otro conectaba a this.system.annuli[0] pero
    // nunca creaba ni reposicionaba). Idempotente: puede llamarse las veces
    // que sea sobre el mismo planeta y siempre termina en el mismo estado
    // correcto (corona conectada y centrada en el sol actual).
    //
    // ✅ CORREGIDO: antes asumía que "selectedShaft" siempre era el planeta y
    // "el otro eje" siempre el sol. Si seleccionabas el eje del SOL antes de
    // presionar Corona, quedaba todo invertido (la corona se centraba en el
    // planeta). Ahora sol/planeta se resuelven por un criterio real:
    // 1) si ya existe un Carrier para el par, él es la fuente de verdad;
    // 2) si no, el sol es por convención el de más dientes.
    createOrConnectCorona(selectedShaft) {
        let otherShaft = this.system.findCenterShaftFor(selectedShaft);
        if (!otherShaft) {
            console.warn("⚠️ El eje seleccionado no está engranado con nada.");
            return null;
        }

        let sunShaft, planetShaft;

        let existingCarrier = this.system.carriers.find(c =>
            c.centerShaft === selectedShaft || c.attachedShafts.includes(selectedShaft)
        );

        if (existingCarrier) {
            // El Carrier ya sabe cuál es el centro (sol) y cuál el que orbita (planeta).
            sunShaft = existingCarrier.centerShaft;
            planetShaft = (existingCarrier.centerShaft === selectedShaft) ? otherShaft : selectedShaft;
        } else {
            let selectedGear = selectedShaft.components.find(c => c instanceof Gear);
            let otherGear = otherShaft.components.find(c => c instanceof Gear);
            if (!selectedGear || !otherGear) {
                console.warn("⚠️ Sol o planeta sin engranaje.");
                return null;
            }
            // Convención: el sol es el de más dientes (o igual, por defecto el seleccionado).
            if (selectedGear.teeth >= otherGear.teeth) {
                sunShaft = selectedShaft;
                planetShaft = otherShaft;
            } else {
                sunShaft = otherShaft;
                planetShaft = selectedShaft;
            }
        }

        let sunGear = sunShaft.components.find(c => c instanceof Gear);
        let planetGear = planetShaft.components.find(c => c instanceof Gear);
        if (!sunGear || !planetGear) {
            console.warn("⚠️ Sol o planeta sin engranaje.");
            return null;
        }

        // ¿Ya hay una corona conectada a ESTE planeta? Reutilízala.
        let annulus = this.findAnnulusFor(planetShaft);
        if (!annulus) {
            let coronaTeeth = sunGear.teeth + (2 * planetGear.teeth);
            annulus = this.createAnnulus(coronaTeeth, sunGear.module, "Corona");
            this.createInternalMesh(planetGear, annulus); // el paso que faltaba
        }

        // Siempre re-centrar en el sol real, exista la corona o se acabe de crear.
        annulus.shaft.x = sunShaft.x;
        annulus.shaft.y = sunShaft.y;

        return annulus;
    }

    createPulley(name, radius, plane = 0) {
        if (!name) {
            this.system.pulleyCounter++;
            name = "P" + this.system.pulleyCounter;
        }
        const pulley = new Pulley(name, radius, plane);
        this.system.pulleys.push(pulley);
        return pulley;
    }

    mountPulley(pulley, shaft) {
        if (!pulley || !shaft) return;
        shaft.addComponent(pulley);
        return pulley;
    }
}