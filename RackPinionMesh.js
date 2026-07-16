class RackPinionMesh {
    constructor(pinion, rack) {
        this.pinion = pinion; // Es un Gear
        this.rack = rack;     // Es un Rack
        this.driver = pinion; // Por defecto
        this.driven = rack;
        this.isValid = true;
    }

    propagate(driverNode, drivenNode) {
        let radius = this.pinion.pitchRadius;
        
        if (driverNode === this.pinion.node) {
            // Fórmula vectorial estricta para coordenadas de pantalla (Y hacia abajo):
            // Si la cremallera está debajo (y positivo), vx = -omega * radius
            drivenNode.linearVelocity = -driverNode.omega * radius;
        } 
        else if (driverNode === this.rack.node) {
            // Lineal a Rotación (inverso)
            drivenNode.omega = -driverNode.linearVelocity / radius;
        }
    }
}