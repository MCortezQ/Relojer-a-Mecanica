class InteractionManager {
    constructor(system) {
        this.system = system;
    }

    selectShaft(shaft){
        if (this.system.selectedShaft === shaft) return;
        if (this.system.selectedShaft) this.system.selectedShaft.selected = false;
        this.system.selectedShaft = shaft;
        if (shaft) shaft.selected = true;    
    }

    findShaftAt(x, y) {
        // Buscar en el quadtree
        let results = this.system.spatialIndex.queryCircle(x, y, 20);
        let minDist = Infinity;
        let closest = null;
        
        for (let item of results) {
            if (item.type === 'shaft') {
                let dist = Math.hypot(x - item.data.x, y - item.data.y);
                if (dist < minDist) {
                    minDist = dist;
                    closest = item.data;
                }
            }
        }
        
        return closest;
    }

    // ---> INICIO BÚSQUEDA COAXIAL <---
    findShaftsAt(x, y, radius = 12) {
        let results = this.system.spatialIndex.queryCircle(x, y, radius);
        let shafts = [];
        
        for (let item of results) {
            if (item.type === 'shaft') {
                shafts.push(item.data);
            }
        }
        
        return shafts;
    }
    // ---> FIN BÚSQUEDA COAXIAL <---

    findGuideAt(x, y){
        const PICK_RADIUS = 15; 
        for(let guide of this.system.guides){
            if(dist(x, y, guide.x, guide.y) <= PICK_RADIUS) return guide;
        }
        return null;
    } 

    beginDrag(shaft){ this.system.draggedShaft = shaft; }
    endDrag(){ this.system.draggedShaft = null; }

    dragTo(x, y){
        if(!this.system.draggedShaft) return;
        this.system.draggedShaft.x = x;
        this.system.draggedShaft.y = y;
        this.system.afterGeometryChange();
    }
  
    dragRigidly(x, y){
        if(!this.system.draggedShaft) return;
        
        let dx = x - this.system.draggedShaft.x;
        let dy = y - this.system.draggedShaft.y;
        
        this.system.draggedShaft.x = x;
        this.system.draggedShaft.y = y;
        
        let visited = new Set([this.system.draggedShaft]);
        let queue = [this.system.draggedShaft];
        
        while(queue.length > 0) {
            let current = queue.shift();
            let links = this.system.getLinks(); 
            
            for(let link of links) {
                let other = null;
                if(link.driver.node === current) other = link.driven.node;
                else if(link.driven.node === current) other = link.driver.node;
                
                if(other && !visited.has(other)) {
                    other.x += dx;
                    other.y += dy;
                    visited.add(other);
                    queue.push(other);
                }
            }
        }
        this.system.afterGeometryChange();
    }

    findClosestComponentAt(x, y) {
        // 1. Buscar en el quadtree con radio de búsqueda inicial
        let searchRadius = 100;
        let results = [];
        let maxAttempts = 5;
        
        while (results.length === 0 && searchRadius < 1000 && maxAttempts > 0) {
            results = this.system.spatialIndex.queryCircle(x, y, searchRadius);
            searchRadius *= 2;
            maxAttempts--;
        }
        
        // 2. Filtrar solo componentes (gear, pulley) y calcular distancia exacta
        let closest = null;
        let minDist = Infinity;
        
        for (let item of results) {
            if (item.type === 'gear') {
                let gear = item.data;
                let distToCenter = Math.hypot(x - gear.x, y - gear.y);
                let distToEdge = Math.abs(distToCenter - gear.outsideRadius);
                if (distToEdge < minDist) {
                    minDist = distToEdge;
                    closest = gear;
                }
            } else if (item.type === 'pulley') {
                let pulley = item.data;
                let distToEdge = Math.abs(Math.hypot(x - pulley.x, y - pulley.y) - pulley.radius);
                if (distToEdge < minDist) {
                    minDist = distToEdge;
                    closest = pulley;
                }
            }
        }
        
        return closest;
    }

  
    findGearAt(x, y){
        for(let gear of this.system.gears){         
            if(dist(x, y, gear.x, gear.y) <= gear.outsideRadius) return gear;
        }
        return null;
    }

    findPulleyAt(x, y){
        for(let pulley of this.system.puleys){         
            if(dist(x, y, pulley.x, pulley.y) <= pulley.radius) return pulley;
        }
        return null;
    }

    findRackAt(x, y){
        for(let rack of this.system.racks){         
            let cx = rack.x + (rack.length / 2);
            let cy = rack.y;
            let dx = Math.abs(x - cx);
            let dy = Math.abs(y - cy);
            let halfLength = (rack.length / 2) + 10; 
            let heightMargin = rack.thickness * 2.5; 
            if(dx <= halfLength && dy <= heightMargin) return rack;
        }
        return null;
    }

    // ---> INICIO ANALIZADOR CINEMÁTICO <---
getKinematicData(targetNode) {
    let startNode = null;
    let visitedSearch = new Set();
    let queue = [targetNode];
    visitedSearch.add(targetNode);
    
    while(queue.length > 0) {
        let current = queue.shift();
        if (current.isDriver) { 
            startNode = current; 
            break; 
        }
        for (let link of this.system.getLinks()) {
            let next = null;
            if (link.driver.node === current) {
                next = link.driven.node;
            } else if (link.driven.node === current) {
                next = link.driver.node;
            }
            if (next && !visitedSearch.has(next)) {
                visitedSearch.add(next);
                queue.push(next);
            }
        }
    }

    if (!startNode) startNode = targetNode;
    let isTargetMotor = (targetNode === startNode);

    let result = this.tracePath(startNode, targetNode, 1, new Set());
    
    if (result !== null) {
        // ==========================================
        // ✅ RECONSTRUIR energyPath CORRECTAMENTE
        // ==========================================
        let energyPath = [];
        let current = startNode;
        
        // Añadir el primer engranaje (el del motor)
        let firstGear = startNode.components.find(c => c instanceof Gear);
        if (firstGear) {
            energyPath.push(firstGear);
        }
        
        // Recorrer los enlaces
        for (let linkData of result.path) {
            let link = linkData.link;
            let nextNode = null;
            
            // Determinar el siguiente nodo en la dirección de la ruta
            if (link.driver.node === current) {
                nextNode = link.driven.node;
            } else if (link.driven.node === current) {
                nextNode = link.driver.node;
            }
            
            if (nextNode) {
                // ✅ Buscar el engranaje en nextNode que está CONECTADO a través de este enlace
                // Este es el engranaje que RECIBE en el siguiente eje
                let nextGear = null;
                if (link.driver.node === current) {
                    // El driver está en el nodo actual, el driven está en el siguiente
                    // El engranaje que RECIBE es el driven
                    if (link.driven.node === nextNode) {
                        nextGear = link.driven;
                    }
                } else if (link.driven.node === current) {
                    // El driven está en el nodo actual, el driver está en el siguiente
                    // El engranaje que RECIBE es el driver
                    if (link.driver.node === nextNode) {
                        nextGear = link.driver;
                    }
                }
                
                if (nextGear) {
                    // ✅ Añadir el engranaje receptor al path
                    energyPath.push(nextGear);
                    
                    // ✅ Si el siguiente nodo tiene OTRO engranaje que CONDUCE (solidario),
                    // lo añadimos también (para cubrir ejes con engranajes dobles)
                    let nextNodeOtherGear = null;
                    if (nextNode.components) {
                        for (let comp of nextNode.components) {
                            if (comp instanceof Gear && comp !== nextGear) {
                                // Verificar si este engranaje está conectado a OTRO enlace
                                let hasNextLink = false;
                                for (let nextLink of this.system.getLinks()) {
                                    if ((nextLink.driver === comp || nextLink.driven === comp) &&
                                        nextLink !== link) {
                                        hasNextLink = true;
                                        break;
                                    }
                                }
                                if (hasNextLink) {
                                    nextNodeOtherGear = comp;
                                    break;
                                }
                            }
                        }
                    }
                    if (nextNodeOtherGear) {
                        energyPath.push(nextNodeOtherGear);
                    }
                }
                
                current = nextNode;
            }
        }
        
        // ✅ Añadir el último engranaje (target) si no está ya
        let targetGear = targetNode.components.find(c => c instanceof Gear);
        if (targetGear && !isTargetMotor) {
            let alreadyInPath = energyPath.some(g => g === targetGear);
            if (!alreadyInPath) {
                energyPath.push(targetGear);
            }
        }
        
        // ✅ Si energyPath está vacío, usar el resultado anterior
        if (energyPath.length === 0) {
            energyPath = result.energyPath || [];
        }
        
        return { 
            path: result.path, 
            totalRatio: result.totalRatio, 
            energyPath: energyPath, 
            isMotor: isTargetMotor 
        };
    }
    return null;
}

tracePath(current, target, currentRatio, visited) {
    if (current === target) {
        return { path: [], totalRatio: currentRatio };
    }
    
    visited.add(current);
    
    let validLinks = [];
    if (current.components) {
        for (let comp of current.components) {
            if (comp instanceof Gear) {
                for (let link of this.system.getLinks()) {
                    if (link.driver === comp || link.driven === comp) {
                        if (!validLinks.includes(link)) {
                            validLinks.push(link);
                        }
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
                    return {
                        path: [{ link: link, ratio: linkRatioVal }].concat(subResult.path),
                        totalRatio: subResult.totalRatio
                    };
                }
            }
        }
    }
    return null;
}
  
    // ---> FIN ANALIZADOR CINEMÁTICO <---

    // ---> INICIO HISTORIAL (CTRL+Z) <---
    pushHistory() {
        this.system.history.push(this.system.saveClockToJSON());
        if (this.system.history.length > this.system.maxHistory) this.system.history.shift();
    }

    undo() {
        if (this.system.history.length === 0) { console.log("No hay más acciones para deshacer."); return false; }
        let previousState = this.system.history.pop();
        this.system.loadClockFromJSON(previousState);
        return true; 
    }
    // ---> FIN HISTORIAL <---
}