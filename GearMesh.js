class GearMesh {
    constructor(driver, driven) {
        this.driver = driver;
        this.driven = driven;
        this.isValid = true;
    }

    ratio() {
        return -this.driver.teeth / this.driven.teeth;
    }

    propagate(fromNode, toNode) {
        // Determinar dirección de propagación
        if (fromNode === this.driver.node) {
            // Normal: driver → driven
            toNode.omega = fromNode.omega * this.ratio();
        } else if (fromNode === this.driven.node) {
            // Inversa: driven → driver
            toNode.omega = fromNode.omega / this.ratio();
        } else {
            console.warn("⚠️ GearMesh.propagate: fromNode no coincide con driver ni driven");
        }
    }
}