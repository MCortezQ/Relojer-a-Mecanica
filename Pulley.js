class Pulley {

    constructor(name, radius, plane = 0) {
        this.name = name;
        this.radius = radius;
        this.plane = plane;
        this.shaft = null;
    }

    getPosition() {

        if (!this.shaft) return null;
        return this.shaft.position;
    }

    get angle() {
        if (this.shaft == null)
            return 0;
        return this.shaft.angle;
    }
    
    get x() {
        if (this.shaft == null) {
            console.error("Pulley sin eje:", this);
            throw new Error("Pulley sin shaft");
        }
        return this.shaft.x;
    }
    
    get y() {
        return this.shaft.y;
    }  
  
    get node() {
        return this.shaft;
    }
}