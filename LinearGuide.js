class LinearGuide {
    constructor(x, y, angle = 0) {
        this.x = x;
        this.y = y;
        this.angle = angle; // Orientación del riel (0 = horizontal)
        this.offset = 0;    // Desplazamiento lineal actual
        this.linearVelocity = 0;
        this.components = [];
        this.isDriver = false;
        this.visited = false;
        this.selected = false;
    }

    addComponent(component) {
        component.guide = this;
        this.components.push(component);
    }

    removeComponent(component) {
        let index = this.components.indexOf(component);
        if (index >= 0) {
            this.components.splice(index, 1);
            component.guide = null;
        }
    }

    update(dt) {
        this.offset += this.linearVelocity * dt;
    }
}