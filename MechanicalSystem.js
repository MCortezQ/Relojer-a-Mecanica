class MechanicalSystem {
    constructor(){
        this.shafts = [];
        this.gears = [];
        this.meshes = [];
        this.pulleys = [];
        this.belts = [];
        this.carriers = [];
        this.solver = new Solver(this);
        this.selectedShaft = null;
        this.draggedShaft = null;
        this.connectionMode = false;
        this.connectionSourceGear = null;
        this.hands = [];
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
    createShaft(x,y){
        let shaft = new Shaft(x,y);
        this.shafts.push(shaft);
        return shaft;
    }

//************************
    createShaftAt(x, y){
        let shaft =this.createShaft(x, y);
        return shaft;    
    }

//************************
    createGear(teeth, module, name = "",plane=0) {    
        // [NUEVO] Generar nombre correlativo si viene vacío
        if (!name) {
            this.gearCounter++;
            name = "E" + this.gearCounter;
        }
        let gear = new Gear(
            null,
            teeth,
            module,
            name,
            plane
        );
        this.gears.push(gear);
        return gear;
    }

//************************
    createMesh(gearA,gearB){
        if (gearA.plane !== gearB.plane) {
        console.error(
            "Cannot mesh gears on different planes."
        );
        return null;
        }
      
        let mesh = new GearMesh(gearA, gearB);
        this.meshes.push(mesh);
        this.validateMesh(mesh);
        return mesh;
    }

//************************  
    createBelt(driver, driven, crossed = false) {
        const belt = new Belt(driver, driven, crossed);
        this.belts.push(belt);
        return belt;
    }

//************************
    getNodes() {
        return [...this.shafts, ...this.guides];
    }

//************************
    createGuide(x, y, angle = 0) {
        let guide = new LinearGuide(x, y, angle);
        this.guides.push(guide);
        return guide;
    }

//************************
    createCarrier(centerShaft, planetShaft) {
        let carrier = new Carrier(this, centerShaft, planetShaft); // Le pasamos 'this' (el sistema)
        this.carriers.push(carrier);
        return carrier;
    }

//************************
    findAnnulusFor(planetShaft) {
        for(let mesh of this.internalMeshes) {
            if(mesh.driver.shaft === planetShaft) {
                return mesh.driven; // Retorna el objeto Annulus
            }
        }
        return null;
    }

//************************
    // ---> INICIO GESTIÓN DE AGUJAS (HANDS) <---
    createHand(type = 'custom') {
        let hand = new Hand(type);
        this.hands.push(hand);
        return hand;
    }

    mountHand(hand, shaft) {
        if (!shaft) {
            console.warn("Montaje fallido: Se requiere un eje válido.");
            return;
        }
        shaft.addComponent(hand);
        hand.shaft = shaft; // <--- FORZAMOS que la aguja sepa en qué eje está
    }

    removeHand(hand) {
        // Desmontar del eje si está montada
        if (hand.shaft) {
            let idx = hand.shaft.components.indexOf(hand);
            if (idx !== -1) hand.shaft.components.splice(idx, 1);
            hand.shaft = null;
        }
        // Eliminar del array global del sistema
        let globalIdx = this.hands.indexOf(hand);
        if (globalIdx !== -1) this.hands.splice(globalIdx, 1);
    }
    // ---> FIN GESTIÓN DE AGUJAS (HANDS) <---
  

//************************
    createPendulum(shaft, length, amplitude, frequency) {
        let pendulum = new Pendulum(shaft, length || 150, amplitude || PI/6, frequency || 1);
        this.pendulums.push(pendulum);
        return pendulum;
    }

//************************
    updatePendulums(dt) {
        for (let p of this.pendulums) {
            p.update(dt);
        }
    }

//************************
    createEscapement(pendulumShaft, escapeGear) {
        // 1. Buscar el OBJETO péndulo que usa este eje
        let pendulumObj = this.pendulums.find(p => p.shaft === pendulumShaft);
        if (!pendulumObj) {
            console.error("ERROR: No hay ningún péndulo montado en el eje seleccionado.");
            return null;
        }

        // 2. Verificación real en la fuente de la verdad
        if (!escapeGear || !escapeGear.shaft) {
            console.error("ERROR: El componente seleccionado no tiene un eje válido.");
            return null;
        }
        
        // 3. Llamar al constructor con el orden correcto: (péndulo, engranaje, sistema)
        let escapement = new Escapement(pendulumObj, escapeGear, this);
        
        // 4. Añadir al sistema aquí (ya no lo hace el constructor)
        this.escapements.push(escapement);

        // ---> INICIO ARREGLO <---
        // Forzar la reconstrucción topológica para que el motor se entere 
        // de que ahora pertenece a un tren de escape y debe congelarse.
        this.afterGeometryChange();
        // ---> FIN ARREGLO <---
        
        return escapement;
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
    createRack(teeth, module, name = "", plane = 0) {    
        // Generar nombre correlativo si viene vacío
        if (!name) {
            this.rackCounter++;
            name = "R" + this.rackCounter;
        }
        let rack = new Rack(null, teeth, module, name, plane);
        this.racks.push(rack);
        return rack;
    }

  

//************************
    mountRack(rack, guide) {
        if(rack.guide) rack.guide.removeComponent(rack);
        guide.addComponent(rack);
    }

//************************
    createRackPinionMesh(pinion, rack) {
        let mesh = new RackPinionMesh(pinion, rack);
        this.rackMeshes.push(mesh);
        
        // [NUEVO] Ajustar automáticamente la posición vertical para que engrane
        this.restoreRackPinion(mesh, pinion.node);
        
        this.afterGeometryChange();
        return mesh;
    }

//************************
    createAnnulus(teeth, module, name = "") {
        if (!name) {
            // Generamos nombre automático
            name = "C" + (this.annuli.length + 1); // C de Corona
        }
        // Se monta en un eje fijo
        let shaft = this.createShaft(0, 0);
        let annulus = new Annulus(shaft, teeth, module, name);
        this.annuli.push(annulus);
        shaft.addComponent(annulus);
        this.afterGeometryChange();
        return annulus;
    }

//************************
    createInternalMesh(planet, annulus) {
        if (planet.teeth >= annulus.teeth) {
            console.warn("El planeta debe ser más pequeño que la corona.");
            return null;
        }
        let mesh = new InternalGearMesh(planet, annulus);
        this.internalMeshes.push(mesh);
        this.afterGeometryChange();
        return mesh;
    }
  
//************************
    removeRack(rack) {
        this.rackMeshes = this.rackMeshes.filter(m => m.rack !== rack && m.pinion !== rack);
        if(rack.guide) rack.guide.removeComponent(rack);
        this.racks = this.racks.filter(r => r !== rack);
        this.afterGeometryChange();
    }

//************************
    removeGuide(guide) {
        while(guide.components.length > 0) {
            this.removeRack(guide.components[0]);
        }
        this.guides = this.guides.filter(g => g !== guide);
    }

//************************
    // [NUEVO] Abstracción para el Solver (Regla 6)
    getLinks() {
        return [...this.meshes, ...this.belts, ...this.rackMeshes, ...this.internalMeshes];
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
        // [ELIMINADO] Ya no necesitamos engañar al Solver. 
        // El nuevo "Muro" del Solver se encarga de frenar la energía.

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
    removeMesh(mesh){    
        let index = this.meshes.indexOf(mesh);
        if(index >= 0){
            this.meshes.splice(index,1);
        }
    }

//************************
    removeShaft(shaft){
        // eliminar todos los componentes montados
        while(shaft.components.length>0){
            this.removeGear(
                shaft.components[0]
            );
        }

        // ---> INICIO LIMPIEZA DE PÉNDULOS HUÉRFANOS <---
        // Si eliminamos un eje que tiene un péndulo, el péndulo debe morir también
        for (let i = this.pendulums.length - 1; i >= 0; i--) {
            if (this.pendulums[i].shaft === shaft) {
                // Opcional: Si el péndulo estaba conectado a un escape, limpiamos la referencia
                for (let esc of this.escapements) {
                    if (esc.pendulum === this.pendulums[i]) {
                        // Aquí deberías llamar a la función que ya tienes para destruir escapes
                        // Normalmente se llama removeEscapement(esc) o similar
                        this.removeEscapement(esc); 
                    }
                }
                this.pendulums.splice(i, 1); // Eliminamos el péndulo del array global
            }
        }
        // ---> FIN LIMPIEZA DE PÉNDULOS HUÉRFANOS <---
      
        let index =
            this.shafts.indexOf(shaft);
        if(index>=0){
            this.shafts.splice(index,1);
        }
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
    }

//************************  
    selectShaft(shaft){
        if (this.selectedShaft === shaft)
            return;
        if (this.selectedShaft){
            this.selectedShaft.selected = false;
        }
        this.selectedShaft = shaft;
        if (shaft){
            shaft.selected = true;
        }    
    }

//************************    
    findShaftAt(x, y){
        const PICK_RADIUS = 8;
        for(let shaft of this.shafts){
            if(dist(x,y,shaft.x,shaft.y) <= PICK_RADIUS){
                return shaft;
            }
        }
        return null;
    }

//************************ 

    // ---> INICIO BÚSQUEDA COAXIAL <---
    // Devuelve un ARRAY con todos los ejes que estén dentro del radio de clic
    findShaftsAt(x, y, radius = 12) {
        let found = [];
        for (let s of this.shafts) {
            if (dist(x, y, s.x, s.y) < radius) {
                found.push(s);
            }
        }
        return found;
    }
    // ---> FIN BÚSQUEDA COAXIAL <---

//**************************  
  
    findGuideAt(x, y){
        const PICK_RADIUS = 15; // Un poco más generoso para facilitar la selección
        for(let guide of this.guides){
            // Clic cerca del origen de la guía
            if(dist(x, y, guide.x, guide.y) <= PICK_RADIUS){
                return guide;
            }
        }
        return null;
    } 

  
//************************    
    beginDrag(shaft){
    this.draggedShaft = shaft;
    }

//************************    
    endDrag(){
        this.draggedShaft = null;
    }

//************************    
    dragTo(x, y){
        if(!this.draggedShaft){
            return;
        }
        this.draggedShaft.x = x;
        this.draggedShaft.y = y;
        this.afterGeometryChange();
    }
  
//************************  
    restoreMesh(mesh, fixedShaft){
        let driverGear = mesh.driver;
        let drivenGear = mesh.driven;
        let driverShaft = driverGear.shaft;
        let drivenShaft = drivenGear.shaft;
        let targetDistance = driverGear.radius + drivenGear.radius;
        
        let dx = drivenShaft.x - driverShaft.x;
        let dy = drivenShaft.y - driverShaft.y;
        let d = Math.sqrt(dx*dx + dy*dy);
        
        // Si están exactamente superpuestos, asumir ángulo 0 (hacia la derecha)
        if(d < 0.0001){
            dx = 1; 
            dy = 0; 
            d = 1;
        }
        
        // Normalizar el vector director (para mantener el ángulo actual)
        let dirX = dx / d;
        let dirY = dy / d;
        
        if(fixedShaft === driverShaft){
            // Mover el driven a la distancia correcta, respetando el ángulo
            drivenShaft.x = driverShaft.x + dirX * targetDistance;
            drivenShaft.y = driverShaft.y + dirY * targetDistance;
        }
        else if(fixedShaft === drivenShaft){
            // Mover el driver a la distancia correcta (dirección invertida)
            driverShaft.x = drivenShaft.x - dirX * targetDistance;
            driverShaft.y = drivenShaft.y - dirY * targetDistance;
        }
    }

//************************  
    restoreRackPinion(mesh, fixedNode) {
        let pinion = mesh.pinion;
        let rack = mesh.rack;
        
        // Asumiendo guía horizontal (angle = 0)
        if (fixedNode === pinion.node) {
            // Fijamos el piñón, movemos la guía de la cremallera
            rack.node.x = pinion.x; // [NUEVO] Alineación horizontal forzada
            rack.node.y = pinion.y + pinion.pitchRadius; // Alineación vertical (debajo)
        } else if (fixedNode === rack.node) {
            // Fijamos la guía, movemos el eje del piñón
            pinion.node.x = rack.node.x; // [NUEVO] Alineación horizontal forzada
            pinion.node.y = rack.node.y - pinion.pitchRadius;
        }
    }

//************************  
    updateGearTeeth(gear, teeth){
        if(teeth < 4) return;
        gear.teeth = teeth;
        this.updateGearGeometry(gear);
        this.afterGeometryChange();
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
    }

//************************    
      updateGearGeometry(gear){
        gear.updateGeometry();
        for(let mesh of this.meshes){
            if(mesh.driver === gear){
                this.restoreMesh(mesh, gear.shaft);
            }
            else if(mesh.driven === gear){
                this.restoreMesh(mesh,mesh.driver.shaft);
            }
        }
    }

//************************    
    validateMesh(mesh){
        //--------------------------------------------------
        // Estado inicial
        //--------------------------------------------------
        mesh.isValid = true;
    
        //--------------------------------------------------
        // Deben pertenecer al mismo plano
        //--------------------------------------------------
        if(mesh.driver.plane !== mesh.driven.plane){
            mesh.isValid = false;
            return false;
        }
    
        //--------------------------------------------------
        // Distancia entre ejes
        //--------------------------------------------------
        let dx = mesh.driver.x - mesh.driven.x;
        let dy = mesh.driver.y - mesh.driven.y;
        let distance = Math.hypot(dx, dy);
    
        //--------------------------------------------------
        // Los cuerpos no pueden interpenetrarse
        //--------------------------------------------------
        let minDistance =
            mesh.driver.rootRadius +
            mesh.driven.rootRadius;
    
        if(distance < minDistance){
            mesh.isValid = false;
            return false;
        }
    
        //--------------------------------------------------
        // Aquí irán futuras validaciones:
        //
        // - módulo
        // - ángulo de presión
        // - interferencia de dientes
        // - etc.
        //--------------------------------------------------
    
        return true;
    }

//************************    
    validateAllMeshes(){
        for(let mesh of this.meshes){
            this.validateMesh(mesh);
        }
    }

//************************    
    afterGeometryChange(){
        //--------------------------------------------------
        // [NUEVO] Restaurar geometría de correas
        //--------------------------------------------------
        for (let belt of this.belts) {
            this.restoreBelt(belt);
        }

        //--------------------------------------------------
        // Validar engranajes
        //--------------------------------------------------
        this.validateAllMeshes();

        // ---> INICIO ACTUALIZACIÓN DEL ESCAPE <---
        // Si el escape existe, reconstruimos su lista de ejes porque
        // el usuario acaba de conectar o desconectar algo.
        if (this.escapements.length > 0) {
            for (let esc of this.escapements) {
                esc.rebuildConnectedTrain();
                // Re-congelar los ejes tras el cambio
                for (let shaft of esc.connectedShafts) {
                    shaft.lockedByEscapement = true;
                }
            }
        }
        // ---> FIN ACTUALIZACIÓN DEL ESCAPE <---
    }

//************************  
    addGearToShaft(shaft, teeth = 20, module = 5, name = ""){
        let gear = this.createGear(teeth, module, name);
        this.mountGear(gear, shaft);
        this.afterGeometryChange();
        return gear;
    }

//************************    
    removeGear(gear){
        //----------------------------------
        // Eliminar todos los engranamientos
        //----------------------------------
        this.meshes =
            this.meshes.filter(mesh =>
                mesh.driver !== gear &&
                mesh.driven !== gear
            );
    
        //----------------------------------
        // Desmontar del eje
        //----------------------------------
        if(gear.shaft) gear.shaft.removeComponent(gear);
    
        //----------------------------------
        // Eliminar del sistema
        //----------------------------------
        this.gears =
            this.gears.filter(g => g !== gear);
        
        //----------------------------------
        // Actualizar el sistema
        //----------------------------------
        this.afterGeometryChange();
    }

//************************    
    disconnectComponent(comp) {
        if (comp instanceof Gear) {
            // Desconectar Engranajes externos
            this.meshes = this.meshes.filter(m => m.driver !== comp && m.driven !== comp);
            // Desconectar Engranajes internos (Corona)
            this.internalMeshes = this.internalMeshes.filter(m => m.driver !== comp && m.driven !== comp);
            
            // ---> INICIO LIMPIEZA SEGURA DE ESCAPE <---
            // Encontrar todos los escapes que usan este engranaje
            let affectedEscapes = this.escapements.filter(e => e.escapeGear === comp);
            for (let esc of affectedEscapes) {
                // Desbloquear la cadena completa antes de borrar el escape
                if (esc.connectedShafts) {
                    for (let s of esc.connectedShafts) {
                        s.lockedByEscapement = false;
                    }
                }
            }
            // Ahora sí, limpiarlos del array
            this.escapements = this.escapements.filter(e => e.escapeGear !== comp);
            // ---> FIN LIMPIEZA SEGURA DE ESCAPE <---
        }
        else if (comp instanceof Pulley) {
            // Desconectar Correas
            this.belts = this.belts.filter(b => b.driver !== comp && b.driven !== comp);
        } 
        else if (comp instanceof Rack) {
            // Desconectar Cremalleras
            this.rackMeshes = this.rackMeshes.filter(m => m.rack !== comp && m.pinion !== comp);
        }
        
        this.afterGeometryChange();
    }  

//************************    
    removePulley(pulley){
        //----------------------------------
        // Eliminar todas las correas conectadas
        //----------------------------------
        this.belts =
            this.belts.filter(belt =>
                belt.driver !== pulley &&
                belt.driven !== pulley
            );
    
        //----------------------------------
        // Desmontar del eje (Shaft.removeComponent ya es genérico)
        //----------------------------------
        if(pulley.shaft) pulley.shaft.removeComponent(pulley);
    
        //----------------------------------
        // Eliminar del sistema
        //----------------------------------
        this.pulleys =
            this.pulleys.filter(p => p !== pulley);
        
        //----------------------------------
        // Actualizar el sistema
        //----------------------------------
        this.afterGeometryChange();
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
    findGearAt(x, y){
        for(let gear of this.gears){         
            if(dist(x, y, gear.x, gear.y) <= gear.outsideRadius){
                return gear;
            }
        }
        return null;
    }

//************************    
    findPulleyAt(x, y){
        for(let pulley of this.pulleys){         
            if(dist(x, y, pulley.x, pulley.y) <= pulley.radius){
                return pulley;
            }
        }
        return null;
    }  

//************************  
    connectGears(driverGear, drivenGear){
        if(driverGear === drivenGear) return null;
        if(driverGear.shaft === drivenGear.shaft) return null;
        
        if(this.meshExists(driverGear, drivenGear)){
            console.warn("Estos engranajes ya están conectados.");
            return null;
        }
      
        let driverShaft = driverGear.shaft;
        let drivenShaft = drivenGear.shaft;

        let driverConnected = this.isShaftConnected(driverShaft);
        let drivenConnected = this.isShaftConnected(drivenShaft);

        if(driverConnected && drivenConnected){
            console.warn("Ambos ejes ya pertenecen a un mecanismo.");
            return null;
        }
       
        let needSwap = false;

        // 1. El eje motor NUNCA debe ser movido. 
        if (drivenShaft.isDriver) {
            needSwap = true;
        } 
        // 2. Si no hay motores, mover la pieza suelta antes que el mecanismo
        else if (!driverShaft.isDriver && !driverConnected && drivenConnected) {
            needSwap = true;
        }

        if (needSwap) {
            let tempGear = driverGear;
            driverGear = drivenGear;
            drivenGear = tempGear;
            driverShaft = driverGear.shaft;
            drivenShaft = drivenGear.shaft;
        }
      
        let targetDistance = driverGear.pitchRadius + drivenGear.pitchRadius;
        let dx = drivenShaft.x - driverShaft.x;
        let dy = drivenShaft.y - driverShaft.y;
        let d = Math.sqrt(dx*dx + dy*dy);
    
        if(d < 0.0001){
            dx = 1; dy = 0; d = 1;
        }
    
        dx /= d;
        dy /= d;
    
        drivenShaft.x = driverShaft.x + dx * targetDistance;
        drivenShaft.y = driverShaft.y + dy * targetDistance;
    
        let mesh = this.createMesh(driverGear, drivenGear);
        this.afterGeometryChange();
        return mesh;      
    
    }
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
    createPulley(name, radius, plane = 0) {
        // [NUEVO] Generar nombre correlativo si viene vacío
        if (!name) {
            this.pulleyCounter++;
            name = "P" + this.pulleyCounter;
        }
        const pulley = new Pulley(name, radius, plane);
        this.pulleys.push(pulley);
        return pulley;
    }

//************************
    mountPulley(pulley, shaft) {
        if (!pulley) {
            return;
        }
        if (!shaft) {
            return;
        }
        shaft.addComponent(pulley);
        return pulley;
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
    restoreBelt(belt) {
        belt.clearGeometry();
        const driver = belt.driver;
        const driven = belt.driven;
        if (!driver || !driven) return false;
        if (!driver.shaft || !driven.shaft) return false;
        const center1 = {x: driver.x, y: driver.y};
        const center2 = {x: driven.x, y: driven.y};
    
        belt.centerDistance = Math.hypot(
            center2.x - center1.x,
            center2.y - center1.y
        );
    
        const tangency = this.computeTangencyPoints(
            center1,
            driver.radius,
            center2,
            driven.radius,
            belt.crossed
        );
    
        if (!tangency) return false;
    
        belt.driverEntry = tangency.driverEntry;
        belt.driverExit = tangency.driverExit;
        belt.drivenEntry = tangency.drivenEntry;
        belt.drivenExit = tangency.drivenExit;
    
        return true;
    } 

//************************      
    computeTangencyPoints(center1, radius1, center2, radius2, crossed = false) {
        const dx = center2.x - center1.x;
        const dy = center2.y - center1.y;
        const d = Math.hypot(dx, dy);
        if (d === 0) return null;
    
        const r = crossed ? radius1 + radius2 : radius1 - radius2;    
        if (Math.abs(r) > d) return null;

        const vx = dx / d;
        const vy = dy / d;
        const a = r / d;
        const h = Math.sqrt(1 - a * a);
        const nx1 = a * vx - h * vy;
        const ny1 = a * vy + h * vx;
        const nx2 = a * vx + h * vy;
        const ny2 = a * vy - h * vx;
    
        return {
            driverEntry: {
                x: center1.x + radius1 * nx1,
                y: center1.y + radius1 * ny1
            },
            drivenEntry: {
                x: center2.x + (crossed ? -radius2 : radius2) * nx1,
                y: center2.y + (crossed ? -radius2 : radius2) * ny1
            },
            driverExit: {
                x: center1.x + radius1 * nx2,
                y: center1.y + radius1 * ny2
            },
            drivenExit: {
                x: center2.x + (crossed ? -radius2 : radius2) * nx2,
                y: center2.y + (crossed ? -radius2 : radius2) * ny2
            }
        };
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
    findRackAt(x, y){
        for(let rack of this.racks){         
            // Calculamos el centro de la barra de la cremallera
            let cx = rack.x + (rack.length / 2);
            let cy = rack.y;
            
            // Comprobamos si el clic cayó dentro de un área generosa alrededor de la barra
            let dx = Math.abs(x - cx);
            let dy = Math.abs(y - cy);
            
            // Mitad de la longitud + un pequeño margen de 10px a los lados
            let halfLength = (rack.length / 2) + 10; 
            // El doble del grosor para que sea fácil hacer clic
            let heightMargin = rack.thickness * 2.5; 

            if(dx <= halfLength && dy <= heightMargin){
                return rack;
            }
        }
        return null;
    }

//************************    
    endPulleyConnection(){
        this.pulleyConnectionMode = false;
        this.connectionSourcePulley = null;
    }

//************************    
    dragRigidly(x, y){
        if(!this.draggedShaft) return;
        
        // Calcular cuánto se desplazó el mouse desde la última posición
        let dx = x - this.draggedShaft.x;
        let dy = y - this.draggedShaft.y;
        
        // Mover el eje principal
        this.draggedShaft.x = x;
        this.draggedShaft.y = y;
        
        // Búsqueda en el grafo para mover los ejes conectados
        let visited = new Set([this.draggedShaft]);
        let queue = [this.draggedShaft];
        
        while(queue.length > 0) {
            let current = queue.shift();
            let links = this.getLinks(); // Obtiene meshes y belts indistintamente
            
            for(let link of links) {
                let other = null;
                if(link.driver.shaft === current) other = link.driven.shaft;
                else if(link.driven.shaft === current) other = link.driver.shaft;
                
                if(other && !visited.has(other)) {
                    // Trasladar el eje conectado la misma distancia
                    other.x += dx;
                    other.y += dy;
                    visited.add(other);
                    queue.push(other);
                }
            }
        }
        
        this.afterGeometryChange();
    }  

//************************    
    findClosestComponentAt(x, y){
        let closest = null;
        let minDist = Infinity;

        for(let gear of this.gears){         
            // Calculamos la distancia desde el mouse hasta el borde del engranaje
            let distToCenter = dist(x, y, gear.x, gear.y);
            let distToEdge = Math.abs(distToCenter - gear.outsideRadius);
            
            if (distToEdge < minDist) {
                minDist = distToEdge;
                closest = gear;
            }
        }

        for(let pulley of this.pulleys){         
            let distToEdge = Math.abs(dist(x, y, pulley.x, pulley.y) - pulley.radius);
            if (distToEdge < minDist) {
                minDist = distToEdge;
                closest = pulley;
            }
        }
        
        return closest;
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
    deleteNodeCompletely(node) {
        // 1. Limpiar restricciones especiales si las tiene
        this.removePendulum(node);
        this.removeCarrier(node);
        this.removeEscapement(node);

        // ---> INICIO LIMPIEZA DE ESFERA FANTASMA <---
 //       if (node === this.minuteHandShaft) this.minuteHandShaft = null;
        if (node === this.hourHandShaft) this.hourHandShaft = null;
        // ---> FIN LIMPIEZA DE ESFERA FANTASMA <---

        // 2. Eliminar todos los componentes montados (y sus mallas)
        while(node.components.length > 0) {
            let comp = node.components[0];
            if (comp instanceof Gear) this.removeGear(comp);
            else if (comp instanceof Pulley) this.removePulley(comp);
            else if (comp instanceof Rack) this.removeRack(comp);
            else if (comp instanceof Annulus) {
                // Eliminar mallas internas
                this.internalMeshes = this.internalMeshes.filter(m => m.driver !== comp && m.driven !== comp);
                node.removeComponent(comp);
                this.annuli = this.annuli.filter(a => a !== comp);
            }
        }

        // 3. Eliminar el eje o guía en sí
        if (node instanceof Shaft) {
            this.shafts = this.shafts.filter(s => s !== node);
        } else if (node instanceof LinearGuide) {
            this.guides = this.guides.filter(g => g !== node);
        }
        
        this.afterGeometryChange();
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
            if (!h.shaft) continue; // No guardar agujas flotantes
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

    //************************
    loadClockFromJSON(jsonStr) {
        let data = JSON.parse(jsonStr);
        
        // LIMPIAR SISTEMA ACTUAL (Menos malo reconstruir que intentar sincronizar)
        while(this.shafts.length > 0) this.deleteNodeCompletely(this.shafts[0]);
        
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
                // Restaurar propiedades visuales guardadas
                h.color = hData.color;
                h.strokeW = hData.strokeW;
                h.length = hData.length;
                h.tailLength = hData.tailLength;
                
                this.hands.push(h); // Añadir al sistema
                this.mountHand(h, shaftMap[hData.shaftId]); // Montar en su eje correspondiente
            }
        }
      
        // Restaurar el tiempo
        this.totalTicks = data.totalTicks || 0;

        this.afterGeometryChange();
    }
//************************
// ---> INICIO ANALIZADOR CINEMÁTICO <---
    //************************
    getKinematicData(targetNode) {
        // 1. Buscar el motor
        let startNode = null;
        let visitedSearch = new Set();
        let queue = [targetNode];
        visitedSearch.add(targetNode);
        
        while(queue.length > 0) {
            let current = queue.shift();
            if (current.isDriver) { startNode = current; break; }
            for (let link of this.getLinks()) {
                let next = null;
                if (link.driver.node === current) next = link.driven.node;
                else if (link.driven.node === current) next = link.driver.node;
                if (next && !visitedSearch.has(next)) { visitedSearch.add(next); queue.push(next); }
            }
        }

        if (!startNode) startNode = targetNode;
        let isTargetMotor = (targetNode === startNode);

        // 2. Trazar ruta simple usando getLinks global
        let result = this.tracePath(startNode, targetNode, 1, new Set());
        
        if (result !== null) {
            // Añadir el destino al final de la lista
            let targetGear = targetNode.components.find(c => c instanceof Gear);
            if (targetGear && !isTargetMotor) {
                result.path.push({ isTarget: true, comp: targetGear });
            }
            // ---> INICIO ARREGLO FALTANTE <---
            return { 
                path: result.path, 
                totalRatio: result.totalRatio, 
                energyPath: result.energyPath, // <--- AÑADIR ESTA LÍNEA
                isMotor: isTargetMotor 
            };
            // ---> FIN ARREGLO FALTANTE <---
        }
        return null; 
    }

//**********************
  
        tracePath(current, target, currentRatio, visited) {
            if (current===target) {
                return { path: [], totalRatio: currentRatio, energyPath: [] }; 
            }
        
            visited.add(current);
        
            // Restricción topológica local
            let validLinks = [];
            if (current.components) {
                for (let comp of current.components) {
                    if (comp instanceof Gear) {
                        for (let link of this.getLinks()) {
                            if (link.driver === comp || link.driven === comp) {
                                validLinks.push(link);
                            }
                        }
                    }
                }
            }
        
            for (let link of validLinks) {
                if (link instanceof GearMesh || link instanceof InternalGearMesh || link instanceof Belt) {
                    let nextNode = null;
                    let nextRatio = 0;
                    let linkRatioVal = Math.abs(link.ratio()); 
        
                    if (link.driver.node === current) {
                        nextNode = link.driven.node;
                        nextRatio = currentRatio * linkRatioVal;
                    } else if (link.driven.node === current) {
                        nextNode = link.driver.node;
                        nextRatio = currentRatio * (linkRatioVal !== 0 ? 1 / linkRatioVal : 9999);
                    }
        
                    if (nextNode && !visited.has(nextNode)) {
                        let subResult = this.tracePath(nextNode, target, nextRatio, visited);
                        if (subResult !== null) {
                            // Inyectamos los engranajes de este enlace en la ruta de energía,
                            // evitando duplicar el engranaje de paso cuando es el mismo objeto
                            // (driven de este enlace === driver del siguiente)
                            let tail = subResult.energyPath;
                            let newEnergyPath = (tail.length > 0 && tail[0] === link.driven)
                                ? [link.driver].concat(tail)
                                : [link.driver, link.driven].concat(tail);
                            return { path: [{ link: link, ratio: linkRatioVal }].concat(subResult.path), totalRatio: subResult.totalRatio, energyPath: newEnergyPath };
                        }
                    }
                }
            }
            return null;
        }
  
  //***********Fin Archivo************
}
