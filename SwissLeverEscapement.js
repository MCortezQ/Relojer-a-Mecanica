class SwissLeverEscapement {

  constructor(pendulum, escapeGear, system) {
    // ==========================================
    // VALIDACIÓN EN EL CONSTRUCTOR
    // ==========================================

    // 1. Verificar que el péndulo sea válido
    if (!pendulum || !pendulum.shaft) {
      console.error(
        "❌ ERROR: Péndulo inválido en el constructor de Escapement."
      );
      return null;
    }

    // 2. Verificar que la rueda de escape sea válida
    if (!escapeGear || !escapeGear.shaft) {
      console.error(
        "❌ ERROR: Rueda de escape inválida en el constructor de Escapement."
      );
      return null;
    }

    // 3. Verificar que no estén en el mismo eje (doble seguridad)
    if (pendulum.shaft === escapeGear.shaft) {
      console.error(
        "❌ ERROR: El péndulo y la rueda de escape están en el mismo eje."
      );
      return null;
    }

    // 4. Verificar que el péndulo no tenga otro escape (doble seguridad)
    let existingEscape = system.escapements.find(
      (e) => e.pendulum === pendulum
    );
    if (existingEscape) {
      console.error("❌ ERROR: Este péndulo ya tiene un escape en el sistema.");
      return null;
    }

    // ==========================================
    // ASIGNACIÓN DE PROPIEDADES
    // ==========================================
    this.pendulum = pendulum;
    this.escapeGear = escapeGear;
    this.system = system;
    this.lastTickTime = 0;
    this.type = "swiss";
    this.palletSpread = PI / 8; // Ángulo de las paletas
    this.impulseFactor = 1.0; // Factor de impulso

    // Congelar la rueda de escape
    escapeGear.shaft.lockedByEscapement = true;

    // ==========================================
    // GEOMETRÍA DEL ÁNCORA
    // ==========================================
    let dx = escapeGear.shaft.x - pendulum.shaft.x;
    let dy = escapeGear.shaft.y - pendulum.shaft.y;
    this.distanceToEscape = Math.sqrt(dx * dx + dy * dy);
    this.angleToEscape = Math.atan2(dy, dx);

    // Diseño de las paletas
    this.palletSpread = PI / 8;
    this.palletLength = escapeGear.pitchRadius;

    // ==========================================
    // CONSTRUCCIÓN DEL TREN
    // ==========================================
    this.rebuildConnectedTrain();

          console.log("🔴 applyTickToTrain() llamado desde:", this.constructor.name);
  }


  
  // Ahora busca en todas direcciones (hacia el motor y hacia abajo)
  rebuildConnectedTrain() {
    this.connectedShafts = [];
    let visited = new Set();

    if (this.escapeGear && this.escapeGear.shaft) {
      this._findConnectedNodes(this.escapeGear.shaft, visited);
    }
  }

  // Búsqueda en profundidad (DFS) bidireccional
  _findConnectedNodes(shaft, visited) {
    if (visited.has(shaft)) return;
    visited.add(shaft);
    this.connectedShafts.push(shaft);

    for (let link of this.system.getLinks()) {
      let otherShaft = null;

      // Mirar en AMBAS direcciones del enlace
      if (link.driver.node === shaft) {
        otherShaft = link.driven.node;
      } else if (link.driven.node === shaft) {
        otherShaft = link.driver.node;
      }

      if (otherShaft && !visited.has(otherShaft)) {
        this._findConnectedNodes(otherShaft, visited);
      }
    }
  }

  update(dt) {
    // Si el tiempo fue anómalo, no evaluar cruces
    if (dt > 0.033) return;

    if (this.pendulum.isAtCenter()) {
      let now = millis();
      if (now - this.lastTickTime > 200) {
        this.lastTickTime = now;
        this.doTick();
      }
    }
  }

  // ---> INICIO DETECCIÓN DE VOLUNTAD DEL SISTEMA <---
  // Traza el grafo desde el motor hasta el escape para saber si la cadena física
  // intenta girar el escape en positivo (1) o negativo (-1).
  getSystemDirection() {
    let driver = this.system.shafts.find((s) => s.isDriver);
    // Si no hay motor o está apagado, asumimos que va hacia adelante
    if (!driver || driver.omega === 0) return 0;

    // Si por alguna razón el motor es el propio escape
    if (driver === this.escapeGear.shaft) return Math.sign(driver.omega);

    let currentSign = Math.sign(driver.omega);
    let visited = new Set([driver]);
    let queue = [driver];
    let links = this.system.getLinks();

    // Búsqueda en amplitud (BFS) a través de los enlaces cinemáticos
    while (queue.length > 0) {
      let current = queue.shift();

      // Si llegamos al eje del escape, devolvemos el signo acumulado
      if (current === this.escapeGear.shaft) return currentSign;

      for (let link of links) {
        let neighbor = null;
        if (link.driver.node === current) neighbor = link.driven.node;
        else if (link.driven.node === current) neighbor = link.driver.node;

        if (neighbor && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
          // link.ratio() ya incluye el signo negativo si es un engranaje externo.
          // Esto invierte el signo si la rueda gira al revés.
          currentSign = Math.sign(currentSign * link.ratio());
        }
      }
    }
    return 1; // Si no hay ruta física, por defecto avanza
  }
  // ---> FIN DETECCIÓN DE VOLUNTAD DEL SISTEMA <---

  doTick() {
    for (let shaft of this.system.shafts) shaft.visited = false;

    // 1. Calcular el paso del tick MULTIPLICADO por la dirección del sistema
    let direction = this.getSystemDirection();

    // 2. VÁLVULA DE APAGADO: Si la dirección es 0 (motor apagado), el escape se desconecta
    if (direction === 0) return;

    // 3. Calcular el paso del tick MULTIPLICADO por la dirección del sistema
    // Si la cadena tiene engranajes impares, el tick será negativo (marcha atrás).
    // Si el motor es negativo y la cadena lo corrige, el tick será positivo.
    let linksCache = this.system.getLinks();
    let initialStep = (TWO_PI / this.escapeGear.teeth) * direction;

    // 4. Aplicar el paso (ya sea positivo o negativo)
    this.applyTickToTrain(this.escapeGear.shaft, initialStep, linksCache);

    // ---> INICIO IMPULSO ADAPTATIVO <---
    let currentSpeed = Math.abs(this.pendulum.angularVelocity);
    let targetSpeed = 2.5;
    let energyDeficit = targetSpeed - currentSpeed;

    if (energyDeficit > 0) {
      let direction = Math.sign(this.pendulum.angularVelocity);
      if (direction === 0) direction = 1;
      let gainFactor = 1.8;
      let impulse = energyDeficit * gainFactor;
      this.pendulum.angularVelocity += direction * impulse;
    }
    // ---> FIN IMPULSO ADAPTATIVO <---

    // ---> INICIO CONTADOR DE TIEMPO REAL <---
    this.system.totalTicks++;
    // ---> FIN CONTADOR DE TIEMPO REAL <---

    // ---> INICIO DISPARO DE SONIDO <---
    playTickSound();
    // ---> FIN DISPARO DE SONIDO <---

    console.log("⏱️ TICK!");
  }

  // Ahora recibe el 'angleIncrement' exacto que debe aplicar este eje
  applyTickToTrain(shaft, angleIncrement, links, depth = 0) {
    // ✅ Límite de profundidad para evitar bucles infinitos
    if (depth > 50) {
      console.warn("⚠️ Profundidad máxima alcanzada en applyTickToTrain");
      return;
    }

    // ✅ Si el incremento es casi cero, no hacer nada
    if (Math.abs(angleIncrement) < 1e-12) return;

    if (shaft.visited) return;
    shaft.visited = true;

    // ✅ Normalizar el ángulo para evitar acumulación de errores
    shaft.angle += angleIncrement;
    // Mantener el ángulo en un rango razonable
    if (Math.abs(shaft.angle) > 100) {
      shaft.angle = shaft.angle % TWO_PI;
    }

    for (let i = 0; i < links.length; i++) {
      let link = links[i];
      let otherShaft = null;
      let nextIncrement = 0;

      if (link.driver.node === shaft) {
        otherShaft = link.driven.node;
        nextIncrement = angleIncrement * link.ratio();
      } else if (link.driven.node === shaft) {
        otherShaft = link.driver.node;
        nextIncrement = angleIncrement / link.ratio();
      }

      if (otherShaft && !otherShaft.visited) {
        if (otherShaft.lockedByCarrier) continue;
        this.applyTickToTrain(otherShaft, nextIncrement, links, depth + 1);
      }
    }
  }
}
