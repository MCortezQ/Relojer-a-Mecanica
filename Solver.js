class Solver {

    constructor(system) {
        this.system = system;
    }

    solve(dt) {
        let nodes = this.system.getNodes();
        
        for (let node of nodes) {
            node.visited = false;
        }
      
        // ✅ Propagar desde TODOS los motores
        for (let node of nodes) {
            if (node.isDriver) {
             
                // Asegurar que tenga velocidad
                if (node.omega === 0) node.omega = 2;
                this.propagateFrom(node);
            }
        }
        
        for (let node of nodes) {
            if (!node.visited && !node.isDriver) {
                if (node.omega !== undefined) node.omega = 0;
                if (node.linearVelocity !== undefined) node.linearVelocity = 0;
            }
        }
        
        for (let node of nodes) {
            node.update(dt);
        }
    }

  
    propagateFrom(node) {
      
        if (node.visited) return;
        node.visited = true;
        
        for (let link of this.system.getLinks()) {
            if (link.isValid === false) continue;
    
            let nextNode = null;
            let isNormalDirection = false;
    
            if (link.driver.node === node) {
                nextNode = link.driven.node;
                isNormalDirection = true;
            } 
            else if (link.driven.node === node) {
                nextNode = link.driver.node;
                isNormalDirection = false;
            }
    
            if (nextNode && !nextNode.visited) {
                // ✅ Siempre pasar (fromNode, toNode)
                link.propagate(node, nextNode);
                this.propagateFrom(nextNode);
            }
        }
    } 
}