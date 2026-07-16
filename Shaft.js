class Shaft {
    constructor(x, y) {
        this.id = Shaft.nextId++;
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.omega = 0;
        this.components = [];
        this.isDriver = false;
        this.selected = false;
        this.visited = false;        
        this.lockedByCarrier = false;
        this.lockedByEscapement = false;
    }

    addComponent(component) {
        component.shaft = this;
        this.components.push(component);
    }

    removeComponent(component) {
        let index = this.components.indexOf(component);
        if (index >= 0) {
            this.components.splice(index, 1);
            component.shaft = null;
        }
    }

    update(dt) {
        // Si un Carrier controla este eje, él se encarga de actualizar su ángulo
        if (this.lockedByCarrier) return; 
        if (this.lockedByEscapement) return; // <--- NUEVO
        this.angle += this.omega * dt;
    }
}
Shaft.nextId = 1;