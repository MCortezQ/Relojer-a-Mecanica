class Solver {

    constructor(system) {
        this.system = system;
    }

    solve(dt) {
        let nodes = this.system.getNodes();
    
        for (let node of nodes) {
            node.visited = false;
        }
    
        for (let node of nodes) {
            if (!node.isDriver) continue;
            this.propagateFrom(node);
        }
    
        // Apagar nodos huérfanos
        for (let node of nodes) {
            if (!node.visited) {
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
          if(link.isValid === false) continue;
    
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
                
                // ---> INICIO DEL MURO DEL ESCAPE <---
                // Si el siguiente nodo está bloqueado por un escape, 
                // el Solver calcula su velocidad (para info en panel) 
                // pero corta la propagación. La energía no pasa.
                if (nextNode.lockedByEscapement) {
                    if (isNormalDirection) {
                        link.propagate(node, nextNode);
                    } else {
                        link.propagate(nextNode, node);
                    }
                    nextNode.visited = true; // Evita que el Sistema lo apague (omega=0)
                    continue; // ¡FRENAR LA CADENA AQUÍ!
                }
                // ---> FIN DEL MURO DEL ESCAPE <---

                if (isNormalDirection) {
                    link.propagate(node, nextNode);
                } else {
                    link.propagate(nextNode, node);
                }
                this.propagateFrom(nextNode);
            }
        }
    }
  
}