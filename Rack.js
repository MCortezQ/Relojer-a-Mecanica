class Rack {
    constructor(guide, teeth, module, name = "", plane = 0) {    
        this.guide = guide; 
        this.teeth = teeth;
        this.module = module;
        this.name = name;
        this.plane = plane;
        this.updateGeometry();
    }

    get node() {
        return this.guide;
    }

    get x() {
        if (this.guide == null) throw new Error("Rack sin guía");
        // Se mueve dinámicamente según el offset de la guía
        return this.guide.x + this.guide.offset * Math.cos(this.guide.angle);
    }

    get y() {
        if (this.guide == null) throw new Error("Rack sin guía");
        return this.guide.y + this.guide.offset * Math.sin(this.guide.angle);
    }
  
    updateGeometry() {
        this.pitch = Math.PI * this.module;
        this.length = this.pitch * this.teeth;
        this.addendum = this.module;
        this.dedendum = 1.25 * this.module;
        this.thickness = this.dedendum * 2;
    }
}