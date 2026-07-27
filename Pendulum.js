class Pendulum {
    constructor(shaft, length = 150, amplitude = PI / 6, frequency = 1) {
        this.id = Pendulum.nextId++; 
        this.shaft = shaft;
        this.length = length;
        
        // Física real
        // ✅ Calibrado numéricamente (simulando Pendulum.update + Escapement.doTick tal como
        // corren en producción, incluyendo el impulso adaptativo) para que, con length=150 y
        // amplitude=PI/6, el intervalo entre ticks converja a 1.000s reales en estado estable.
        // El valor anterior (1500) daba ticks cada ~1.036s → ~3.6% de atraso (~26 min/día).
        // Si cambias 'length' o la amplitud inicial de un péndulo, este valor debe recalibrarse.
        this.gravity = 1599.6142;
        this.damping = 0.15;       // Fricción (amortiguación)
        this.angularVelocity = 0;  // Velocidad angular actual (omega)
        
        this.currentAngle = amplitude; // Empezamos inclinado para que eche a andar
        this.lastTickAngle = this.currentAngle;
        this.shaft.angle = this.currentAngle;
        
        // Bloquear el eje para que el Solver no lo toque.
        // (Antes marcaba lockedByCarrier=true, prestado de un mecanismo que no existía aquí;
        // ahora el péndulo es dueño explícito de su propio eje.)
        shaft.lockOwner = 'pendulum';
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


    isAtCenter() {
        // 1. FILTRO DE VELOCIDAD: Ignorar cruces si la velocidad es casi nula
        //    (evita falsos positivos por vibración)
        if (Math.abs(this.angularVelocity) < 0.3) {
            this.lastTickAngle = this.currentAngle;
            return false;
        }
    
        // 2. DETECCIÓN DIRECTA: ¿Cambió de signo entre frames?
        let crossed = (this.lastTickAngle < 0 && this.currentAngle >= 0) || 
                      (this.lastTickAngle > 0 && this.currentAngle <= 0);
    
        // 3. DETECCIÓN POR INTERPOLACIÓN (NUEVO): 
        //    Si el salto fue grande, verificar si la línea recta entre ambos puntos cruza el cero
        if (!crossed && Math.abs(this.currentAngle - this.lastTickAngle) > 0.1) {
            // Calcular el punto de intersección con el eje X (ángulo = 0)
            // Usamos interpolación lineal: t = -y1 / (y2 - y1)
            let t = -this.lastTickAngle / (this.currentAngle - this.lastTickAngle);
            
            // Si t está entre 0 y 1, significa que cruzó en algún punto intermedio
            if (t > 0 && t < 1) {
                crossed = true;
            }
        }
    
        // 4. ACTUALIZAR PARA EL PRÓXIMO FRAME
        this.lastTickAngle = this.currentAngle;
        return crossed;
    }
}
Pendulum.nextId = 1;