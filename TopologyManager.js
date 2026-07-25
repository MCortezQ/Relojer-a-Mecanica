class TopologyManager {
    constructor(system) {
        this.system = system;
    }

    restoreMesh(mesh, fixedShaft) {
        let driverGear = mesh.driver;     
        let drivenGear = mesh.driven;

        // ---> INICIO LÓGICA DE EJES BLOQUEADOS <---
        if (driverGear.shaft.isLocked && drivenGear.shaft.isLocked) return; 
        if (driverGear.shaft.isLocked && !drivenGear.shaft.isLocked) fixedShaft = drivenGear.shaft;
        if (drivenGear.shaft.isLocked && !driverGear.shaft.isLocked) fixedShaft = driverGear.shaft;
        // ---> FIN LÓGICA DE EJES BLOQUEADOS <---
      
        let driverShaft = driverGear.shaft;
        let drivenShaft = drivenGear.shaft;
        let targetDistance = driverGear.radius + drivenGear.radius;
        
        let dx = drivenShaft.x - driverShaft.x;
        let dy = drivenShaft.y - driverShaft.y;
        let d = Math.sqrt(dx*dx + dy*dy);
        
        if(d < 0.0001){ dx = 1; dy = 0; d = 1; }
        
        let dirX = dx / d;
        let dirY = dy / d;
        
        if(fixedShaft === driverShaft){
            drivenShaft.x = driverShaft.x + dirX * targetDistance;
            drivenShaft.y = driverShaft.y + dirY * targetDistance;
        }
        else if(fixedShaft === drivenShaft){
            driverShaft.x = drivenShaft.x - dirX * targetDistance;
            driverShaft.y = drivenShaft.y - dirY * targetDistance;
        }
    }

    restoreBelt(belt) {
        belt.clearGeometry();
        const driver = belt.driver;
        const driven = belt.driven;
        if (!driver || !driven) return false;
        if (!driver.shaft || !driven.shaft) return false;
        const center1 = {x: driver.x, y: driver.y};
        const center2 = {x: driven.x, y: driven.y};
    
        belt.centerDistance = Math.hypot(center2.x - center1.x, center2.y - center1.y);
    
        const tangency = this.computeTangencyPoints(center1, driver.radius, center2, driven.radius, belt.crossed);
        if (!tangency) return false;
    
        belt.driverEntry = tangency.driverEntry;
        belt.driverExit = tangency.driverExit;
        belt.drivenEntry = tangency.drivenEntry;
        belt.drivenExit = tangency.drivenExit;
        return true;
    } 

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
            driverEntry: { x: center1.x + radius1 * nx1, y: center1.y + radius1 * ny1 },
            drivenEntry: { x: center2.x + (crossed ? -radius2 : radius2) * nx1, y: center2.y + (crossed ? -radius2 : radius2) * ny1 },
            driverExit: { x: center1.x + radius1 * nx2, y: center1.y + radius1 * ny2 },
            drivenExit: { x: center2.x + (crossed ? -radius2 : radius2) * nx2, y: center2.y + (crossed ? -radius2 : radius2) * ny2 }
        };
    }

    restoreRackPinion(mesh, fixedNode) {
        let pinion = mesh.pinion;
        let rack = mesh.rack;
        
        if (fixedNode === pinion.node) {
            rack.node.x = pinion.x; 
            rack.node.y = pinion.y + pinion.pitchRadius; 
        } else if (fixedNode === rack.node) {
            pinion.node.x = rack.node.x; 
            pinion.node.y = rack.node.y - pinion.pitchRadius;
        }
    }

    updateGearGeometry(gear){
        gear.updateGeometry();
        for(let mesh of this.system.meshes){
            if(mesh.driver === gear) this.restoreMesh(mesh, gear.shaft);
            else if(mesh.driven === gear) this.restoreMesh(mesh, mesh.driver.shaft);
        }
    }

    afterGeometryChange(){
        // 1. Restaurar correas
        for (let belt of this.system.belts) {
            this.restoreBelt(belt);
        }
        // 2. Validar mallas
        this.validateAllMeshes();
        // 3. Actualizar escapes
        if (this.system.escapements.length > 0) {
            for (let esc of this.system.escapements) {
                esc.rebuildConnectedTrain();
                for (let shaft of esc.connectedShafts) {
                    shaft.lockedByEscapement = true;
                }
            }
        }
    }

    validateMesh(mesh){
        mesh.isValid = true;
        if(mesh.driver.plane !== mesh.driven.plane){ mesh.isValid = false; return false; }
        
        let dx = mesh.driver.x - mesh.driven.x;
        let dy = mesh.driver.y - mesh.driven.y;
        let distance = Math.hypot(dx, dy);
        let minDistance = mesh.driver.rootRadius + mesh.driven.rootRadius;
        if(distance < minDistance){ mesh.isValid = false; return false; }
        return true;
    }

    validateAllMeshes(){
        for(let mesh of this.system.meshes){ this.validateMesh(mesh); }
    }

    connectGears(driverGear, drivenGear) {
        if(driverGear === drivenGear) return null;
        if(driverGear.shaft === drivenGear.shaft) return null;
        
        if(this.meshExists(driverGear, drivenGear)){ console.warn("Ya están conectados."); return null; }
       
        let driverShaft = driverGear.shaft;
        let drivenShaft = drivenGear.shaft;
        let driverConnected = this.isShaftConnected(driverShaft);
        let drivenConnected = this.isShaftConnected(drivenShaft);

        if(driverConnected && drivenConnected){ console.warn("Ambos ejes ya pertenecen a un mecanismo."); return null; }
       
        let needSwap = false;
        if (drivenShaft.isDriver) needSwap = true; 
        else if (!driverShaft.isDriver && !driverConnected && drivenConnected) needSwap = true;

        if (needSwap) {
            let tempGear = driverGear; driverGear = drivenGear; drivenGear = tempGear; driverShaft = driverGear.shaft; drivenShaft = drivenGear.shaft;
        }
      
        let targetDistance = driverGear.pitchRadius + drivenGear.pitchRadius;
        let dx = drivenShaft.x - driverShaft.x;
        let dy = drivenShaft.y - driverShaft.y;
        let d = Math.sqrt(dx*dx + dy*dy);
    
        if(d < 0.0001){ dx = 1; dy = 0; d = 1; }
    
        dx /= d; dy /= d;
    
        drivenShaft.x = driverShaft.x + dx * targetDistance;
        drivenShaft.y = driverShaft.y + dy * targetDistance;
    
        let mesh = this.system.createMesh(driverGear, drivenGear);
        this.system.afterGeometryChange();
        return mesh;      
    }

    disconnectComponent(comp) {
        if (comp instanceof Gear) {
            // Eliminar mallas
            this.system.meshes = this.system.meshes.filter(m => m.driver !== comp && m.driven !== comp);
            this.system.internalMeshes = this.system.internalMeshes.filter(m => m.driver !== comp && m.driven !== comp);
            
            // ✅ CORREGIDO: affectedEscapes (no affectedEscapements)
            let affectedEscapes = this.system.escapements.filter(e => e.escapeGear === comp);
            for (let esc of affectedEscapes) {
                if (esc.connectedShafts) {
                    for (let s of esc.connectedShafts) s.lockedByEscapement = false;
                }
            }
            this.system.escapements = this.system.escapements.filter(e => e.escapeGear !== comp);
        }
        else if (comp instanceof Pulley) {
            this.system.belts = this.system.belts.filter(b => b.driver !== comp && b.driven !== comp);
        } 
        else if (comp instanceof Rack) {
            this.system.rackMeshes = this.system.rackMeshes.filter(m => m.rack !== comp && m.pinion !== comp);
        }
        
        // ✅ Asegurar que se reconstruye el estado
        this.system.afterGeometryChange();
    }

    removeMesh(mesh){    
        let index = this.system.meshes.indexOf(mesh);
        if(index >= 0) this.system.meshes.splice(index,1);
    }

    removeGear(gear){
        this.system.meshes = this.system.meshes.filter(mesh => mesh.driver !== gear && mesh.driven !== gear);
        if(gear.shaft) gear.shaft.removeComponent(gear);
        this.system.gears = this.system.gears.filter(g => g !== gear);
        this.system.afterGeometryChange();
    }

    removePulley(pulley){
        this.system.belts = this.system.belts.filter(belt => belt.driver !== pulley && belt.driven !== pulley);
        if(pulley.shaft) pulley.shaft.removeComponent(pulley);
        this.system.pulleys = this.system.pulleys.filter(p => p !== pulley);
        this.system.afterGeometryChange();
    }

    removeRack(rack) {
        this.system.rackMeshes = this.system.rackMeshes.filter(m => m.rack !== rack && m.pinion !== rack);
        if(rack.guide) rack.guide.removeComponent(rack);
        this.system.racks = this.system.racks.filter(r => r !== rack);
        this.system.afterGeometryChange();
    }

    removeShaft(shaft) {
        // Eliminar componentes del eje
        while(shaft.components.length > 0) {
            let comp = shaft.components[0];
            if (comp instanceof Gear) this.removeGear(comp);
            else if (comp instanceof Pulley) this.removePulley(comp);
            else if (comp instanceof Rack) this.removeRack(comp);
        }
        
        // Eliminar péndulos
        for (let i = this.system.pendulums.length - 1; i >= 0; i--) {
            if (this.system.pendulums[i].shaft === shaft) {
                // Limpiar escapes
                for (let j = this.system.escapements.length - 1; j >= 0; j--) {
                    if (this.system.escapements[j].pendulum.shaft === shaft) {
                        this.system.escapements.splice(j, 1);
                    }
                }
                // Desbloquear ejes
                for (let s of this.system.shafts) s.lockedByEscapement = false;
                this.system.pendulums.splice(i, 1);
            }
        }
        
        // Eliminar el eje
        let index = this.system.shafts.indexOf(shaft);
        if (index >= 0) this.system.shafts.splice(index, 1);
        
        this.system.afterGeometryChange();  // ✅ RECONSTRUYE TODO
    }

    isShaftConnected(shaft){    
        for(let mesh of this.system.meshes){
            if(mesh.driver.shaft === shaft || mesh.driven.shaft === shaft) return true;
        }
        return false;
    }

    meshExists(gearA, gearB){
        for(let mesh of this.system.meshes){
            if(mesh.driver === gearA && mesh.driven === gearB) return true;
            if(mesh.driver === gearB && mesh.driven === gearA) return true;
        }
        return false;
    }

    isGearMeshed(gear){
        for(let mesh of this.system.meshes){
            if(mesh.driver === gear || mesh.driven === gear) return true;
        }
        return false;
    }

    deleteNodeCompletely(node) {
        // Eliminar péndulo si existe
        if (node instanceof Shaft) {
            for (let i = this.system.pendulums.length - 1; i >= 0; i--) {
                if (this.system.pendulums[i].shaft === node) {
                    // Eliminar escapes asociados
                    for (let j = this.system.escapements.length - 1; j >= 0; j--) {
                        if (this.system.escapements[j].pendulum.shaft === node) {
                            this.system.escapements.splice(j, 1);
                        }
                    }
                    this.system.pendulums.splice(i, 1);
                    break;
                }
            }
        }
    
        // Eliminar carrier si existe
        if (node instanceof Shaft) {
            for (let i = this.system.carriers.length - 1; i >= 0; i--) {
                if (this.system.carriers[i].attachedShafts.includes(node)) {
                    this.system.carriers.splice(i, 1);
                    break;
                }
            }
        }
    
        // Eliminar escape si el nodo es la rueda de escape
        if (node instanceof Shaft) {
            for (let i = this.system.escapements.length - 1; i >= 0; i--) {
                if (this.system.escapements[i].escapeGear.shaft === node) {
                    // Desbloquear ejes
                    for (let s of this.system.escapements[i].connectedShafts || []) {
                        s.lockedByEscapement = false;
                    }
                    this.system.escapements.splice(i, 1);
                    break;
                }
            }
        }
    
        // Eliminar componentes del nodo
        while(node.components && node.components.length > 0) {
            let comp = node.components[0];
            if (comp instanceof Gear) this.removeGear(comp);
            else if (comp instanceof Pulley) this.removePulley(comp);
            else if (comp instanceof Rack) this.removeRack(comp);
            else if (comp instanceof Annulus) {
                this.system.internalMeshes = this.system.internalMeshes.filter(m => m.driver !== comp && m.driven !== comp);
                node.removeComponent(comp);
                this.system.annuli = this.system.annuli.filter(a => a !== comp);
            }
        }
    
        // Eliminar el nodo de la lista correspondiente
        if (node instanceof Shaft) {
            this.system.shafts = this.system.shafts.filter(s => s !== node);
        } else if (node instanceof LinearGuide) {
            this.system.guides = this.system.guides.filter(g => g !== node);
        }
        
        this.system.afterGeometryChange();
    }
}