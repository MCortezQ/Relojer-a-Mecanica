class Annulus {
    constructor(shaft, teeth, module, name = "") {
        this.shaft = shaft;
        this.teeth = teeth;
        this.module = module;
        this.name = name;
        this.updateGeometry();
    }

    get node() {
        return this.shaft;
    }

    get x() {
        return this.shaft.x;
    }

    get y() {
        return this.shaft.y;
    }

    updateGeometry() {
        this.pitchDiameter = this.module * this.teeth;
        this.pitchRadius = this.pitchDiameter / 2;
        
        // En una corona, la raíz está en el exterior y la punta en el interior
        this.rootRadius = this.pitchRadius + this.module * 1.25; 
        this.addendumRadius = this.pitchRadius - this.module; // Donde acaban los dientes
        this.outsideRadius = this.rootRadius + this.module * 2; // Borde exterior sólido
        this.radius = this.pitchRadius;
    }
}