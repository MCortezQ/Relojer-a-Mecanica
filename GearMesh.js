class GearMesh {

    constructor(driver, driven) {

        this.driver = driver;
        this.driven = driven;
        this.isValid = true;

    }

    ratio() {
        return -this.driver.teeth / this.driven.teeth;
    }

    propagate(driverNode, drivenNode) {
        drivenNode.omega = driverNode.omega * this.ratio();
    }
    

}