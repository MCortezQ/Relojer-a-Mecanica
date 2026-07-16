class InternalGearMesh {
    constructor(driver, driven) {
        this.driver = driver; // Será el planeta
        this.driven = driven; // Será la corona
        this.isValid = true;
    }

    // Propagación para engranajes internos (mismo sentido de giro)
    propagate(driverNode, drivenNode) {
        drivenNode.omega = driverNode.omega * (this.driver.teeth / this.driven.teeth);
    }
}