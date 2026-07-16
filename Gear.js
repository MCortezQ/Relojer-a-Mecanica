class Gear {
    constructor(shaft, teeth, module, name = "",plane=0) {    
        this.id = Gear.nextId++;
        this.shaft = shaft; 
        this.teeth = teeth;
        this.module = module;
        this.name = name;
        this.plane=plane;
        this.pressureAngle = radians(20);
        this.updateGeometry();
    }

    get angle() {
        if (this.shaft == null)
            return 0;
        return this.shaft.angle;
    }

    get x() {
        if (this.shaft == null) {
            console.error("Gear sin eje:",this);
            throw new Error("Gear sin shaft");
        }
        return this.shaft.x;
    }

  
    get y() {
        return this.shaft.y;
    }

    get node() {
        return this.shaft;
    }
  
    updateGeometry() {
         //--------------------------------------------------
        // Geometría básica
        //--------------------------------------------------
        this.pitchDiameter = this.module * this.teeth;
        this.pitchRadius = this.pitchDiameter / 2;
    
        // Perfil estándar (ISO)
        this.addendum = this.module;
        this.dedendum = 1.25 * this.module;
    
        // Radios principales
        this.outsideRadius =
            this.pitchRadius + this.addendum;
    
        this.rootRadius =
            this.pitchRadius - this.dedendum;
    
        this.baseRadius =
            this.pitchRadius *
            Math.cos(this.pressureAngle);
    
        // Compatibilidad con código existente
        this.radius = this.pitchRadius;  
    }
}
Gear.nextId = 1;