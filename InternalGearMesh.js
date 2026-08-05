class InternalGearMesh {
    constructor(driver, driven) {
        this.driver = driver; // Será el planeta
        this.driven = driven; // Será la corona
        this.isValid = true;
    }

    // Propagación para engranajes internos (mismo sentido de giro).
    // ✅ CORREGIDO: antes asumía que el primer argumento SIEMPRE era el driver
    // real. El Solver llama a propagate(node, nextNode) según el orden en que
    // el BFS visita el grafo, no según quién es this.driver/this.driven —
    // igual que ya resolvía GearMesh.propagate(), esto ahora chequea la
    // dirección real antes de calcular.
    propagate(fromNode, toNode) {
        if (fromNode === this.driver.node) {
            toNode.omega = fromNode.omega * (this.driver.teeth / this.driven.teeth);
        } else if (fromNode === this.driven.node) {
            toNode.omega = fromNode.omega * (this.driven.teeth / this.driver.teeth);
        } else {
            console.warn("⚠️ InternalGearMesh.propagate: fromNode no coincide con driver ni driven");
        }
    }
}