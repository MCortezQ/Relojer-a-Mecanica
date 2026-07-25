class MechanicalSystem {
    constructor(){
        this.shafts = [];
        this.gears = [];
        this.meshes = [];
        this.pulleys = [];
        this.belts = [];
        this.carriers = [];
        this.solver = new Solver(this);
        this.factory = new ComponentFactory(this); 
        this.interaction = new InteractionManager(this);
        this.topology = new TopologyManager(this);   
        this.analysis = new AnalysisTools(this);
    
        // NUEVO: Cache de enlaces
        this.linksCache = [];
        this.linksDirty = true;

        // NUEVO: Índice espacial
        this.spatialIndex = null;
        this.spatialBounds = { x: -2000, y: -2000, w: 4000, h: 4000 };
        this.rebuildSpatialIndex();
        // ...      
      
        this.selectedShaft = null;
        this.draggedShaft = null;
        this.connectionMode = false;
        this.connectionSourceGear = null;
        this.hands = [];
      
        // ---> INICIO MOTOR DE HISTORIAL (CTRL+Z) <---
        this.history = [];
        this.maxHistory = 10;
        // ---> FIN MOTOR DE HISTORIAL <---
      
        // [NUEVO] Estado para conexión de poleas
        this.pulleyConnectionMode = false;
        this.connectionSourcePulley = null;
        this.guides = [];
        this.racks = [];
        this.rackMeshes = [];
        this.gearCounter = 0;
        this.pulleyCounter = 0;
        // [NUEVO] Estado para conexión de cremalleras
        this.rackCounter=0;
        this.rackConnectionMode = false;
        this.connectionSourcePinion = null;
        this.annuli = [];
        this.internalMeshes = [];
        this.pendulums = [];   
        this.clockActive = false;
        this.escapements = [];

        // ---> INICIO MODO SELECCIÓN PÉNDULO <---
        this.pendulumSelectionMode = false;
        this.pendingEscapeGear = null; // Guarda el engranaje de escape temporalmente
        // ---> FIN MODO SELECCIÓN PÉNDULO <---
      
        this.totalTicks = 0;
    }
  
//************************
//COMPONENTFACTORY.JS (La Fábrica) 
//************************
  
    createShaft(x, y) {let shaft = this.factory.createShaft(x, y); this.afterGeometryChange(); return shaft;}

    createShaftAt(x, y) {     
        let shaft = this.factory.createShaft(x, y);
        this.afterGeometryChange(); 
        return shaft; 
    }

    createGear(teeth, module, name = "", plane = 0) { return this.factory.createGear(teeth, module, name, plane); }
  
    createMesh(gearA, gearB) { return this.factory.createMesh(gearA, gearB); }
  
    createBelt(driver, driven, crossed = false) { return this.factory.createBelt(driver, driven, crossed); }
  
    getNodes() { return this.factory.getNodes(); }  
  
    createGuide(x, y, angle = 0) { return this.factory.createGuide(x, y, angle); }  
  
    createCarrier(centerShaft, planetShaft) { return this.factory.createCarrier(centerShaft, planetShaft); } 

    findAnnulusFor(planetShaft) { return this.factory.findAnnulusFor(planetShaft); }

    createHand(type = 'custom') { return this.factory.createHand(type); }  

    mountHand(hand, shaft) { return this.factory.mountHand(hand, shaft); }  
  
    removeHand(hand) { this.factory.removeHand(hand); }

    createPendulum(shaft, length, amplitude, frequency) { return this.factory.createPendulum(shaft, length, amplitude, frequency); }

    createEscapement(pendulumShaft, escapeGear, type = 'swiss') { return this.factory.createEscapement(pendulumShaft, escapeGear, type); }  

    createRack(teeth, module, name = "", plane = 0) { return this.factory.createRack(teeth, module, name, plane); }  

    mountRack(rack, guide) { this.factory.mountRack(rack, guide); }

    createRackPinionMesh(pinion, rack) { return this.factory.createRackPinionMesh(pinion, rack); }

    createAnnulus(teeth, module, name = "") { return this.factory.createAnnulus(teeth, module, name); }

    createInternalMesh(planet, annulus) { return this.factory.createInternalMesh(planet, annulus); }

    createPulley(name, radius, plane = 0) { return this.factory.createPulley(name, radius, plane); }

    mountPulley(pulley, shaft) { return this.factory.mountPulley(pulley, shaft); }

//************************  
//  TOPOLOGY.JS (El Arquitecto)
//************************

    restoreMesh(mesh, fixedShaft) { return this.topology.restoreMesh(mesh, fixedShaft); }

    restoreBelt(belt) { return this.topology.restoreBelt(belt); }  

    computeTangencyPoints(center1, radius1, center2, radius2, crossed = false) { return this.topology.computeTangencyPoints(center1, radius1, center2, radius2, crossed = false); }

    restoreRackPinion(mesh, fixedNode) { this.topology.restoreRackPinion(mesh, fixedNode); }

    updateGearGeometry(gear) { this.topology.updateGearGeometry(gear); }

    afterGeometryChange() {this.linksDirty = true; this.rebuildSpatialIndex(); this.topology.afterGeometryChange();}  

    validateMesh(mesh) { return this.topology.validateMesh(mesh); }

    validateAllMeshes() { this.topology.validateAllMeshes(); }

    connectGears(driverGear, drivenGear) { return this.topology.connectGears(driverGear, drivenGear); }

    disconnectComponent(comp) { this.topology.disconnectComponent(comp); }

    removeMesh(mesh) { this.topology.removeMesh(mesh); this.topology.afterGeometryChange(); }  
  
    removeGear(gear) { this.topology.removeGear(gear); }

    removePulley(pulley) { this.topology.removePulley(pulley); }

    removeRack(rack) { this.topology.removeRack(rack); }

    removeShaft(shaft) { this.topology.removeShaft(shaft); }

    deleteNodeCompletely(node) { this.topology.deleteNodeCompletely(node); }  


//************************
//InteractionManager.js (El Operador)  
//************************

    selectShaft(shaft) { return this.interaction.selectShaft(shaft); }

    findShaftAt(x, y) { return this.interaction.findShaftAt(x, y); }  

    findShaftsAt(x, y, radius) { return this.interaction.findShaftsAt(x, y, radius); }

    findGuideAt(x, y) { return this.interaction.findGuideAt(x, y); }

    findClosestComponentAt(x, y) { return this.interaction.findClosestComponentAt(x, y); }

    findGearAt(x, y) { return this.interaction.findGearAt(x, y); }  

    findPulleyAt(x, y) { return this.interaction.findPulleyAt(x, y); }

    findRackAt(x, y) { return this.interaction.findRackAt(x, y); }  

    beginDrag(shaft) { this.interaction.beginDrag(shaft); }

    endDrag() { this.interaction.endDrag(); }

    dragTo(x, y) { this.interaction.dragTo(x, y); }

    dragRigidly(x, y) { this.interaction.dragRigidly(x, y); }

    getKinematicData(targetNode) { return this.interaction.getKinematicData(targetNode); }

    tracePath(current, target, currentRatio, visited) { return this.interaction.tracePath(current, target, currentRatio, visited); }

    pushHistory() { this.interaction.pushHistory(); }

    undo() { return this.interaction.undo(); }

//    addBranchFromMotor(teeth = 30, module = null) { return this.interaction.addBranchFromMotor(teeth, module); }

  

//************************
//FUNCIONES DE BÚSQUEDA  
//************************

    isShaftConnected(shaft){    
        for(let mesh of this.meshes){
            if(mesh.driver.shaft === shaft || mesh.driven.shaft === shaft) return true;
        }
        return false;
    }

//************************  
    meshExists(gearA, gearB){
        for(let mesh of this.meshes){
            if(mesh.driver === gearA && mesh.driven === gearB){
                return true;
            }   
            if(mesh.driver === gearB && mesh.driven === gearA){
                return true;
            }
        }
        return false;
    }  

//************************  
    isGearMeshed(gear){
        for(let mesh of this.meshes){
            if(mesh.driver === gear || mesh.driven === gear){
                return true;
            }
        }
        return false;
    }  

//************************

//************************
//VARIOS ANTIGUOS
//************************  


  
  
  updatePendulums(dt) {
        for (let p of this.pendulums) {
            p.update(dt);
        }
    }

//************************
    updateEscapements(dt) {
        for (let e of this.escapements) {
            e.update(dt);
        }
    }  
//************************
    findCenterShaftFor(shaft) {
        // Busca con qué eje está engranado este eje para usarlo como centro
        for(let mesh of this.meshes) {
            if(mesh.driver.shaft === shaft) return mesh.driven.shaft;
            if(mesh.driven.shaft === shaft) return mesh.driver.shaft;
        }
        return null;
    }

//************************
    updateCarriers(dt) {
        for (let carrier of this.carriers) {
            carrier.update(dt);
        }
    }

//************************
    isAttachedToCarrier(shaft) {
        for(let carrier of this.carriers) {
            if(carrier.attachedShafts.includes(shaft)) return true;
        }
        return false;
    }
  
//************************
    removeGuide(guide) {
        while(guide.components.length > 0) {
            this.removeRack(guide.components[0]);
        }
        this.guides = this.guides.filter(g => g !== guide);
    }

//************************
getLinks() {
    if (this.linksDirty) {
        this.linksCache = [...this.meshes, ...this.belts, ...this.rackMeshes, ...this.internalMeshes];
        this.linksDirty = false;
    }
    return this.linksCache;
}

//************************
    // [NUEVO] Búsqueda genérica de componentes (Gear o Pulley)
    findComponentAt(x, y){
        // Primero busca engranajes
        let gear = this.findGearAt(x, y);
        if(gear) return gear;

        // Luego busca poleas
        for(let pulley of this.pulleys){         
            if(dist(x, y, pulley.x, pulley.y) <= pulley.radius){
                return pulley;
            }
        }
        return null;
    }

//************************
    update(dt) {   

          // ✅ Forzar propagación manual si el Solver no funciona
        let motor = this.shafts.find(s => s.isDriver);
        if (motor && motor.omega !== 0) {
            // Limpiar visited
            for (let s of this.shafts) s.visited = false;
            this.solver.propagateFrom(motor);
        }

        // 1. El solver calcula velocidades (se frena solo en el escape)
        this.solver.solve(dt);
  
        // 2. Los carriers aplican superposición
        this.updateCarriers(dt);

        // 3. Los péndulos aplican su oscilación
        this.updatePendulums(dt);

        // 4. Los escapes aplican el tick (abren la puerta)
        this.updateEscapements(dt);
    }

//************************
    addMeshedGear(driverGear, teeth, module = null, name = "") {
        // Si no se especifica el módulo, usar el del engranaje conductor
        if (module == null)
            module = driverGear.module;
 
        // Crear el nuevo eje
        let shaft = this.createShaft(0, 0);
  
        // Crear el nuevo engranaje
        let gear = this.createGear(teeth,module,name,driverGear.plane);

        // Montarlo en el eje
        this.mountGear(gear,shaft)
    
        // Crear el engranamiento
        let mesh = this.createMesh(driverGear, gear);
    
        // Posicionar automáticamente
        this.restoreMesh(mesh,driverGear.shaft);   

        // [CORRECCIÓN MENOR] Retornar el engranaje para mejorar la API
        return gear;
    }


//************************  
    validate() {
        let errors = [];
        //--------------------------------------------------
        // Verificar que todos los engranajes tengan eje
        //--------------------------------------------------
        for (let gear of this.gears) {
            if (gear.shaft == null) {
                errors.push(
                    "Gear '" + gear.name + "' no pertenece a ningún eje."
                );
            }
        }
    
        //--------------------------------------------------
        // Verificar que todos los componentes de un eje
        // estén registrados en el sistema
        //--------------------------------------------------
        for (let shaft of this.shafts) {
            for (let component of shaft.components) {
                if (!this.gears.includes(component)) {
                    errors.push(
                        "Un componente de un eje no está registrado en system.gears."
                    );
                }
            }
        }
    
        //--------------------------------------------------
        // Verificar GearMesh
        //--------------------------------------------------
        for (let mesh of this.meshes) {
            if (!this.gears.includes(mesh.driver)) {
                errors.push(
                    "GearMesh: driver inexistente."
                );
            }
            if (!this.gears.includes(mesh.driven)) {
                errors.push(
                    "GearMesh: driven inexistente."
                );
            }
        }
      
        //--------------------------------------------------
        // Validación correas
        //--------------------------------------------------
        for (const pulley of this.pulleys) {
            if (pulley.shaft && !this.shafts.includes(pulley.shaft)) {
                console.warn(
                    "Pulley mounted on unknown shaft:", pulley.name);
            }
        }

        //--------------------------------------------------
        // Validación transmisión de correas
        //--------------------------------------------------
        for (const belt of this.belts) {
            if (!this.pulleys.includes(belt.driver)) {
                console.warn("Unknown driver pulley.");
            }
        
            if (!this.pulleys.includes(belt.driven)) {
                console.warn("Unknown driven pulley.");
            }
        }      
      
        //--------------------------------------------------
        // Validación cremalleras
        //--------------------------------------------------
        for (let rack of this.racks) {
            if (rack.guide == null) {
                errors.push("Rack '" + rack.name + "' no pertenece a ninguna guía.");
            }
        }
      
        //--------------------------------------------------
        // Resultado
        //--------------------------------------------------
        return {
            ok: errors.length === 0,
            errors: errors
        };   
    }

//************************    
    mountGear(gear, shaft){
        // Si ya estaba montado en un eje, retirarlo primero.
        if(gear.shaft){
            gear.shaft.removeComponent(gear);
        }
    
        // Registrar el engranaje en el eje.
        shaft.addComponent(gear);
        this.afterGeometryChange();
    }

 


//************************  
    updateGearTeeth(gear, teeth){
        if(teeth < 4) return;
        gear.teeth = teeth;
        this.updateGearGeometry(gear);
        this.afterGeometryChange();
        if (window.renderer) renderer.invalidateCache();
    }

//************************  
    updateRackTeeth(rack, teeth){
        if(teeth < 4) return;
        rack.teeth = teeth;
        rack.updateGeometry();
        this.afterGeometryChange();
    }  

//************************  
    updatePulleyRadius(pulley, radius){    
        if(radius <= 0) return;
        pulley.radius = radius;
        this.afterGeometryChange(); // Recalcula las tangencias de la correa
    }  

//************************    
    updateGearModule(gear, module){    
        if(module <= 0) return;
        gear.module = module;
        this.updateGearGeometry(gear);
        this.afterGeometryChange();
        if (window.renderer) renderer.invalidateCache();
    }
  
//************************    
    beginConnection(gear){
        this.connectionMode = true;
        this.connectionSourceGear = gear;
    }

//************************    
    endConnection(){
        this.connectionMode = false;
        this.connectionSourceGear = null;
    }


//************************ 
  
    connectPulleys(driver, driven, crossed = false) {
        if (!driver || !driven) return null;
        if (driver === driven) return null;
        if (driver.shaft === driven.shaft) return null;
        const belt = this.createBelt(driver, driven, crossed);
        if (!this.restoreBelt(belt)) {
            this.belts.pop();
            return null;
        }
        return belt;
    }



//************************    
    beginPulleyConnection(pulley){
        this.pulleyConnectionMode = true;
        this.connectionSourcePulley = pulley;
    }

//************************    
    beginRackConnection(pinion){
        this.rackConnectionMode = true;
        this.connectionSourcePinion = pinion;
    }

//************************    
    endRackConnection(){
        this.rackConnectionMode = false;
        this.connectionSourcePinion = null;
    }


//************************    
    endPulleyConnection(){
        this.pulleyConnectionMode = false;
        this.connectionSourcePulley = null;
    }


  //************************    
    removePendulum(shaft) {
        let index = this.pendulums.findIndex(p => p.shaft === shaft);
        if (index >= 0) {
            this.pendulums.splice(index, 1);
            shaft.lockedByCarrier = false; // Liberar el eje
            this.afterGeometryChange();
        }
    }

//************************    
    removeCarrier(shaft) {
        let index = this.carriers.findIndex(c => c.attachedShafts.includes(shaft));
        if (index >= 0) {
            let carrier = this.carriers[index];
            // Desbloquear todos los ejes que orbitaban
            for (let s of carrier.attachedShafts) {
                s.lockedByCarrier = false;
            }
            this.carriers.splice(index, 1);
            this.afterGeometryChange();
        }
    }

//************************    
        removeEscapement(shaft) {
        // Buscar si el eje eliminado es:
        // 1. La rueda de escape
        // 2. El eje del péndulo
        // 3. CUALQUIER otra pieza conectada al tren (ej: el motor)
        let index = this.escapements.findIndex(e => 
            e.escapeGear.shaft === shaft || 
            e.pendulum.shaft === shaft ||
            (e.connectedShafts && e.connectedShafts.includes(shaft))
        );
        
        if (index >= 0) {
            let esc = this.escapements[index];
            
            // Desbloquear TODOS los ejes que este escape había congelado
            if (esc.connectedShafts) {
                for (let s of esc.connectedShafts) {
                    s.lockedByEscapement = false;
                }
            }
            
            // Eliminar el escape del array
            this.escapements.splice(index, 1);
            this.afterGeometryChange();
        }
    }
//************************

removeEscapementByPendulum(pendulumShaft) {
    let index = this.escapements.findIndex(e => e.pendulum.shaft === pendulumShaft);
    if (index >= 0) {
        let esc = this.escapements[index];
        // Desbloquear ejes
        if (esc.connectedShafts) {
            for (let s of esc.connectedShafts) {
                s.lockedByEscapement = false;
            }
        }
        this.escapements.splice(index, 1);
        this.afterGeometryChange();
        console.log("✅ Escape eliminado del péndulo en Eje " + pendulumShaft.id);
        return true;
    }
    console.warn("⚠️ No se encontró escape para el péndulo en Eje " + pendulumShaft.id);
    return false;
}  

  
//************************
    addMinuteHandTrain(escapeGear) {
        // Reducción total necesaria para 2 ticks/seg: 1/120
        // Etapa 1: Escape (30d) -> Rueda Intermedia (120d) => Ratio 30/120 = 1/4
        let intermediateWheel = this.addMeshedGear(escapeGear, 120, escapeGear.module, "Min_Intermedio");
        
        // Añadimos un piñón pequeño al mismo eje de la rueda intermedia
        let intermediatePinion = this.addGearToShaft(intermediateWheel.shaft, 10, escapeGear.module, "Min_Piñon");
        
        // Etapa 2: Piñón (10d) -> Rueda de Minutos (300d) => Ratio 10/300 = 1/30
        // Reducción total: 1/4 * 1/30 = 1/120 (Exacto para 2 ticks/seg)
        let minuteGear = this.addMeshedGear(intermediatePinion, 300, escapeGear.module, "Minuto");
        
        // Guardamos la referencia de este eje para dibujar la aguja azul
        //this.minuteHandShaft = minuteGear.shaft;
        
        return minuteGear;
    }
  
    //************************
    addHourHandTrain(minuteGear) {
        // 1. Añadimos un piñón pequeño NUEVO en el mismo eje de los minutos
        let minutePinion = this.addGearToShaft(minuteGear.shaft, 10, minuteGear.module, "Hora_Piñon");
        
        // 2. Conectamos ese piñón (10d) a la rueda de horas (120d)
        // Reducción matemática: 10 / 120 = 1/12. 
        let hourGear = this.addMeshedGear(minutePinion, 120, minuteGear.module, "Hora");
        
        // 3. Guardamos la referencia para la aguja verde
        this.hourHandShaft = hourGear.shaft;
        
        return hourGear;
    }

  addGearToShaft(shaft, teeth = 20, module = 5, name = "") {
    let gear = this.createGear(teeth, module, name, shaft.plane);
    this.mountGear(gear, shaft);
    this.afterGeometryChange();
    return gear;
}

    //************************
  addBranchFromMotor(teeth = 30, module = null) {
        // 1. Buscar el engranaje del motor
        let motorGear = null;
        let motorShaft = null;
        for (let shaft of this.shafts) {
            if (shaft.isDriver) {
                let g = shaft.components.find(c => c instanceof Gear);
                if (g) { motorGear = g; motorShaft = shaft; break; }
            }
        }
        
        if (!motorGear) {
            console.warn("No hay ningún motor con engranaje en el sistema.");
            return null;
        }

        if (!module) module = motorGear.module;
        
        // 2. Crear el nuevo eje y engranaje
        let newShaft = this.createShaft(0, 0);
        let newGear = this.createGear(teeth, module, "Rama_Motor");
        this.mountGear(newGear, newShaft);
        
        // 3. Crear la conexión
        let mesh = this.createMesh(motorGear, newGear);
        
        // 4. Posicionar en un ángulo ALEATORIO para evitar superposiciones
        let angle = random(TWO_PI); // Ángulo aleatorio entre 0 y 360 grados
        let distance = motorGear.radius + newGear.radius;
        newShaft.x = motorShaft.x + Math.cos(angle) * distance;
        newShaft.y = motorShaft.y + Math.sin(angle) * distance;
        
        this.afterGeometryChange();
        return newGear;
    }

    //************************
        saveProject(projectName = "Mi Reloj") {
            // ---> REPARAR IDs <---
            this.shafts.forEach((s, i) => { if (!s.id) s.id = 10000 + i; });
            this.gears.forEach((g, i) => { if (!g.id) g.id = 20000 + i; });
            this.pendulums.forEach((p, i) => { if (!p.id) p.id = 30000 + i; });
        
            // ✅ CONSTRUIR EL PROYECTO COMPLETO (no usar saveClockToJSON)
            let project = {
                metadata: {
                    name: projectName || "Mi Reloj",
                    author: "Usuario",
                    date: new Date().toISOString(),
                    version: "9.0",
                    description: "Diseño de mecanismo exportado desde Simulador de Relojería"
                },
                session: {
                    camera: {
                        x: typeof camX !== 'undefined' ? camX : 0,
                        y: typeof camY !== 'undefined' ? camY : 0,
                        zoom: typeof zoom !== 'undefined' ? zoom : 1
                    },
                    audio: {
                        type: typeof soundType !== 'undefined' ? soundType : 'square',
                        freqTick: typeof soundFreqTick !== 'undefined' ? soundFreqTick : 1200,
                        freqTock: typeof soundFreqTock !== 'undefined' ? soundFreqTock : 800,
                        decay: typeof soundDecay !== 'undefined' ? soundDecay : 0.04,
                        volume: typeof soundVolume !== 'undefined' ? soundVolume : 0.4
                    },
                    ui: {
                        activePlane: typeof activePlane !== 'undefined' ? activePlane : null
                    }
                },
                design: {
                    shafts: [],
                    gears: [],
                    meshes: [],
                    pendulums: [],
                    escapements: [],
                    hands: [],
                    totalTicks: this.totalTicks || 0
                }
            };
        
            // 1. Guardar ejes
            for (let s of this.shafts) {
                project.design.shafts.push({
                    id: s.id,
                    x: s.x,
                    y: s.y,
                    angle: s.angle,
                    omega: s.omega,
                    isDriver: s.isDriver,
                    isLocked: s.isLocked || false,
                    name: s.name || "Eje " + s.id
                });
            }
        
            // 2. Guardar engranajes
            for (let g of this.gears) {
                if (!g.shaft) continue;
                project.design.gears.push({
                    id: g.id,
                    shaftId: g.shaft.id,
                    teeth: g.teeth,
                    module: g.module,
                    name: g.name || "Engranaje",
                    plane: g.plane || 0
                });
            }
        
            // 3. Guardar mallas
            for (let m of this.meshes) {
                project.design.meshes.push({
                    driverId: m.driver.id,
                    drivenId: m.driven.id
                });
            }
        
            // 4. Guardar péndulos
            for (let p of this.pendulums) {
                project.design.pendulums.push({
                    id: p.id,
                    shaftId: p.shaft.id,
                    length: p.length,
                    amplitude: p.amplitude,
                    frequency: p.frequency
                });
            }
        
            // 5. Guardar escapes
            for (let e of this.escapements) {
                project.design.escapements.push({
                    pendulumId: e.pendulum.id,
                    escapeGearId: e.escapeGear.id
                });
            }
        
            // 6. Guardar agujas
            for (let h of this.hands) {
                if (!h.shaft) continue;
                project.design.hands.push({
                    shaftId: h.shaft.id,
                    type: h.type,
                    color: h.color,
                    strokeW: h.strokeW,
                    length: h.length,
                    tailLength: h.tailLength
                });
            }
        
            return JSON.stringify(project, null, 2);
        }

    //************************
loadProject(jsonStr) {
    let data = JSON.parse(jsonStr);
    
    console.log("📂 Cargando proyecto...");
    
    // Si no tiene metadata, es formato antiguo
    if (!data.metadata) {
        console.log("📂 Formato antiguo detectado. Reparando...");
        data = {
            metadata: {
                name: "Importado (formato antiguo)",
                author: "Desconocido",
                date: new Date().toISOString(),
                version: "legacy",
                description: ""
            },
            session: {
                camera: { x: 0, y: 0, zoom: 1 },
                audio: { type: 'square', freqTick: 1200, freqTock: 800, decay: 0.04, volume: 0.4 },
                ui: { activePlane: null }
            },
            design: data
        };
    }
    
    // ✅ Verificar que design existe
    if (!data.design) {
        console.error("❌ No se encontró 'design' en el archivo.");
        return;
    }
    
    console.log("📂 Ejes en diseño:", data.design.shafts ? data.design.shafts.length : 0);
    
    // ✅ Cargar diseño directamente (sin validaciones intermedias)
    this.loadDesign(data.design);
    
    // ✅ Restaurar sesión
    if (data.session) {
        this.restoreSession(data.session);
    }
    
    this.afterGeometryChange();
    console.log("✅ Proyecto cargado correctamente.");
}

repairLegacyFormat(oldData) {
    // El formato antiguo era directamente el diseño
    return {
        metadata: {
            name: "Diseño importado (formato antiguo)",
            author: "Desconocido",
            date: new Date().toISOString(),
            version: "legacy",
            description: "Importado desde formato anterior a V9.0"
        },
        session: {
            camera: { x: 0, y: 0, zoom: 1 },
            audio: { type: 'square', freqTick: 1200, freqTock: 800, decay: 0.04, volume: 0.4 },
            ui: { activePlane: null }
        },
        design: oldData  // El contenido antiguo pasa a design
    };
}

restoreSession(session) {
    if (session.camera) {
        if (typeof camX !== 'undefined') camX = session.camera.x || 0;
        if (typeof camY !== 'undefined') camY = session.camera.y || 0;
        if (typeof zoom !== 'undefined') zoom = session.camera.zoom || 1;
    }
    if (session.audio) {
        if (typeof soundType !== 'undefined') soundType = session.audio.type || 'square';
        if (typeof soundFreqTick !== 'undefined') soundFreqTick = session.audio.freqTick || 1200;
        if (typeof soundFreqTock !== 'undefined') soundFreqTock = session.audio.freqTock || 800;
        if (typeof soundDecay !== 'undefined') soundDecay = session.audio.decay || 0.04;
        if (typeof soundVolume !== 'undefined') soundVolume = session.audio.volume || 0.4;
    }
    if (session.ui && typeof activePlane !== 'undefined') {
        activePlane = session.ui.activePlane !== undefined ? session.ui.activePlane : null;
    }
}

loadDesign(design) {
    // LIMPIAR SISTEMA ACTUAL
    while(this.shafts.length > 0) this.deleteNodeCompletely(this.shafts[0]);
    this.resetComponentCounters();
  
    let shaftMap = {};
    let gearMap = {};
    let pendulumMap = {};

    // ✅ Obtener arrays con fallback seguro
    let shafts = design.shafts || [];
    let gears = design.gears || [];
    let meshes = design.meshes || [];
    let pendulums = design.pendulums || [];
    let escapements = design.escapements || [];
    let hands = design.hands || [];

    console.log("📂 Reconstruyendo:", shafts.length, "ejes,", gears.length, "engranajes");  

    // 1. Reconstruir Ejes
    for (let sData of design.shafts || []) {
        let s = this.createShaft(sData.x, sData.y);
        s.id = sData.id;
        s.angle = sData.angle || 0;
        s.omega = sData.omega || 0;
        s.isDriver = sData.isDriver || false;
        s.isLocked = sData.isLocked || false;
        s.name = sData.name || "Eje " + sData.id;
        shaftMap[sData.id] = s;
        Shaft.nextId = Math.max(Shaft.nextId, sData.id + 1);
    }

    // 2. Reconstruir Engranajes
    for (let gData of design.gears || []) {
        let g = new Gear(null, gData.teeth, gData.module, gData.name || "Engranaje", gData.plane || 0);
        g.id = gData.id;
        this.gears.push(g);
        if (shaftMap[gData.shaftId]) {
            this.mountGear(g, shaftMap[gData.shaftId]);
        }
        gearMap[gData.id] = g;
        Gear.nextId = Math.max(Gear.nextId, gData.id + 1);
    }

    // 3. Reconstruir Mallas
    for (let mData of design.meshes || []) {
        let driver = gearMap[mData.driverId];
        let driven = gearMap[mData.drivenId];
        if (driver && driven) this.createMesh(driver, driven);
    }

    // 4. Reconstruir Péndulos
    for (let pData of design.pendulums || []) {
        let p = new Pendulum(shaftMap[pData.shaftId], pData.length, pData.amplitude, pData.frequency);
        p.id = pData.id;
        this.pendulums.push(p);
        pendulumMap[pData.id] = p;
        Pendulum.nextId = Math.max(Pendulum.nextId, pData.id + 1);
    }

    // 5. Reconstruir Escapes
    for (let eData of design.escapements || []) {
        let p = pendulumMap[eData.pendulumId];
        let g = gearMap[eData.escapeGearId];
        if (p && g) this.createEscapement(p.shaft, g);
    }

    // 6. Reconstruir Agujas
    for (let hData of design.hands || []) {
        let h = new Hand(hData.type);
        h.color = hData.color;
        h.strokeW = hData.strokeW;
        h.length = hData.length;
        h.tailLength = hData.tailLength;
        this.hands.push(h);
        if (shaftMap[hData.shaftId]) {
            this.mountHand(h, shaftMap[hData.shaftId]);
        }
    }
    
    this.totalTicks = design.totalTicks || 0;
}
//************************

    validateJSONIntegrity(data) {
        let errors = [];
        let shaftIds = new Set(data.shafts.map(s => s.id));
        let gearIds = new Set(data.gears.map(g => g.id));
        let pendulumIds = new Set(data.pendulums.map(p => p.id));
        
        // Verificar referencias de engranajes a ejes
        for (let g of data.gears) {
            if (!shaftIds.has(g.shaftId)) {
                errors.push(`Engranaje ${g.id} (${g.name}) referencia a eje inexistente ${g.shaftId}`);
            }
        }
        
        // Verificar referencias de mallas
        for (let m of data.meshes) {
            if (!gearIds.has(m.driverId)) {
                errors.push(`Malla referencia driver ${m.driverId} inexistente`);
            }
            if (!gearIds.has(m.drivenId)) {
                errors.push(`Malla referencia driven ${m.drivenId} inexistente`);
            }
        }
        
        // Verificar referencias de péndulos a ejes
        for (let p of data.pendulums) {
            if (!shaftIds.has(p.shaftId)) {
                errors.push(`Péndulo ${p.id} referencia a eje inexistente ${p.shaftId}`);
            }
        }
        
        // Verificar referencias de escapes
        for (let e of data.escapements) {
            if (!pendulumIds.has(e.pendulumId)) {
                errors.push(`Escape referencia a péndulo ${e.pendulumId} inexistente`);
            }
            if (!gearIds.has(e.escapeGearId)) {
                errors.push(`Escape referencia a engranaje ${e.escapeGearId} inexistente`);
            }
        }
        
        // Verificar referencias de agujas a ejes
        if (data.hands) {
            for (let h of data.hands) {
                if (!shaftIds.has(h.shaftId)) {
                    errors.push(`Aguja referencia a eje ${h.shaftId} inexistente`);
                }
            }
        }
        
        return { ok: errors.length === 0, errors: errors };
    }  

//***********

    repairJSON(data) {
        let shaftIds = new Set(data.shafts.map(s => s.id));
        let gearIds = new Set(data.gears.map(g => g.id));
        let pendulumIds = new Set(data.pendulums.map(p => p.id));
        
        // 1. Eliminar engranajes sin eje
        let removedGears = 0;
        data.gears = data.gears.filter(g => {
            if (!shaftIds.has(g.shaftId)) {
                removedGears++;
                return false;
            }
            return true;
        });
        if (removedGears > 0) console.log(`   Eliminados ${removedGears} engranajes sin eje`);
        
        // Actualizar lista de IDs de engranajes después de la limpieza
        gearIds = new Set(data.gears.map(g => g.id));
        
        // 2. Eliminar mallas con referencias rotas
        let removedMeshes = 0;
        data.meshes = data.meshes.filter(m => {
            if (!gearIds.has(m.driverId) || !gearIds.has(m.drivenId)) {
                removedMeshes++;
                return false;
            }
            return true;
        });
        if (removedMeshes > 0) console.log(`   Eliminadas ${removedMeshes} mallas rotas`);
        
        // 3. Eliminar péndulos sin eje
        let removedPendulums = 0;
        data.pendulums = data.pendulums.filter(p => {
            if (!shaftIds.has(p.shaftId)) {
                removedPendulums++;
                return false;
            }
            return true;
        });
        if (removedPendulums > 0) console.log(`   Eliminados ${removedPendulums} péndulos sin eje`);
        
        // Actualizar lista de IDs de péndulos
        pendulumIds = new Set(data.pendulums.map(p => p.id));
        
        // 4. Eliminar escapes con referencias rotas
        let removedEscapes = 0;
        data.escapements = data.escapements.filter(e => {
            if (!pendulumIds.has(e.pendulumId) || !gearIds.has(e.escapeGearId)) {
                removedEscapes++;
                return false;
            }
            return true;
        });
        if (removedEscapes > 0) console.log(`   Eliminados ${removedEscapes} escapes rotos`);
        
        // 5. Eliminar agujas sin eje
        if (data.hands) {
            let removedHands = 0;
            data.hands = data.hands.filter(h => {
                if (!shaftIds.has(h.shaftId)) {
                    removedHands++;
                    return false;
                }
                return true;
            });
            if (removedHands > 0) console.log(`   Eliminadas ${removedHands} agujas sin eje`);
        }
        
        return data;
    }  

//**********************
  
    rebuildSpatialIndex() {
        // Calcular límites reales basados en los ejes
        if (this.shafts.length === 0) {
            this.spatialBounds = { x: -1000, y: -1000, w: 2000, h: 2000 };
        } else {
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            
            for (let s of this.shafts) {
                if (s.x < minX) minX = s.x;
                if (s.x > maxX) maxX = s.x;
                if (s.y < minY) minY = s.y;
                if (s.y > maxY) maxY = s.y;
            }
            
            let padding = 200;
            this.spatialBounds = {
                x: minX - padding,
                y: minY - padding,
                w: (maxX - minX) + padding * 2,
                h: (maxY - minY) + padding * 2
            };
        }
        
        this.spatialIndex = new Quadtree(this.spatialBounds, 8);
        
        // Insertar todos los ejes
        for (let shaft of this.shafts) {
            this.spatialIndex.insert({ x: shaft.x, y: shaft.y, data: shaft, type: 'shaft' });
        }
        
        // Insertar todos los engranajes
        for (let gear of this.gears) {
            if (gear.shaft) {
                this.spatialIndex.insert({ x: gear.x, y: gear.y, data: gear, type: 'gear' });
            }
        }
        
        // Insertar todas las poleas
        for (let pulley of this.pulleys) {
            if (pulley.shaft) {
                this.spatialIndex.insert({ x: pulley.x, y: pulley.y, data: pulley, type: 'pulley' });
            }
        }
    }
    
    forkliftSubgraph(sourceShaft, offsetX = 200, offsetY = 100) {
        // 1. Identificar todos los ejes conectados a sourceShaft
        let connectedShafts = [];
        let visited = new Set();
        let queue = [sourceShaft];
        visited.add(sourceShaft);
        
        while (queue.length > 0) {
            let current = queue.shift();
            connectedShafts.push(current);
            
            // Buscar enlaces a otros ejes
            for (let link of this.getLinks()) {
                let next = null;
                if (link.driver.node === current) next = link.driven.node;
                else if (link.driven.node === current) next = link.driver.node;
                if (next && !visited.has(next)) {
                    visited.add(next);
                    queue.push(next);
                }
            }
        }
        
        // 2. Crear mapas para la copia
        let shaftMap = new Map();
        let gearMap = new Map();
        let pulleyMap = new Map();
        let handMap = new Map();
        
        // 3. Copiar ejes
        for (let s of connectedShafts) {
            let newShaft = this.createShaft(s.x + offsetX, s.y + offsetY);
            newShaft.angle = s.angle;
            newShaft.omega = s.omega;
            newShaft.isDriver = s.isDriver;
            shaftMap.set(s, newShaft);
        }
        
        // 4. Copiar componentes de cada eje
        for (let s of connectedShafts) {
            let newShaft = shaftMap.get(s);
            if (!newShaft) continue;
            
            for (let comp of s.components) {
                if (comp instanceof Gear) {
                    let newGear = this.createGear(comp.teeth, comp.module, comp.name + "_copy", comp.plane);
                    this.mountGear(newGear, newShaft);
                    gearMap.set(comp, newGear);
                } else if (comp instanceof Pulley) {
                    let newPulley = this.createPulley(comp.name + "_copy", comp.radius, comp.plane);
                    this.mountPulley(newPulley, newShaft);
                    pulleyMap.set(comp, newPulley);
                } else if (comp instanceof Hand) {
                    let newHand = this.createHand(comp.type);
                    // Copiar propiedades visuales
                    newHand.color = [...comp.color];
                    newHand.strokeW = comp.strokeW;
                    newHand.length = comp.length;
                    newHand.tailLength = comp.tailLength;
                    this.mountHand(newHand, newShaft);
                    handMap.set(comp, newHand);
                }
            }
        }
        
        // 5. Copiar enlaces (GearMesh, Belt, RackPinionMesh)
        for (let link of this.getLinks()) {
            let driverShaft = link.driver.node;
            let drivenShaft = link.driven.node;
            
            // Verificar que ambos extremos están en el subgrafo
            let newDriverShaft = shaftMap.get(driverShaft);
            let newDrivenShaft = shaftMap.get(drivenShaft);
            if (!newDriverShaft || !newDrivenShaft) continue;
            
            // Encontrar los componentes correspondientes
            if (link instanceof GearMesh) {
                let newDriverGear = gearMap.get(link.driver);
                let newDrivenGear = gearMap.get(link.driven);
                if (newDriverGear && newDrivenGear) {
                    this.connectGears(newDriverGear, newDrivenGear);
                }
            } else if (link instanceof Belt) {
                let newDriverPulley = pulleyMap.get(link.driver);
                let newDrivenPulley = pulleyMap.get(link.driven);
                if (newDriverPulley && newDrivenPulley) {
                    this.createBelt(newDriverPulley, newDrivenPulley, link.crossed);
                }
            }
        }
        
        // 6. Copiar péndulos asociados
        for (let pend of this.pendulums) {
            let newShaft = shaftMap.get(pend.shaft);
            if (newShaft) {
                this.createPendulum(newShaft, pend.length, pend.amplitude, pend.frequency);
            }
        }
        
        this.afterGeometryChange();
        return shaftMap;
    }

// ==========================================
// FUNCIONES PARA EL HISTORIAL (Ctrl+Z)
// ==========================================

saveClockToJSON() {
    // ---> INICIO REPARACIÓN DE IDs VIEJOS <---
    // Si los objetos fueron creados antes de añadir la propiedad 'id', se la forzamos ahora
    this.shafts.forEach((s, i) => { if (!s.id) s.id = 10000 + i; });
    this.gears.forEach((g, i) => { if (!g.id) g.id = 20000 + i; });
    this.pendulums.forEach((p, i) => { if (!p.id) p.id = 30000 + i; });
    // ---> FIN REPARACIÓN DE IDs VIEJOS <---

    let data = {
        shafts: [],
        gears: [],
        meshes: [],
        pendulums: [],
        escapements: [],
        hands: [],
        totalTicks: this.totalTicks
    };

    // 1. Guardar ejes
    for (let s of this.shafts) {
        data.shafts.push({ id: s.id, x: s.x, y: s.y, angle: s.angle, omega: s.omega, isDriver: s.isDriver });
    }

    // 2. Guardar engranajes
    for (let g of this.gears) {
        if (!g.shaft) continue;
        data.gears.push({ id: g.id, shaftId: g.shaft.id, teeth: g.teeth, module: g.module, name: g.name, plane: g.plane });
    }

    // 3. Guardar mallas
    for (let m of this.meshes) {
        data.meshes.push({ driverId: m.driver.id, drivenId: m.driven.id });
    }

    // 4. Guardar péndulos
    for (let p of this.pendulums) {
        data.pendulums.push({ id: p.id, shaftId: p.shaft.id, length: p.length, amplitude: p.amplitude, frequency: p.frequency });
    }

    // 5. Guardar escapes
    for (let e of this.escapements) {
        data.escapements.push({ pendulumId: e.pendulum.id, escapeGearId: e.escapeGear.id });
    }

    // 6. Guardar agujas (Hands)
    for (let h of this.hands) {
        if (!h.shaft) continue;
        data.hands.push({
            shaftId: h.shaft.id,
            type: h.type,
            color: h.color,
            strokeW: h.strokeW,
            length: h.length,
            tailLength: h.tailLength
        });
    }

    return JSON.stringify(data, null, 2);
}

loadClockFromJSON(jsonStr) {
    let data = JSON.parse(jsonStr);
    
    // LIMPIAR SISTEMA ACTUAL
    while(this.shafts.length > 0) this.deleteNodeCompletely(this.shafts[0]);
    this.resetComponentCounters()
  
    // Mapas para buscar rápidamente por ID durante la reconstrucción
    let shaftMap = {};
    let gearMap = {};
    let pendulumMap = {};

    // 1. Reconstruir Ejes
    for (let sData of data.shafts) {
        let s = this.createShaft(sData.x, sData.y);
        s.id = sData.id;
        s.angle = sData.angle || 0;
        s.omega = sData.omega || 0;
        s.isDriver = sData.isDriver || false;
        shaftMap[sData.id] = s;
        Shaft.nextId = Math.max(Shaft.nextId, sData.id + 1);
    }

    // 2. Reconstruir Engranajes y montarlos
    for (let gData of data.gears) {
        let g = new Gear(null, gData.teeth, gData.module, gData.name, gData.plane);
        g.id = gData.id;
        this.gears.push(g);
        this.mountGear(g, shaftMap[gData.shaftId]);
        gearMap[gData.id] = g;
        Gear.nextId = Math.max(Gear.nextId, gData.id + 1);
    }

    // 3. Reconstruir Mallas
    for (let mData of data.meshes) {
        let driver = gearMap[mData.driverId];
        let driven = gearMap[mData.drivenId];
        if (driver && driven) this.createMesh(driver, driven);
    }

    // 4. Reconstruir Péndulos
    for (let pData of data.pendulums) {
        let p = new Pendulum(shaftMap[pData.shaftId], pData.length, pData.amplitude, pData.frequency);
        p.id = pData.id;
        this.pendulums.push(p);
        pendulumMap[pData.id] = p;
        Pendulum.nextId = Math.max(Pendulum.nextId, pData.id + 1);
    }

    // 5. Reconstruir Escapes (Al final, para que encuentre los componentes)
    for (let eData of data.escapements) {
        let p = pendulumMap[eData.pendulumId];
        let g = gearMap[eData.escapeGearId];
        if (p && g) this.createEscapement(p.shaft, g);
    }

    // 6. Reconstruir Agujas
    if (data.hands) {
        for (let hData of data.hands) {
            let h = new Hand(hData.type);
            h.color = hData.color;
            h.strokeW = hData.strokeW;
            h.length = hData.length;
            h.tailLength = hData.tailLength;
            this.hands.push(h);
            this.mountHand(h, shaftMap[hData.shaftId]);
        }
    }
    
    // Restaurar el tiempo
    this.totalTicks = data.totalTicks || 0;

    this.afterGeometryChange();
}  

    resetComponentCounters() {
        // Reiniciar contadores estáticos
        Shaft.nextId = 1;
        Gear.nextId = 1;
        Pendulum.nextId = 1;
        // Si hay otros contadores, reiniciarlos aquí
        this.gearCounter = 0;
        this.pulleyCounter = 0;
        this.rackCounter = 0;
    }  
  
  //***********Fin Archivo************
}
