class Pendulum {
    constructor(shaft, length = 150, amplitude = PI / 6, frequency = 1) {
        this.id = Pendulum.nextId++; 
        this.shaft = shaft;
        this.length = length;
        
        // Física real
        this.gravity = 1500;       // Constante de gravedad ajustada para píxeles
        this.damping = 0.15;       // Fricción (amortiguación)
        this.angularVelocity = 0;  // Velocidad angular actual (omega)
        
        this.currentAngle = amplitude; // Empezamos inclinado para que eche a andar
        this.lastTickAngle = this.currentAngle;
        this.shaft.angle = this.currentAngle;
        
        // Bloquear el eje para que el Solver no lo toque
        shaft.lockedByCarrier = true; 
    }

    update(dt) {
        // ---> INICIO ESCUDO DE TIEMPO CONGELADO <---
        // Si el frame dura más de 33ms (menos de 30fps), lo ignoramos.
        // Esto evita la "explosión de Euler" cuando el navegador intenta compensar el tiempo.
        if (dt > 0.033) return; 
        // ---> FIN ESCUDO DE TIEMPO CONGELADO <---

        // 1. Aceleración por gravedad
        let acceleration = - (this.gravity / this.length) * Math.sin(this.currentAngle);
        
        // 2. Fricción
        acceleration -= this.damping * this.angularVelocity;
        
        // 3. Integración de Euler
        this.angularVelocity += acceleration * dt;
        
        // Limitador de velocidad duro (por si las moscas)
        this.angularVelocity = constrain(this.angularVelocity, -15, 15);
        
        this.currentAngle += this.angularVelocity * dt;
        
        // 4. Escribir resultados
        this.shaft.angle = this.currentAngle;
        this.shaft.omega = this.angularVelocity;
    }

    // Devuelve true en el instante exacto en que cruza el centro
    // Devuelve true en el instante exacto en que cruza el centro
    isAtCenter() {
        // Ignorar cruces si la velocidad es casi nula (evita falsos positivos)
        if (Math.abs(this.angularVelocity) < 0.3) {
            this.lastTickAngle = this.currentAngle;
            return false;
        }

        let crossed = (this.lastTickAngle < 0 && this.currentAngle >= 0) || 
                      (this.lastTickAngle > 0 && this.currentAngle <= 0);
        this.lastTickAngle = this.currentAngle;
        return crossed;
    }
}
Pendulum.nextId = 1;