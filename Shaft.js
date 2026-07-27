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
        // ---> INICIO MODELO DE BLOQUEO UNIFICADO <---
        // Antes: dos booleanos independientes (lockedByCarrier, lockedByEscapement),
        // que además Pendulum.js reutilizaba de forma incorrecta (marcaba
        // lockedByCarrier=true para bloquear un eje que no tenía ningún Carrier real).
        // Ahora: un solo dueño explícito. Ventaja real, no solo cosmética: antes un eje
        // podía terminar con AMBOS flags en true a la vez (estado contradictorio,
        // ¿quién es el dueño real?); con lockOwner eso es imposible por construcción.
        // Valores válidos: null | 'carrier' | 'escapement' | 'pendulum'
        this.lockOwner = null;
        // ---> FIN MODELO DE BLOQUEO UNIFICADO <---
        this.isLocked = false; // Por defecto, movimiento libre
    }

    // --- Accesores de compatibilidad: el resto del código (Carrier.js,
    // SwissLeverEscapement.js, CylinderEscapement.js, TopologyManager.js,
    // MechanicalSystem.js) sigue leyendo/escribiendo shaft.lockedByCarrier /
    // shaft.lockedByEscapement exactamente igual que antes, sin cambios ahí.
    // El guard en el setter evita que un dueño desbloquee por error el eje de otro.
    get lockedByCarrier() { return this.lockOwner === 'carrier'; }
    set lockedByCarrier(val) {
        if (val) this.lockOwner = 'carrier';
        else if (this.lockOwner === 'carrier') this.lockOwner = null;
    }

    get lockedByEscapement() { return this.lockOwner === 'escapement'; }
    set lockedByEscapement(val) {
        if (val) this.lockOwner = 'escapement';
        else if (this.lockOwner === 'escapement') this.lockOwner = null;
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
        // Si algún mecanismo (Carrier, Escapement o Péndulo) es dueño de este eje,
        // él controla su ángulo directamente — el Solver no debe tocarlo.
        if (this.lockOwner) return;
        this.angle += this.omega * dt;
    }
}
Shaft.nextId = 1;