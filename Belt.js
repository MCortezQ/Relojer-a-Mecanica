class Belt {
    constructor(driver, driven, crossed = false) {
        this.driver = driver;
        this.driven = driven;
        this.crossed = crossed;
        this.centerDistance = null;
        this.tangent1 = null;
        this.tangent2 = null;
        this.tangent3 = null;
        this.tangent4 = null;
        this.isValid = true; // Unificación con GearMesh
    }

    // [NUEVO] Interfaz unificada para que el Solver sea agnóstico
    ratio() {
        return (this.driver.radius / this.driven.radius) * this.getDirection();
    }

    // Mantenemos los métodos originales por si se usan en cálculos geométricos
    getRatio() {
        return this.driver.radius / this.driven.radius;
    }

    getDirection() {
        return this.crossed ? -1 : 1;
    }

    clearGeometry() {
        this.tangent1 = null;
        this.tangent2 = null;
        this.tangent3 = null;
        this.tangent4 = null;
    }  

    propagate(driverNode, drivenNode) {
        drivenNode.omega = driverNode.omega * this.ratio();
        }  
}